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

- **Primary path**: Pulls **one public** `feed-investor.json` (HTTP GET, **no API keys** for the reader). The feed is **updated daily on the maintainer side** (GitHub Actions in this repo merges Hacker News, Reddit hot JSON, GitHub search, and optional curator-only sources into that file).
- Summarizes items for **PEVC sourcing / market mapping** using prompts in `prompts/`.
- Supports **onboarding**: after setup, run **one digest immediately**, then **daily** (via host scheduler).

Aligns with [follow-builders](https://github.com/zarazhangrui/follow-builders): **central feed + local remix**.

## Default feed URL

After you publish this repo to GitHub, set:

`https://raw.githubusercontent.com/<OWNER>/<REPO>/main/feed-investor.json`

Until then, the agent may read the **local** file in this skill folder: `feed-investor.json`.

Environment variable (optional): `FEED_URL` pointing to any public HTTPS JSON.

Optional CLI (no keys): from `scripts/`, run `node fetch-feed.mjs` or `node fetch-feed.mjs <path-or-url>`.

## Onboarding (conversational)

Ask the user once, then persist preferences under `~/.pevc-ai-radar/config.json` (create directory if needed). **Do not commit this file.**

1. **Cadence**: daily (default) or weekly; **local time** for digest.
2. **Language**: English, Chinese (简体中文), or bilingual sections.
3. **Delivery**:
   - **Feishu + OpenClaw (recommended)**: treat digest as the message body for the **current Feishu session** — no extra channel tokens if the host posts the reply for you.
   - **Other**: in-chat only, or user-supplied channel (Telegram/email) — if they choose external delivery, they must provide tokens **locally**; never store tokens in the repo.

After saving config: **immediately** run **one full digest** (`fetch → summarize → deliver`).

## Daily digest workflow

1. **Fetch**: GET `FEED_URL` or read `feed-investor.json` next to this skill; parse JSON.
2. **Filter** (optional): keep items whose `tags` or `type` match user focus (AI 3D, world models, AI video, AI social, etc.) — see `sources.md`.
3. **Summarize** using:
   - [prompts/digest-investor.md](prompts/digest-investor.md) for the overall digest structure.
   - Type-specific prompts: `summarize-funding.md`, `summarize-social-en.md`, `summarize-social-cn.md`, `summarize-opensource.md`, `summarize-papers.md`.
4. **Investor overlays** (always apply lightly, not as financial advice):
   - Tag **ecosystem role**: infra, app, open-core, research, hardware, etc.
   - **Signal triangulation**: note when only one weak source vs multiple public sources.
   - Separate **fact / reported / opinion / rumor**.
5. **Deliver** per user preference (e.g. full digest text in Feishu chat).

## Fallback mode (no central feed or empty feed)

Use only if GET fails or `items` is empty:

1. Use **public, no-key** sources listed in [sources.md](sources.md): RSS, Reddit `.json` endpoints, GitHub search/topic pages, arXiv/Semantic Scholar public APIs.
2. **Do not** promise parity with X / 小红书 / 微信公众号 without curated feed entries or user-pasted links.
3. State clearly in the digest that this run used **fallback** sources.

## Scheduling

- **OpenClaw on Feishu**: use the host’s **cron or scheduled invocation** to run this digest workflow daily at the user’s time; output is the **reply in the bound Feishu conversation** unless the user configured another delivery in `config.json`.
- **Cursor only**: use **Windows Task Scheduler** or **cron** to trigger the agent, or run digest manually — IDE has no built-in cron.

## One-off requests

- **Company / domain deep dive**: use [prompts/deal-signal-onepager.md](prompts/deal-signal-onepager.md) plus public web search; do not bypass paywalls.
- **Market map update**: incremental delta vs last digest (segments, players, tech path, stage).

## Compliance

- Only **public** content; respect site ToS and rate limits.
- **No** scraping of logged-in-only feeds as a substitute for the central JSON.
- Funding figures: cite **original announcement or reputable press**; flag uncertainty.

## File map

| File | Role |
|------|------|
| [sources.md](sources.md) | Curator lists, RSS, subreddits, topics, fallback queries |
| [default-sources.json](default-sources.json) | Maintainer: which HN/Reddit/GitHub pulls `build-feed.mjs` uses (no code edit) |
| [feed-investor.json](feed-investor.json) | Central feed (CI-updated + optional manual items) |
| [feed-investor.schema.json](feed-investor.schema.json) | JSON shape for maintainers |
| [examples/sample-digest.md](examples/sample-digest.md) | Output example |
| `scripts/build-feed.mjs` | Maintainer: rebuild feed from public APIs (no reader keys) |
| `.github/workflows/update-feed.yml` | Daily schedule to run `build-feed.mjs` and commit |
