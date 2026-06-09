#!/usr/bin/env node
/**
 * Fetches World Cup 2026 squads + fixtures + lineups from api-football
 * and writes JSON caches into ./data/.
 *
 * Stays within the free tier (~100 req/day):
 *   - 1 call:  /fixtures?league=1&season=2026
 *   - ~48 calls: /players?team={id}&season=2025 (per team)
 *   - Lineups only for matches whose status is FT or LIVE (capped)
 *
 * Usage:
 *   API_FOOTBALL_KEY=xxxxx node scripts/fetch-from-api-football.mjs
 */
import { promises as fs } from 'fs'
import path from 'path'

const API_KEY = process.env.API_FOOTBALL_KEY
const LEAGUE_ID = Number(process.env.API_FOOTBALL_WC_LEAGUE_ID ?? '1')
const SEASON = Number(process.env.API_FOOTBALL_WC_SEASON ?? '2026')
const CLUB_SEASON = Number(process.env.API_FOOTBALL_CLUB_SEASON ?? '2025')
const BASE = 'https://v3.football.api-sports.io'
const DATA_DIR = path.resolve(process.cwd(), 'data')
const MAX_LINEUP_FETCHES = Number(process.env.MAX_LINEUP_FETCHES ?? '20')

if (!API_KEY) {
  console.error('Missing API_FOOTBALL_KEY env var. Get one at https://www.api-football.com')
  process.exit(1)
}

let callCount = 0

// Pace requests. api-football Pro caps at 450 req/min ≈ 7.5/sec.
// 200ms between calls = 5/sec, comfortably under.
const MIN_CALL_INTERVAL_MS = Number(process.env.API_FOOTBALL_PACE_MS ?? '200')
let lastCallAt = 0
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function pace() {
  const elapsed = Date.now() - lastCallAt
  if (elapsed < MIN_CALL_INTERVAL_MS) {
    await sleep(MIN_CALL_INTERVAL_MS - elapsed)
  }
  lastCallAt = Date.now()
}

async function afRaw(endpoint, params = {}, retries = 1) {
  await pace()
  const url = new URL(`${BASE}${endpoint}`)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)))
  callCount++
  const res = await fetch(url, {
    headers: {
      'x-rapidapi-key': API_KEY,
      'x-rapidapi-host': 'v3.football.api-sports.io',
    },
  })
  if (res.status === 429 && retries > 0) {
    console.warn(`  ⚠ 429 on ${endpoint} — sleeping 60s then retrying once…`)
    await sleep(60_000)
    return afRaw(endpoint, params, retries - 1)
  }
  if (!res.ok) {
    throw new Error(`api-football ${res.status} on ${endpoint}: ${await res.text()}`)
  }
  const json = await res.json()
  if (json.errors && Object.keys(json.errors).length) {
    const errs = JSON.stringify(json.errors)
    if ((errs.includes('rateLimit') || errs.includes('requests')) && retries > 0) {
      console.warn(`  ⚠ rate-limit body on ${endpoint} — sleeping 60s then retrying once…`)
      await sleep(60_000)
      return afRaw(endpoint, params, retries - 1)
    }
    if (errs.includes('rateLimit') || errs.includes('requests')) {
      throw new Error(`Rate limit hit (no retries left): ${errs}`)
    }
    console.warn(`  ⚠ api-football reported errors on ${endpoint}: ${errs}`)
  }
  return json
}

async function af(endpoint, params = {}) {
  const json = await afRaw(endpoint, params)
  return json.response ?? []
}

async function afAllPages(endpoint, params = {}) {
  // Walk all pages of a paginated endpoint and concatenate results.
  const first = await afRaw(endpoint, { ...params, page: 1 })
  const out = [...(first.response ?? [])]
  const totalPages = first.paging?.total ?? 1
  for (let p = 2; p <= totalPages; p++) {
    const next = await afRaw(endpoint, { ...params, page: p })
    out.push(...(next.response ?? []))
  }
  return out
}

