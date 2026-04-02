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

- **Primary path**: Pulls **one public** `feed-investor.json` (HTTP GET, **no API keys** for the reader). The feed is **built daily** on the maintainer side: RSS (EN/CN tech), **Google News RSS**, **HN Algolia** (multi-query), **arXiv API** (`type: paper`), Reddit, GitHub (**narrowed query + `minStars`**), optional **Kickstarter** discover HTML (**default off**), optional **X** (**only if** maintainer sets `TWITTER_BEARER_TOKEN` in Actions). Items are gated by **`filter.includeKeywords`** (allowlist: must hit at least one term) plus a **small** **`excludeKeywords`** list (spam/politics/crypto noise only — not used as the main noise strategy).
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

- **[default-sources.json](default-sources.json)**: RSS + `googleNews` URLs, **`filter.includeKeywords`** (primary allowlist), optional legacy **`filter.thesis.orGroups`** (only if `includeKeywords` is empty), small **`excludeKeywords`**, `github.searchQuery` + `minStars`, `hackerNews.algoliaQueries`, `arxiv.queries`, `kickstarter.enabled`, `feed.capsByType` (incl. `paper`, `crowdfunding`), **`xTwitter.aiLeaders` / `aiInvestors`** (handles, limits).

## X / Twitter：为什么有博主清单还要 Token？

- **`aiLeaders` / `aiInvestors` 只回答「拉谁」**，不回答「怎么向 X 服务器证明身份」。X 已关闭无登录的公开时间线 JSON；**机器拉取推文必须用官方 API**（Bearer / OAuth），所以要在 GitHub Actions 里配仓库 Secret **`TWITTER_BEARER_TOKEN`**（维护者开发者应用的 token）。
- **读者仍然零 key**：token 只在构建 feed 的机器上用，不出现在 `feed-investor.json` 里。若不开 X 或不配 token，其它信源照常工作。
- 这与 [follow-builders](https://github.com/zarazhangrui/follow-builders) 一类「中央 JSON + 读者只读」一致：**清单是数据源配置，Token 是平台准入**，两件事不能互相替代。

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

1. **Fetch**: GET `FEED_URL` or read local `feed-investor.json`; parse JSON.
2. **Filter** (optional): by `tags` / `type` and user thesis in config. Prefer items with `type: funding` or `deal_signal` tag for deal table ordering.
3. **Enrich (host web search, no fabrication)** — before or while writing the digest:
   - For **Tier A** candidates and for **deal table rows** where **Investors** or **Amount** or **Round** would otherwise be **未披露**, open **1–2 public pages per company** (press release, reputable article, or public company profile) when the user’s environment allows search/browse.
   - **Copy only** what appears on the page: investors, round name, amount. If still missing, keep **未披露**. Never infer cap table or fill blanks from memory.
   - Stay on **thesis**; skip pages that are off-topic (e.g. quantum hardware with no AI 3D/video/game/social link).
4. **Summarize** using:
   - [prompts/digest-investor.md](prompts/digest-investor.md) — **order matters**: deals table first, then **Sourcing** tiers, then **Mapping**, then snapshot/OSS/social/**2–4 thesis papers max**, then Dropped.
   - [prompts/sourcing-deals.md](prompts/sourcing-deals.md) when the user asks “sourcing”, “pipeline”, or **可跟进项目**.
   - Type prompts: `summarize-funding.md`, `summarize-social-en.md` (split **ai_builder** vs **ai_investor** when tags present), `summarize-social-cn.md`, `summarize-opensource.md`, `summarize-papers.md` (strict cap and thesis filter per digest-investor).
5. **Investor overlays** (lightly, not financial advice): ecosystem role, signal triangulation, fact / reported / opinion / rumor.
6. **Deliver** per user preference.

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
| `prompts/mapping-market.md` | Full segment map |
| `prompts/sourcing-deals.md` | Tiered sourcing pipeline |
| `scripts/build-feed.mjs` | Build feed (RSS, Google News, HN Algolia, arXiv, Reddit, GitHub, optional KS/X) |
| `.github/workflows/update-feed.yml` | Daily + push + `npm install` in `scripts/` |
