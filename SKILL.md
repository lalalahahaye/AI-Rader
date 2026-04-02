---
name: pevc-ai-radar
description: >-
  Delivers a daily PEVC-oriented AI market digest from a public central JSON feed
  (funding, news, Reddit/X, Chinese social, GitHub, papers, crowdfunding) with zero
  end-user API keys. Use when the user wants sourcing, market mapping, investor
  radar, AI 3D, world models, AI video, AI social, or scheduled digests like follow-builders.
---

# PEVC AI Radar

## What this skill does

- **Primary path**: Pulls **one public** `feed-investor.json` (HTTP GET, **no API keys** for the reader). The feed is **built daily** on the maintainer side: RSS (EN/CN tech), **Google News RSS**, **HN Algolia** (multi-query), **arXiv API** (`type: paper`), Reddit, GitHub (**narrowed query + `minStars`**), optional **Kickstarter** discover HTML (**default off**), optional **X** (**only if** maintainer sets **`TWITTER_BEARER_TOKEN`** or **`X_BEARER_TOKEN`** in Actions — same official API v2 pattern as [follow-builders](https://github.com/zarazhangrui/follow-builders)). **RSS/HN/…** use **`filter.includeKeywords`** allowlist + small **`excludeKeywords`**; **X** by default uses **`xTwitter.skipThesisFilter: true`** so listed accounts are not dropped for missing thesis terms (still filtered by `excludeKeywords` only).
- **Sourcing + mapping**: Daily digest must include a **sourcing pipeline** and **mapping delta** (see prompts). Weekly or on-demand **full market map** via dedicated prompt.
- **Onboarding**: after setup, run **one digest immediately**, then **daily** (host scheduler).

Aligns with [follow-builders](https://github.com/zarazhangrui/follow-builders): **central feed + local remix**.

## Default feed URL

After you publish this repo to GitHub, set:

`https://raw.githubusercontent.com/<OWNER>/<REPO>/main/feed-investor.json`

Until then, the agent may read the **local** file in this skill folder: `feed-investor.json`.

Environment variable (optional): `FEED_URL` pointing to any public HTTPS JSON.

Optional CLI (no keys): from `scripts/`, run `node fetch-feed.mjs` or `node fetch-feed.mjs <path-or-url>`.

## Maintainer config (no code)

- **[default-sources.json](default-sources.json)**: RSS + `googleNews` URLs, **`filter.includeKeywords`** (primary allowlist for non-X sources), optional legacy **`filter.thesis.orGroups`**, small **`excludeKeywords`**, `github.searchQuery` + `minStars`, `hackerNews.algoliaQueries`, `arxiv.queries`, `kickstarter.enabled`, `feed.capsByType` (incl. `paper`, `crowdfunding`), **`xTwitter`** (`aiLeaders` / `aiInvestors`, **`skipThesisFilter`**, **`apiBase`**, `maxAccountsPerRun`).

## X / Twitter：为什么有博主清单还要 Token？

- **`aiLeaders` / `aiInvestors` 只回答「拉谁」**，不回答「怎么向 X 服务器证明身份」。X 已关闭无登录的公开时间线 JSON；**机器拉取推文必须用官方 API v2**（Bearer），与 follow-builders 的 **`X_BEARER_TOKEN` + `api.x.com/2`** 同类。本仓库接受 **`TWITTER_BEARER_TOKEN`** 或 **`X_BEARER_TOKEN`**（任填其一即可）。
- **实现细节**：CI 用 **`GET /2/users/by?usernames=...`** 批量解析用户 ID，再按账号拉时间线，减少请求次数；条目带 **`authorHandle` / `authorName`**，链接域名为 **`x.com`**。
- **读者仍然零 key**：token 只在构建 feed 的机器上用，不出现在 `feed-investor.json` 里。若不开 X 或不配 token，其它信源照常工作。
- **`skipThesisFilter`（默认 true）**：X 上的机构/创始人推文往往不含 `nerf`、`文生视频` 等 allowlist 词；设为 true 时 **不** 要求命中 `includeKeywords`，只剔除 `excludeKeywords`，行为贴近 follow-builders。

## 商业数据库与中文社区（Path B — 非 CI 批量）

**Readers 零 key ≠ 能自动同步 IT 桔子 / 企名片 / 天眼查 / 企查查 全库。** 这些产品多数在登录、付费或官方 API 之后；未经授权的批量抓取还有 **ToS 与合规** 风险。

- **In chat**: When the user asks for **a specific company’s funding**, use **host web search** to open **one public page at a time** (press release, news article, or a **public summary page** on a database site if it loads without login). **Do not invent** amounts, rounds, or shareholders that do not appear on the page; use **未披露** when unknown.
- **微信 / 小红书**: No stable official anonymous API for CI. Options: **curated lines in `feed-investor.json`**, **user-pasted links** in thread, or third-party RSS bridges (fragile — see [sources.md](sources.md)).
- **CI boundary**: Only **Path A** sources in [sources.md](sources.md) run in `build-feed.mjs`; do not imply parity with closed databases or WeChat/Xiaohongshu feeds unless items exist in the JSON or the user pasted links.

## Onboarding (conversational)

Ask the user once, then persist preferences under `~/.pevc-ai-radar/config.json` (create directory if needed). **Do not commit this file.**

1. **Cadence**: daily (default) or weekly; **local time** for digest.
2. **Language**: English, Chinese (简体中文), or bilingual sections.
3. **Thesis** (new): sectors, geo, stage focus, cheque band (free text) — used for **mapping** and **sourcing** prioritization.
4. **Delivery**:
   - **Feishu + OpenClaw**: digest body in the **current session** unless another channel is configured.
   - **Other**: in-chat, Telegram/email — tokens **local only**.

After saving config: **immediately** run **one full digest** (`fetch → summarize → deliver`).

## Daily digest workflow

1. **Fetch**: GET `FEED_URL` or read local `feed-investor.json`; parse JSON. Note **`updatedAt`** so the user knows how fresh the batch is.
2. **Partition (do not cherry-pick)** — before writing:
   - Group `items` by **`source`** (unique labels: `36kr`, `jiqizhixin`, `github_search`, `hacker_news_algolia`, `reddit_r_*`, `twitter_*`, …) and by **`type`** (`funding`, `news`, `oss`, `paper`, `social_en`, …).
   - **Scheduled / 定时推送** must **not** only sample a few items: cover **every source that has ≥1 item** at least once (see [digest-investor.md](prompts/digest-investor.md) **Full source coverage**). If output length is a concern, truncate **per source** with an explicit `…余下 N 条略` note, never drop whole sources without saying so.
3. **Filter** (optional): by `tags` / `type` and user thesis in config. Sort deals by recency (`publishedAt`) for the financing block.
4. **Enrich (host web search, no fabrication)** — for **each** financing row where **Investors / Amount / Round** is **未披露** and the company is material, open **1 public page** when possible; **copy only** visible facts. Tier A still prioritized if time is limited.
5. **Summarize** using [prompts/digest-investor.md](prompts/digest-investor.md):
   - **Order**: **投融资高密度** → **技术进展（OSS + 论文 + 技术向 news/HN/Reddit）** → **Sourcing（压缩）** → **Mapping（压缩）** → 社媒/X → Follow-ups → Dropped.
   - **Density**: no boilerplate; tables/bullets; data and links first (same rules for 中文).
   - **简体中文** / **follow-builders 风**：加 [prompts/digest-layout-builders-zh.md](prompts/digest-layout-builders-zh.md) + [prompts/summarize-x-builders-zh.md](prompts/summarize-x-builders-zh.md) for X blocks.
   - [prompts/sourcing-deals.md](prompts/sourcing-deals.md) when the user asks sourcing / pipeline / **可跟进项目**.
   - Type prompts: `summarize-funding.md`, `summarize-social-en.md`, `summarize-social-cn.md`, `summarize-opensource.md`, `summarize-papers.md` — keep outputs **short**; align with digest-investor caps.
6. **Investor overlays** (light): fact vs opinion vs rumor; not financial advice.
7. **Deliver** per user preference.

### Scheduled push quality bar

- **信息量**: 多信源 = 在正文里 **显式覆盖** RSS（36氪/机器之心/量子位/TC/VB/Sifted）、Google News、HN、Reddit、GitHub、arXiv、X（若有）等；缺条目则 **一行说明**，不要假装没有该渠道。
- **信息密度**: 拒绝低信息量开场白；投融资 **逐条** 写清亮点与交易要素；技术块 **逐条 repo/论文** 有硬信息 + 链接。

## Weekly / on-demand mapping

When the user asks **市场图谱**, **mapping**, **segment map**, or **赛道更新**:

1. Use [prompts/mapping-market.md](prompts/mapping-market.md) with the same feed + config thesis.
2. If no prior digest in thread, say clearly this is a **cross-section** only; if user pastes last digest, compute **delta**.

## Fallback mode (no central feed or empty feed)

1. Use [sources.md](sources.md) public sources; state **fallback** in the output.
2. Do **not** promise X / 小红书 / 微信 parity without feed items or pasted links.

## Scheduling

- **OpenClaw on Feishu**: cron or scheduled invocation for daily digest; optional weekly mapping run.
- **Cursor**: OS scheduler or manual.

## One-off requests

- **Company / domain deep dive**: [prompts/deal-signal-onepager.md](prompts/deal-signal-onepager.md) + public search; no paywall bypass.
- **Sourcing-only**: [prompts/sourcing-deals.md](prompts/sourcing-deals.md).

## Compliance

- **Public** content only; respect ToS and rate limits.
- **No** inventing investors, amounts, or rounds — use **未披露** when missing.

## File map

| File | Role |
|------|------|
| [sources.md](sources.md) | RSS lists, X setup, Secrets |
| [default-sources.json](default-sources.json) | RSS, Google News, `includeKeywords` allowlist, HN Algolia, arXiv, GitHub, optional KS/X, caps |
| [feed-investor.json](feed-investor.json) | Central feed (CI-built) |
| [feed-investor.schema.json](feed-investor.schema.json) | JSON shape + optional deal/OSS fields |
| [examples/sample-digest.md](examples/sample-digest.md) | Output example |
| [examples/sample-digest-builders-zh.md](examples/sample-digest-builders-zh.md) | 中文 follow-builders 风版式示例 |
| [prompts/digest-layout-builders-zh.md](prompts/digest-layout-builders-zh.md) | 中文分节与 X 展示样式 |
| [prompts/summarize-x-builders-zh.md](prompts/summarize-x-builders-zh.md) | 单条推文 → 结论 + 要点（中文） |
| `prompts/mapping-market.md` | Full segment map |
| `prompts/sourcing-deals.md` | Tiered sourcing pipeline |
| `scripts/build-feed.mjs` | Build feed (RSS, Google News, HN Algolia, arXiv, Reddit, GitHub, optional KS/X) |
| `.github/workflows/update-feed.yml` | Daily + push + `npm install` in `scripts/` |
