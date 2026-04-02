# Sources and curator checklist

Maintain **central** `feed-investor.json`. End users only **GET** the file.

## Automated daily build (this repo)

The workflow **Update feed (daily)** runs [`scripts/build-feed.mjs`](scripts/build-feed.mjs) after **`npm install`** in [`scripts/`](scripts/) (for `fast-xml-parser`). Configure everything in **[`default-sources.json`](default-sources.json)**:

| Block | What it does |
|--------|----------------|
| `filter` | `includeKeywords` / `excludeKeywords`; `requireKeywordMatch`; per-source toggles `applyToHackerNews`, `applyToReddit`, `applyToRss`, `applyToGithub`, `applyToTwitter` |
| `rss` | List of `{ url, sourceLabel, maxItems, mapToType, itemTags }` — RSS and Atom |
| `hackerNews` | Top stories → `news` |
| `reddit` | Hot JSON → `social_en` |
| `github` | Search API; **`minStars`** appended as `stars:>N` in query; results also filtered by `stargazers_count` |
| `xTwitter` | **`aiLeaders`** (builders) + **`aiInvestors`** (VCs) handles; items tagged `ai_builder` / `ai_investor` |
| `feed` | `maxTotalItems`, **`capsByType`** per `type` to balance funding vs news vs OSS vs social |

If `default-sources.json` is missing, built-in safe defaults apply.

## RSS (English / EU)

URLs **change** on publisher sites — verify in browser if a feed fails (workflow logs a warning).

- TechCrunch — category feeds (e.g. AI).
- VentureBeat — `/category/ai/feed/`.
- Sifted — main feed.
- Add more in `rss.feeds` (e.g. The Verge tech, FT tech if legally OK for your use).

## X (Twitter) — AI 大佬 + AI 投资机构

- **No anonymous bulk API.** For automated pulls, add repository secret **`TWITTER_BEARER_TOKEN`** (Bearer token from a Twitter/X developer app). **Readers never see this token.**
- Edit **`xTwitter.aiLeaders`** (researchers, founders, product leaders) and **`xTwitter.aiInvestors`** (firms, partners). Set **`xTwitter.enabled`: `true`** to run in CI.
- **Limits**: Free/low tiers may restrict `users` + `tweets` volume; keep **`maxAccountsPerRun`** aligned with `aiLeaders.length + aiInvestors.length` (or lower `maxTweets` per account); expect occasional 429 — check Actions logs.
- Without token: leave `enabled: false`; feed still has RSS, HN, Reddit, GitHub.

### Curated list in `default-sources.json` (PE/VC — Physical AI & vertical apps)

Handles are **without `@`**. If user lookup fails in Actions logs, the handle may have changed — verify on X.

| Theme | Handles (in `aiInvestors`) | Notes |
|--------|---------------------------|--------|
| **AI 3D / world models / physical AI** | `a16z`, `sequoia`, `luxcapital`, `wolfejosh`, `DCVCvc`, `nvidiainv` | `wolfejosh` = Josh Wolfe (Lux); fund = `luxcapital`. Nvidia ventures = `nvidiainv`. DCVC = `DCVCvc`. |
| **AI social / companions / consumer** | `lsvp`, `benchmark`, `m2jr`, `generalcatalyst`, `niko_b0n`, `foundersfund`, `collision` | Lightspeed = `lsvp`; Benchmark + Miles Grimshaw = `benchmark` + `m2jr`; GC + Niko Bonatsos = `generalcatalyst` + `niko_b0n`; Founders Fund + `collision`. |
| **Vertical AI / apps / digital twins** | `indexventures`, `erin_l_griffith`, `greylockvc`, `reidhoffman`, `sethg`, `glasswingvc`, `amplifyvc` | Erin Griffith: if `erin_l_griffith` fails, try `eringriffith`. Greylock firm = `greylockvc`; `reidhoffman` / `sethg` = Greylock-side accounts you listed. Glasswing = `glasswingvc`. Amplify = `amplifyvc`. |

**`aiLeaders`** (default): `ylecun`, `karpathy`, `gdb` — pure research/product signal, not fund flow.

## Reddit

- `r/startups`, `r/SaaS`, `r/MachineLearning`, `r/LocalLLaMA`, `r/artificial`, … — configure under `reddit.subreddits`.

## 小红书 / 微信公众号

- Curate into `feed-investor.json` or extend maintainer scripts; not included in default builder.

## GitHub

- `github.searchQuery` + **`minStars`** for quality bar.
- Unauthenticated Search API: **60 requests/hour/IP** on GitHub — one run per day is fine.

## Chinese news RSS

- 36氪、机器之心、量子位等 — add entries under `rss.feeds` with `mapToType` and tags as needed.

## Academic / crowdfunding

- Not in default builder; add custom scripts or manual items.

## Default FEED_URL for friends

`https://raw.githubusercontent.com/<OWNER>/<REPO>/main/feed-investor.json`

Replace `OWNER`/`REPO`.
