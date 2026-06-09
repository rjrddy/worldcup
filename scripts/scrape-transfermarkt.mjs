#!/usr/bin/env node
/**
 * Scrapes Transfermarkt market values for players seen in data/squads.json
 * and writes data/market-values.json.
 *
 * Important caveats:
 *  - Transfermarkt's "market value" is an ESTIMATED TRANSFER FEE, not annual salary.
 *  - Transfermarkt uses Cloudflare protection. A naive fetch will fail for some pages.
 *  - Their ToS prohibits scraping. Use this at your own risk.
 *  - The script paces 1 request every 3s to look human; a full 1,200-player run takes ~1h.
 *
 * It does NOT try to scrape every player. By default it only scrapes players whose
 * `player.id` is listed in --ids or in `data/scrape-targets.json`.
 *
 * Usage:
 *   node scripts/scrape-transfermarkt.mjs            # scrapes data/scrape-targets.json
 *   node scripts/scrape-transfermarkt.mjs --all      # scrapes every player in data/squads.json (slow)
 *   node scripts/scrape-transfermarkt.mjs --ids 158023,28003,...
 *
 * Each scrape target needs at least { id, name } and optionally { tmId, tmSlug }.
 * If tmId is unknown, the script searches by name (less reliable).
 */
import { promises as fs } from 'fs'
import path from 'path'

const DATA_DIR = path.resolve(process.cwd(), 'data')
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15'
const DELAY_MS = Number(process.env.SCRAPE_DELAY_MS ?? '3000')

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function safeFetch(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': UA,
      Accept: 'text/html,application/xhtml+xml',
      'Accept-Language': 'en-US,en;q=0.9',
      Referer: 'https://www.transfermarkt.com/',
    },
  })
  if (res.status === 403 || res.status === 429) {
    throw new Error(`Blocked (${res.status}). Cloudflare likely caught us — give it 10+ minutes.`)
  }
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
  return res.text()
}

/**
 * Crude HTML scrape: pulls the player's primary market value from their profile page.
 * Selector targets the data-row that contains "Current market value" + the headline value.
 */
function extractMarketValue(html) {
  // Match the headline value, e.g. "€180.00m" near the top of the player profile
  const m = html.match(/<a class="data-header__market-value-wrapper"[^>]*>[\s\S]*?<span[^>]*>([^<]+)<\/span>/i)
  if (!m) {
    const alt = html.match(/data-header__market-value-wrapper[^>]*>([^<]*€[^<]+)</i)
    if (alt) return parseValue(alt[1])
    return null
  }
  return parseValue(m[1])
}

function parseValue(raw) {
  const cleaned = raw.replace(/\s+/g, '').trim()
  const num = cleaned.match(/([\d.,]+)\s*(m|k|bn)?/i)
  if (!num) return null
  const value = parseFloat(num[1].replace(/,/g, '.'))
  const mult = (num[2] ?? '').toLowerCase()
  const annual =
    mult === 'm' ? value * 1_000_000 :
    mult === 'k' ? value * 1_000 :
    mult === 'bn' ? value * 1_000_000_000 :
    value
  return { annual: Math.round(annual), currency: 'EUR', source: 'Transfermarkt', isMarketValue: true }
}

async function scrapePlayerByUrl(slug, tmId) {
  // Standard TM player URL: /{slug}/profil/spieler/{tmId}
  const url = `https://www.transfermarkt.com/${slug ?? '-'}/profil/spieler/${tmId}`
  const html = await safeFetch(url)
  return extractMarketValue(html)
}

async function searchPlayer(name) {
  const url = `https://www.transfermarkt.com/schnellsuche/ergebnis/schnellsuche?query=${encodeURIComponent(name)}`
  const html = await safeFetch(url)
  // First search result anchor → /{slug}/profil/spieler/{id}
  const m = html.match(/href="\/([^"]+)\/profil\/spieler\/(\d+)"/i)
  if (!m) return null
  return { slug: m[1], tmId: m[2] }
}

async function loadTargets(args) {
  const idsFlag = args.find((a) => a.startsWith('--ids='))
  const all = args.includes('--all')

  if (idsFlag) {
    const ids = idsFlag.split('=')[1].split(',').map((s) => s.trim())
    return ids.map((id) => ({ id, name: id }))
  }

  if (all) {
    const squadsRaw = await fs.readFile(path.join(DATA_DIR, 'squads.json'), 'utf8')
    const squads = JSON.parse(squadsRaw)
    const out = []
    for (const teamPlayers of Object.values(squads)) {
      for (const p of teamPlayers) {
        out.push({
          id: `af-${p.player?.id}`,
          name: p.player?.name,
        })
      }
    }
    return out
  }

  try {
    const raw = await fs.readFile(path.join(DATA_DIR, 'scrape-targets.json'), 'utf8')
    return JSON.parse(raw)
  } catch {
    console.error(
      'No scrape targets. Pass --ids=ID1,ID2 or --all, or create data/scrape-targets.json:\n' +
      '  [{ "id": "af-158023", "name": "Lionel Messi", "tmSlug": "lionel-messi", "tmId": 28003 }]'
    )
    process.exit(1)
  }
}

async function loadExisting() {
  try {
    const raw = await fs.readFile(path.join(DATA_DIR, 'market-values.json'), 'utf8')
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

async function main() {
  const args = process.argv.slice(2)
  const targets = await loadTargets(args)
  const out = await loadExisting()
  console.log(`Scraping ${targets.length} player(s) with ${DELAY_MS}ms delay…`)

  let i = 0
  let blocked = false
  for (const t of targets) {
    i++
    if (out[t.id] && !args.includes('--force')) {
      console.log(`[${i}/${targets.length}] ${t.name} — cached, skip`)
      continue
    }
    if (blocked) break

    try {
      let slug = t.tmSlug
      let tmId = t.tmId
      if (!tmId) {
        const found = await searchPlayer(t.name)
        if (!found) {
          console.log(`[${i}/${targets.length}] ${t.name} — not found in TM search`)
          await sleep(DELAY_MS)
          continue
        }
        slug = found.slug
        tmId = found.tmId
        await sleep(DELAY_MS)
      }

      const value = await scrapePlayerByUrl(slug, tmId)
      if (value) {
        out[t.id] = value
        console.log(
          `[${i}/${targets.length}] ${t.name} — €${(value.annual / 1_000_000).toFixed(1)}M (market value)`
        )
      } else {
        console.log(`[${i}/${targets.length}] ${t.name} — couldn't parse value`)
      }
    } catch (err) {
      console.log(`[${i}/${targets.length}] ${t.name} — ✗ ${err.message}`)
      if (String(err.message).includes('Blocked')) {
        blocked = true
        break
      }
    }

    // Persist after every scrape so partial runs are recoverable
    await fs.writeFile(
      path.join(DATA_DIR, 'market-values.json'),
      JSON.stringify(out, null, 2)
    )
    await sleep(DELAY_MS)
  }

  console.log(`✓ Done. ${Object.keys(out).length} values cached in data/market-values.json`)
  if (blocked) {
    console.log('⚠ Run was blocked by Cloudflare. Wait and rerun — already-cached values are kept.')
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
