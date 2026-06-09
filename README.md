# World Cup 2026

Match schedule and squad viewer for the FIFA World Cup 2026 (USA / Canada / Mexico). Built with Next.js 14 (App Router), TypeScript, and Tailwind CSS.

Click any match → see both teams' 26-player rosters grouped into Goalkeepers / Defenders / Midfielders / Attackers. Each player card shows their photo, age, height, jersey number, current club (with country flag), and salary / market value. When a starting XI is announced, an SVG pitch graphic renders the formation.

## Quickstart

```bash
npm install
npm run dev
```

By default the app boots against the **mock provider** (`DATA_PROVIDER=mock`) — Brazil vs Morocco demo match, no network required. To use real data:

```bash
cp .env.example .env.local
# edit .env.local: set API_FOOTBALL_KEY and DATA_PROVIDER=api-football
npm run fetch:data    # ~1,250 API calls, ~5 min on Pro tier
npm run dev
```

## Architecture

All data flows through a single interface:

```
WorldCupDataProvider          ─────►  src/lib/types.ts
├─ MockProvider               (Brazil + Morocco seed data, no network)
├─ ApiFootballProvider        (reads ./data/*.json populated by fetch script)
└─ FotMobProvider             (skeleton — endpoints stubbed, not finished)

Selection:                    DATA_PROVIDER env var
```

The app **never calls the api-football API at request time.** A separate `npm run fetch:data` script populates JSON caches in `./data/`, which the runtime provider reads. This is intentional:

- Free / Pro tier rate limits make per-request fetches unsafe
- Cached JSON is fast, deterministic, and easy to deploy
- Pre-fetched data ships in the git repo, so Vercel builds need zero API calls

### Data files (`./data/`)

| File | Source | Purpose |
|---|---|---|
| `fixtures.json` | `/fixtures?league=1&season=2026` | All 72 group-stage matches |
| `teams.json` | derived from fixtures | Per-team metadata |
| `squads.json` | `/players/squads` + `/players` (paginated) + `/players/profiles` fallback | 26-player roster per team, with stats |
| `clubs.json` | `/players/teams?player={id}` | Authoritative current club per player |
| `lineups.json` | `/fixtures/lineups?fixture={id}` | Starting XI + formation (only after kick-off) |
| `market-values.json` | Transfermarkt scrape | Optional, populated by `npm run scrape:values` |
| `raw-player-teams.json` | raw `/players/teams` responses | **Dev-only**, gitignored. Lets you re-filter `clubs.json` offline via `REFILTER_CLUBS=1 npm run fetch:data`. |

## Data refresh workflow

```bash
# Add fixtures + squads + clubs (incremental — skips cached teams/players)
npm run fetch:data

# Force a full refresh
REFETCH_ALL=1 npm run fetch:data       # squads + clubs
REFETCH_CLUBS=1 npm run fetch:data     # just clubs

# Re-derive clubs.json from cached raw responses (no API calls,
# useful after tweaking the national-team filter)
REFILTER_CLUBS=1 npm run fetch:data
```

### Salary / market value

api-football has no salary data. `npm run scrape:values` scrapes Transfermarkt market values:

```bash
# Create data/scrape-targets.json (gitignored):
# [{ "id": "af-<playerid>", "name": "Lionel Messi" }, ...]
npm run scrape:values
```

Transfermarkt has Cloudflare protection and ToS that prohibit scraping. Expect partial success; the scraper paces 3s between requests, caches per-player so reruns resume, and stops gracefully on block.

## Deploying to Vercel

This repo is Vercel-ready out of the box.

1. **Push to GitHub** (see below).
2. In Vercel: **Import Project** → pick the repo. The framework is auto-detected.
3. **Environment Variables** in the Vercel dashboard:
   ```
   DATA_PROVIDER=api-football
   ```
   That's it. `API_FOOTBALL_KEY` is **only** needed locally for `npm run fetch:data` — production reads pre-fetched JSON from `./data/`, which is committed to the repo.
4. Deploy.

### Production characteristics

- All pages are statically generated at build time (`force-static` + `generateStaticParams` on `/match/[matchId]`)
- 72 match detail pages pre-rendered
- Zero runtime API calls
- Refreshing data = run `npm run fetch:data` locally, commit, push, Vercel rebuilds

## Project layout

```
src/
├── app/
│   ├── layout.tsx              Root layout, fonts, skip link
│   ├── page.tsx                Home: hero + grouped match list
│   ├── match/[matchId]/page.tsx  Match detail with two TeamPanels
│   └── api/
│       ├── matches/route.ts    JSON proxy
│       └── match/[matchId]/route.ts
├── components/                 MatchList, MatchCard, TeamPanel, PositionSection,
│                               PlayerCard, PlayerAvatar (client), PitchView,
│                               StarRating, CountryFlag
└── lib/
    ├── types.ts                Player, Team, Match, MatchDetail, provider interfaces
    ├── utils.ts                cm↔ft/in, salary formatting, etc.
    ├── providers/
    │   ├── index.ts            getProvider() factory (env-driven)
    │   ├── mock.ts             Default — Brazil + Morocco demo
    │   ├── api-football.ts     Reads ./data/*.json
    │   └── fotmob.ts           Skeleton stub
    └── data/                   Mock provider's seed data only
scripts/
├── fetch-from-api-football.mjs Populates ./data/ from api-football
└── scrape-transfermarkt.mjs    Scrapes Transfermarkt market values
data/                           Cached JSON (committed for Vercel — see above)
```

## License

MIT
