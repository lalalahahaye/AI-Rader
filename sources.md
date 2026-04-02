# Sources and curator checklist

Maintain **central** `feed-investor.json`. End users only **GET** the file.

## Path A vs Path B (capabilities)

| Path | What runs in CI (`build-feed.mjs`) | Keys / login |
|------|-------------------------------------|--------------|
| **A — automated** | Public HTTP only: RSS / Atom, **Google News RSS**, **HN Algolia**, **arXiv API**, Reddit hot JSON, GitHub Search, optional **Kickstarter** HTML discover (fragile, default **off**), optional **X** if `TWITTER_BEARER_TOKEN` | Readers: **none**. X: maintainer secret only. |
| **B — search / curator** | **企名片、鲸准、清科、IT 桔子、企查查、天眼查** 等结构化融资库；**微信、小红书** 无稳定匿名官方 API | Often **login / pay / ToS**; no bulk scraping in CI. Agent opens **one public page** per company, or you **paste / hand-edit** into `feed-investor.json`. |

**RSS URLs** (36氪、机器之心、量子位、Google News 等) **需人工在浏览器验证** — 站点改版会导致 feed 失效；工作流只打 warning，不阻断整次构建。

## Automated daily build (this repo)

The workflow **Update feed (daily)** runs [`scripts/build-feed.mjs`](scripts/build-feed.mjs) after **`npm install`** in [`scripts/`](scripts/) (for `fast-xml-parser`). Configure everything in **[`default-sources.json`](default-sources.json)**:

| Block | What it does |
|--------|----------------|
| `filter` | **`includeKeywords`**（非空时）：允许列表 — 标题 + `summaryHint` + `tags` 须 **至少命中其一**，否则丢弃；**`thesis.orGroups`** 仅在 `includeKeywords` 为空时作为多组 OR 后备；**`excludeKeywords`** 只保留少量spam/时政等；各 `applyTo*` 开关 |
| `rss` | `{ url, sourceLabel, maxItems, mapToType, itemTags }` — RSS and Atom（含中文科技） |
| `googleNews` | Google News **搜索 RSS** URL 列表，走与 RSS 相同的解析路径 |
| `hackerNews` | **HN Algolia** 多 `algoliaQueries`；可选 `firebaseTopStories` 补充 top |
| `arxiv` | `export.arxiv.org/api/query`，条目 `type: paper` |
| `reddit` | Hot JSON → `social_en` |
| `github` | Search API；**`minStars`** 追加为 `stars:>N`；结果再按 `stargazers_count` 过滤 |
| `kickstarter` | **`enabled: false` 默认**；公开 discover HTML 正则抽链接，失败只 log |
| `xTwitter` | **`aiLeaders`** + **`aiInvestors`**；需 Secret **`TWITTER_BEARER_TOKEN`** |
| `feed` | `maxTotalItems`, **`capsByType`**（含 `paper`、`crowdfunding`） |

If `default-sources.json` is missing, built-in safe defaults apply.

## RSS (English / EU / CN)

URLs **change** on publisher sites — verify in browser if a feed fails (workflow logs a warning).

- EN: TechCrunch AI, VentureBeat AI, Sifted, …
- CN: 36氪、机器之心、量子位等 — 已在默认 `rss.feeds` 中列出，**请自行验证可用性**。

## Google News RSS

- 无 key；用固定搜索词生成 `news.google.com/rss/search?...` URL，与 **`filter.includeKeywords`** 赛道对齐。
- `hl` / `gl` / `ceid` 按语言与地区调整。

## Hacker News (Algolia)

- 公开 API：`https://hn.algolia.com/api/v1/search?tags=story&query=...`
- 多 query 减少无关 top stories；可选 Firebase top stories。

## arXiv

- 无 key：`export.arxiv.org/api/query`，`search_query` + `max_results`。
- 默认映射为 **`type: paper`**。

## X (Twitter) — AI 大佬 + AI 投资机构