const COUNTRY_TO_CODE = {
  England: 'gb-eng',
  Scotland: 'gb-sct',
  Wales: 'gb-wls',
  'Northern Ireland': 'gb-nir',
  Spain: 'es', Italy: 'it', Germany: 'de', France: 'fr', Portugal: 'pt',
  Netherlands: 'nl', Belgium: 'be', Brazil: 'br', Argentina: 'ar', Mexico: 'mx',
  USA: 'us', 'United States': 'us', Canada: 'ca', Morocco: 'ma',
  'South Korea': 'kr', 'Korea Republic': 'kr', 'South Africa': 'za',
  Czechia: 'cz', 'Czech Republic': 'cz', Bosnia: 'ba',
  'Bosnia and Herzegovina': 'ba', Qatar: 'qa', Switzerland: 'ch',
  Haiti: 'ht', Paraguay: 'py', Australia: 'au', Turkey: 'tr',
  'Saudi Arabia': 'sa', Greece: 'gr', Japan: 'jp', Croatia: 'hr',
  Denmark: 'dk', Norway: 'no', Sweden: 'se', Poland: 'pl', Austria: 'at',
  Serbia: 'rs', Uruguay: 'uy', Colombia: 'co', Chile: 'cl', Peru: 'pe',
  Ecuador: 'ec', Senegal: 'sn', Nigeria: 'ng', Ghana: 'gh', Egypt: 'eg',
  Algeria: 'dz', Tunisia: 'tn', 'Ivory Coast': 'ci', Cameroon: 'cm',
  Iran: 'ir', Iraq: 'iq', Jordan: 'jo', Uzbekistan: 'uz',
  'New Zealand': 'nz',
}
function countryCode(c) {
  return COUNTRY_TO_CODE[c] ?? (c ? c.slice(0, 2).toLowerCase() : 'un')
}

function mapStage(round) {
  const r = (round ?? '').toLowerCase()
  if (r.includes('group')) return 'group'
  if (r.includes('round of 32') || r.includes('1/16')) return 'r32'
  if (r.includes('round of 16') || r.includes('1/8')) return 'r16'
  if (r.includes('quarter')) return 'qf'
  if (r.includes('semi')) return 'sf'
  if (r.includes('final')) return 'final'
  return 'group'
}

function parseGroupLetter(round) {
  const m = (round ?? '').match(/Group\s*-?\s*([A-L])/i)
  return m ? m[1].toUpperCase() : undefined
}

async function fetchFixtures() {
  console.log(`→ Fetching fixtures (league=${LEAGUE_ID}, season=${SEASON})…`)
  const raw = await af('/fixtures', { league: LEAGUE_ID, season: SEASON })
  console.log(`  got ${raw.length} fixtures`)
  return raw
}

async function enrichPlayerById(playerId) {
  // Fallback for players who didn't show up in /players?team=X&season=Y.
  // Returns the same /players-shape record, or null if not found.
  try {
    const records = await af('/players', { id: playerId, season: CLUB_SEASON })
    if (records.length) return records[0]
  } catch (err) {
    console.log(`      ⚠ /players?id=${playerId} failed: ${err.message}`)
  }
  // Last-ditch: profile endpoint gives height + photo (no club/rating, but better than nothing)
  try {
    const profile = await af('/players/profiles', { player: playerId })
    if (profile.length) {
      const p = profile[0].player ?? profile[0]
      return {
        player: {
          id: p.id,
          name: p.name,
          age: p.age,
          height: p.height,
          photo: p.photo,
        },
        statistics: [],
      }
    }
  } catch (err) {
    console.log(`      ⚠ /players/profiles?player=${playerId} failed: ${err.message}`)
  }
  return null
}