- **`aiLeaders` / `aiInvestors` = which accounts to fetch**; they are **not** login credentials. X requires an app **Bearer token** to call the API — add repository secret **`TWITTER_BEARER_TOKEN`**. **Readers never see this token** (it stays in Actions).
- **No anonymous bulk API** for arbitrary user timelines (unlike Reddit’s public JSON).
- Edit **`xTwitter.aiLeaders`** (researchers, founders, product leaders) and **`xTwitter.aiInvestors`** (firms, partners). Set **`xTwitter.enabled`: `true`** to run in CI.
- **Limits**: Free/low tiers may restrict `users` + `tweets` volume; keep **`maxAccountsPerRun`** aligned with `aiLeaders.length + aiInvestors.length` (or lower `maxTweets` per account); expect occasional 429 — check Actions logs.
- Without token: leave `enabled: false`; feed still has RSS, HN, Reddit, GitHub, Google News, arXiv, …

### Curated list in `default-sources.json` (PE/VC — Physical AI & vertical apps)

Handles are **without `@`**. If user lookup fails in Actions logs, the handle may have changed — verify on X.

| Theme | Handles (in `aiInvestors`) | Notes |
|--------|---------------------------|--------|
| **AI 3D / world models / physical AI** | `a16z`, `sequoia`, `luxcapital`, `wolfejosh`, `DCVCvc`, `nvidiainv` | `wolfejosh` = Josh Wolfe (Lux); fund = `luxcapital`. Nvidia ventures = `nvidiainv`. DCVC = `DCVCvc`. |
| **AI social / companions / consumer** | `lsvp`, `benchmark`, `m2jr`, `generalcatalyst`, `niko_b0n`, `foundersfund`, `collision` | Lightspeed = `lsvp`; Benchmark + Miles Grimshaw = `benchmark` + `m2jr`; GC + Niko Bonatsos = `generalcatalyst` + `niko_b0n`; Founders Fund + `collision`. |
| **Vertical AI / apps / digital twins** | `indexventures`, `erin_l_griffith`, `greylockvc`, `reidhoffman`, `sethg`, `glasswingvc`, `amplifyvc` | Erin Griffith: if `erin_l_griffith` fails, try `eringriffith`. Greylock firm = `greylockvc`; `reidhoffman` / `sethg` = Greylock-side accounts you listed. Glasswing = `glasswingvc`. Amplify = `amplifyvc`. |

**`aiLeaders`** (default): `ylecun`, `karpathy`, `gdb` — pure research/product signal, not fund flow.

## Reddit

- 默认含 **GaussianSplatting、gamedev、Unity3D、unrealengine、videography** 等与 3D / 游戏 / 视频相关 sub，外加 `MachineLearning` / `LocalLLaMA`；**强依赖 `includeKeywords` 允许列表** 降噪。
- 在 `reddit.subreddits` 中增删。

## 小红书 / 微信公众号

- **不进默认 CI 爬虫**（无稳定官方匿名 API）。
- 可行：**人工摘要写入 `feed-investor.json`**、**RSS 桥**（易失效、合规自担）、或 **Agent 仅处理用户粘贴的链接**。

## 商业数据库（IT 桔子、企名片、天眼查、企查查等）

- **不在 Path A**：无法在无 key、无登录条件下于 Actions 中 **批量** 同步全库；且未授权批量抓取有 **ToS / 合规** 风险。
- **Path B**：对用户追问某司融资时，Agent **联网搜索** 打开 **单条公开页**（新闻稿、媒体报道、外显摘要页）；**不得编造** 页面上未出现的金额、轮次、股东。

## GitHub

- `github.searchQuery` + **`minStars`**（赛道收窄 + 质量门槛）。
- Unauthenticated Search API: **60 requests/hour/IP** on GitHub — one run per day is fine.

## Kickstarter（可选）

- **`kickstarter.enabled`** 默认 `false`；开启后解析失败 **不导致** 整 job 失败（catch + warn）。
- HTML 结构变化会导致失效 — 仅作补充信号。

## Public feed URL

`https://raw.githubusercontent.com/<OWNER>/<REPO>/main/feed-investor.json` — replace `OWNER`/`REPO`, or set `FEED_URL` to any public JSON.