async function fetchTeamSquad(teamId) {
  // 1) Canonical 26-player roster from /players/squads (NOT season-gated).
  //    Returns thin records: id, name, age, number, position, photo.
  const squadResp = await af('/players/squads', { team: teamId })
  const roster = squadResp?.[0]?.players ?? []

  // 2) Enrich with /players for club / height / rating (season-gated, may miss some).
  //    Walk pagination so we don't get cut off at the default 20-per-page limit.
  let detailed = []
  try {
    detailed = await afAllPages('/players', { team: teamId, season: CLUB_SEASON })
  } catch (err) {
    console.log(`    ⚠ /players enrich failed: ${err.message}`)
  }
  const detailById = new Map()
  for (const d of detailed) {
    if (d.player?.id) detailById.set(d.player.id, d)
  }

  // 3) Per-player fallback for roster members still missing from /players.
  //    Caps to avoid runaway calls — most teams have <10 missing players.
  const missing = roster.filter((r) => !detailById.has(r.id))
  if (missing.length) {
    console.log(`    ↪ enriching ${missing.length} missing players individually…`)
    for (const r of missing) {
      const rec = await enrichPlayerById(r.id)
      if (rec) detailById.set(r.id, rec)
    }
  }

  // 3) Merge: roster is the source of truth (always 26 players). When a richer
  //    record exists in /players, use it. Otherwise synthesize a /players-shape
  //    record so the provider's existing mapper works.
  const merged = roster.map((r) => {
    const rich = detailById.get(r.id)
    if (rich) {
      // Overlay roster's official jersey number and position on top of /players
      // (the /players stats reflect club games, not national-team setup).
      return {
        ...rich,
        statistics: [
          {
            ...(rich.statistics?.[0] ?? {}),
            games: {
              ...(rich.statistics?.[0]?.games ?? {}),
              number: r.number ?? rich.statistics?.[0]?.games?.number,
              position: r.position ?? rich.statistics?.[0]?.games?.position,
            },
          },
          ...(rich.statistics?.slice(1) ?? []),
        ],
      }
    }
    return {
      player: {
        id: r.id,
        name: r.name,
        age: r.age,
        height: null,
        photo: r.photo,
      },
      statistics: [
        {
          team: null,
          games: {
            position: r.position,
            number: r.number,
            rating: null,
          },
        },
      ],
    }
  })

  return merged
}

async function fetchLineup(fixtureId) {
  const raw = await af('/fixtures/lineups', { fixture: fixtureId })
  return raw
}

// Names of FIFA national teams we know about. Used as a backstop filter
// for non-WC nationals (e.g. a player who also played for Wales / Norway).
// Keys are lowercased team names.
const NATIONAL_TEAM_NAMES = new Set([
  'germany', 'france', 'spain', 'italy', 'england', 'scotland', 'wales',
  'northern ireland', 'republic of ireland', 'portugal', 'netherlands',
  'belgium', 'switzerland', 'austria', 'czechia', 'czech republic',
  'croatia', 'serbia', 'poland', 'denmark', 'sweden', 'norway',
  'finland', 'iceland', 'hungary', 'romania', 'ukraine', 'turkey',
  'türkiye', 'greece', 'russia', 'brazil', 'argentina', 'uruguay',
  'paraguay', 'chile', 'peru', 'colombia', 'ecuador', 'bolivia',
  'venezuela', 'mexico', 'usa', 'united states', 'canada', 'panama',
  'costa rica', 'honduras', 'el salvador', 'jamaica', 'haiti', 'cuba',
  'morocco', 'algeria', 'tunisia', 'egypt', 'senegal', 'nigeria',
  'ghana', 'ivory coast', 'cameroon', 'south africa', 'cape verde',
  'mali', 'burkina faso', 'angola', 'congo dr', 'south korea',
  'korea republic', 'japan', 'iran', 'iraq', 'saudi arabia', 'australia',
  'qatar', 'uzbekistan', 'jordan', 'china', 'china pr', 'bosnia',
  'bosnia and herzegovina', 'bosnia & herzegovina', 'new zealand',
  'curaçao', 'curacao',
])

/**
 * Returns the player's current club, derived from /players/teams.
 * Filters out national teams (using the WC nationalTeamIds set, a
 * country-name backstop, and U-\d youth pattern), then picks the team
 * with the most recent season.
 *
 * Returns null when the only entries are national teams.
 */
async function fetchPlayerCurrentClub(playerId, nationalTeamIds) {
  const raw = await af('/players/teams', { player: playerId })
  if (!Array.isArray(raw) || raw.length === 0) return { club: null, raw: [] }

  const clubs = raw.filter((entry) => {
    const t = entry.team
    if (!t || !t.name) return false
    if (t.national === true) return false
    if (nationalTeamIds.has(t.id)) return false
    if (NATIONAL_TEAM_NAMES.has(t.name.toLowerCase())) return false
    // Youth national teams ("Germany U21", "France U-20")
    if (/\bU-?\d{1,2}\b/i.test(t.name)) return false
    return true
  })

  if (clubs.length === 0) return { club: null, raw }

  clubs.sort((a, b) => {
    const aMax = Math.max(...((a.seasons ?? []).map(Number).filter(Boolean) || [0]))
    const bMax = Math.max(...((b.seasons ?? []).map(Number).filter(Boolean) || [0]))
    return bMax - aMax
  })
  const t = clubs[0].team
  return {
    club: {
      id: t.id,
      name: t.name,
      country: t.country ?? null,
      logo: t.logo ?? null,
    },
    raw,
  }
}

async function main() {
  await fs.mkdir(DATA_DIR, { recursive: true })

  // 1. Fixtures
  const fixturesRaw = await fetchFixtures()
  const matches = fixturesRaw.map((f) => ({
    id: `af-${f.fixture.id}`,
    stage: mapStage(f.league.round),
    group: parseGroupLetter(f.league.round),
    kickoff: f.fixture.date,
    venue: f.fixture.venue?.name
      ? `${f.fixture.venue.name}${f.fixture.venue.city ? ', ' + f.fixture.venue.city : ''}`
      : undefined,
    home: {
      id: `af-team-${f.teams.home.id}`,
      name: f.teams.home.name,
      countryCode: countryCode(f.teams.home.name),
    },
    away: {
      id: `af-team-${f.teams.away.id}`,
      name: f.teams.away.name,
      countryCode: countryCode(f.teams.away.name),
    },
    hasLineups: ['FT', 'LIVE', 'AET', 'PEN', '1H', '2H', 'HT'].includes(
      f.fixture.status.short
    ),
    _rawTeamHomeId: f.teams.home.id,
    _rawTeamAwayId: f.teams.away.id,
    _rawStatus: f.fixture.status.short,
    _rawFixtureId: f.fixture.id,
  }))

  await fs.writeFile(
    path.join(DATA_DIR, 'fixtures.json'),
    JSON.stringify({ matches }, null, 2)
  )

  // 2. Build team meta + collect unique team IDs
  const teamMeta = {}
  const teamIdsToFetch = new Set()
  for (const m of matches) {
    teamMeta[m.home.id] = {
      id: m.home.id,
      name: m.home.name,
      countryCode: m.home.countryCode,
      _rawId: m._rawTeamHomeId,
    }
    teamMeta[m.away.id] = {
      id: m.away.id,
      name: m.away.name,
      countryCode: m.away.countryCode,
      _rawId: m._rawTeamAwayId,
    }
    teamIdsToFetch.add(m._rawTeamHomeId)
    teamIdsToFetch.add(m._rawTeamAwayId)
  }
  console.log(`→ ${teamIdsToFetch.size} unique teams to fetch squads for.`)

  // 3. Fetch squads (1 call per team).
  //    Load existing squads.json first so a partial failure doesn't wipe data —
  //    successful teams get updated, failed teams keep their prior cached entry.
  //    Set REFETCH_ALL=1 to ignore the existing cache and re-fetch everything.
  const refetchAll = process.env.REFETCH_ALL === '1'
  let squads = {}
  try {
    const existing = await fs.readFile(path.join(DATA_DIR, 'squads.json'), 'utf8')
    squads = JSON.parse(existing)
  } catch {
    /* no existing cache */
  }
  const targetIds = [...teamIdsToFetch]
  const remaining = refetchAll
    ? targetIds
    : targetIds.filter((tid) => !squads[`af-team-${tid}`]?.length)
  console.log(
    `→ ${targetIds.length} unique teams (${remaining.length} to fetch, ${
      targetIds.length - remaining.length
    } already cached)`
  )

  let i = 0
  for (const rawTeamId of remaining) {
    i++
    process.stdout.write(`  [${i}/${remaining.length}] team ${rawTeamId}… `)
    try {
      const players = await fetchTeamSquad(rawTeamId)
      squads[`af-team-${rawTeamId}`] = players
      console.log(`${players.length} players`)
      // Persist after every successful team so a future failure doesn't lose work.
      await fs.writeFile(
        path.join(DATA_DIR, 'squads.json'),
        JSON.stringify(squads, null, 2)
      )
    } catch (err) {
      console.log(`✗ ${err.message}`)
    }
  }

  await fs.writeFile(
    path.join(DATA_DIR, 'teams.json'),
    JSON.stringify(teamMeta, null, 2)
  )
  await fs.writeFile(
    path.join(DATA_DIR, 'squads.json'),
    JSON.stringify(squads, null, 2)
  )

  // 3b. For every player in every squad, look up their current club via
  //     /players/teams. The set of WC national-team IDs is the primary
  //     filter so we don't pick a national team as someone's "club."
  //     Raw responses are cached to raw-player-teams.json so filter changes
  //     can be re-applied offline without burning more API calls.
  //
  //     Set REFETCH_CLUBS=1 to refresh from the API.
  //     Set REFILTER_CLUBS=1 to re-derive clubs.json from raw-player-teams.json
  //     (no API calls — useful after filter logic changes).
  const refetchClubs = process.env.REFETCH_CLUBS === '1'
  const refilterClubs = process.env.REFILTER_CLUBS === '1'

  const nationalTeamIds = new Set([...teamIdsToFetch])

  let clubs = {}
  let rawPlayerTeams = {}
  try {
    clubs = JSON.parse(
      await fs.readFile(path.join(DATA_DIR, 'clubs.json'), 'utf8')
    )
  } catch {
    /* no existing cache */
  }
  try {
    rawPlayerTeams = JSON.parse(
      await fs.readFile(path.join(DATA_DIR, 'raw-player-teams.json'), 'utf8')
    )
  } catch {
    /* no existing cache */
  }

  const allPlayerIds = new Set()
  for (const teamPlayers of Object.values(squads)) {
    for (const p of teamPlayers) {
      const pid = p.player?.id ?? p.id
      if (pid) allPlayerIds.add(pid)
    }
  }

  if (refilterClubs) {
    // Re-derive clubs.json from cached raw responses — no API calls.
    console.log(`→ Re-filtering clubs from raw cache (${Object.keys(rawPlayerTeams).length} cached responses).`)
    clubs = {}
    for (const pid of allPlayerIds) {
      const raw = rawPlayerTeams[String(pid)] ?? []
      const clubEntries = raw.filter((entry) => {
        const t = entry.team
        if (!t || !t.name) return false
        if (t.national === true) return false
        if (nationalTeamIds.has(t.id)) return false
        if (NATIONAL_TEAM_NAMES.has(t.name.toLowerCase())) return false
        if (/\bU-?\d{1,2}\b/i.test(t.name)) return false
        return true
      })
      if (!clubEntries.length) {
        clubs[String(pid)] = null
        continue
      }
      clubEntries.sort((a, b) => {
        const aMax = Math.max(...((a.seasons ?? []).map(Number).filter(Boolean) || [0]))
        const bMax = Math.max(...((b.seasons ?? []).map(Number).filter(Boolean) || [0]))
        return bMax - aMax
      })
      const t = clubEntries[0].team
      clubs[String(pid)] = {
        id: t.id,
        name: t.name,
        country: t.country ?? null,
        logo: t.logo ?? null,
      }
    }
    await fs.writeFile(
      path.join(DATA_DIR, 'clubs.json'),
      JSON.stringify(clubs, null, 2)
    )
  } else {
    const playerIdsToFetch = [...allPlayerIds].filter(
      (pid) => refetchClubs || !(String(pid) in rawPlayerTeams)
    )
    console.log(
      `→ Resolving current clubs (${playerIdsToFetch.length} to fetch, ${
        allPlayerIds.size - playerIdsToFetch.length
      } cached raw responses). Pacing ~${MIN_CALL_INTERVAL_MS}ms/call.`
    )

    let cIdx = 0
    for (const pid of playerIdsToFetch) {
      cIdx++
      if (cIdx === 1 || cIdx % 50 === 0 || cIdx === playerIdsToFetch.length) {
        process.stdout.write(`  [${cIdx}/${playerIdsToFetch.length}] resolving clubs…\n`)
      }
      try {
        const { club, raw } = await fetchPlayerCurrentClub(pid, nationalTeamIds)
        rawPlayerTeams[String(pid)] = raw
        clubs[String(pid)] = club
      } catch (err) {
        console.log(`    ✗ player ${pid}: ${err.message}`)
      }
      if (cIdx % 25 === 0) {
        await fs.writeFile(
          path.join(DATA_DIR, 'clubs.json'),
          JSON.stringify(clubs, null, 2)
        )
        await fs.writeFile(
          path.join(DATA_DIR, 'raw-player-teams.json'),
          JSON.stringify(rawPlayerTeams, null, 2)
        )
      }
    }
    await fs.writeFile(
      path.join(DATA_DIR, 'clubs.json'),
      JSON.stringify(clubs, null, 2)
    )
    await fs.writeFile(
      path.join(DATA_DIR, 'raw-player-teams.json'),
      JSON.stringify(rawPlayerTeams, null, 2)
    )
  }

  // Re-flag hasLineups based on whether we actually have squads for both teams.
  // (Originally this gated on FT/LIVE status — but pre-tournament we still want
  // matches to be clickable as long as we can render both squads.)
  for (const m of matches) {
    const haveHome = (squads[m.home.id] ?? []).length > 0
    const haveAway = (squads[m.away.id] ?? []).length > 0
    m.hasLineups = haveHome && haveAway
  }
  await fs.writeFile(
    path.join(DATA_DIR, 'fixtures.json'),
    JSON.stringify({ matches }, null, 2)
  )

  // 4. Lineups — only for matches that have been played, capped by MAX_LINEUP_FETCHES.
  //    Load existing lineups.json to preserve prior fetches on partial failure.
  let lineups = {}
  try {
    const existing = await fs.readFile(path.join(DATA_DIR, 'lineups.json'), 'utf8')
    lineups = JSON.parse(existing)
  } catch {
    /* no existing cache */
  }
  const playableMatches = matches
    .filter((m) => m.hasLineups && !lineups[m.id])
    .slice(0, MAX_LINEUP_FETCHES)
  console.log(`→ Fetching lineups for ${playableMatches.length} new matches…`)
  for (const m of playableMatches) {
    try {
      const raw = await fetchLineup(m._rawFixtureId)
      if (raw.length >= 2) {
        lineups[m.id] = {
          home: {
            formation: raw[0].formation,
            startXI: raw[0].startXI.map((x) => ({
              playerId: x.player.id,
              grid: x.player.grid,
            })),
          },
          away: {
            formation: raw[1].formation,
            startXI: raw[1].startXI.map((x) => ({
              playerId: x.player.id,
              grid: x.player.grid,
            })),
          },
        }
        await fs.writeFile(
          path.join(DATA_DIR, 'lineups.json'),
          JSON.stringify(lineups, null, 2)
        )
      }
    } catch (err) {
      console.log(`  ✗ lineup ${m.id}: ${err.message}`)
    }
  }
  await fs.writeFile(
    path.join(DATA_DIR, 'lineups.json'),
    JSON.stringify(lineups, null, 2)
  )

  console.log(`✓ Done. ${callCount} API calls made. Files written to ${DATA_DIR}/`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
