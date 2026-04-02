# PEVC AI Radar (Cursor / Agent Skill)

Investor-oriented **daily AI market radar**: funding, news, Reddit/X, GitHub, papers, optional crowdfunding — **no API keys for readers**, same pattern as [follow-builders](https://github.com/zarazhangrui/follow-builders).

**Central feed**: [`.github/workflows/update-feed.yml`](.github/workflows/update-feed.yml) runs **`npm install`** in `scripts/`, then [`scripts/build-feed.mjs`](scripts/build-feed.mjs) (daily / on config changes / manual). Sources (all public HTTP unless noted): **RSS** (EN + CN tech), **Google News RSS**, **HN Algolia** (multi-query), **arXiv**, **Reddit**, **GitHub Search** (`searchQuery` + **`minStars`**), optional **Kickstarter** HTML (default off), optional **X** if repo secret **`TWITTER_BEARER_TOKEN`** is set. **Noise control**: `filter.includeKeywords` allowlist (must match at least one) + small `excludeKeywords` + `feed.capsByType` in [`default-sources.json`](default-sources.json).

**Agent**: [`SKILL.md`](SKILL.md) + [`prompts/`](prompts/) — sourcing pipeline, mapping delta, funding rows (**未披露** when unknown). Commercial DBs / WeChat / Xiaohongshu are **search or manual curation**, not bulk CI — see [`sources.md`](sources.md).

## Install (Cursor)

```bash
git clone https://github.com/<OWNER>/<REPO>.git ~/.cursor/skills/pevc-ai-radar
```

Windows (PowerShell): same URL, target `$env:USERPROFILE\.cursor\skills\pevc-ai-radar`.

## OpenClaw + Feishu

1. Install per **OpenClaw** docs (often `git clone` into that product’s skills directory).
2. **Daily schedule**: fetch central JSON → summarize with `prompts/` → post in Feishu.
3. Readers only need the **public `FEED_URL`**; no X/GitHub/news API keys on the Feishu side.

## Central feed

Default:

`https://raw.githubusercontent.com/<OWNER>/<REPO>/main/feed-investor.json`

Optional: `FEED_URL` env pointing at any public HTTPS JSON.

```bash
cd scripts && node fetch-feed.mjs ../feed-investor.json
```

Rebuild locally (maintainer):

```bash
node scripts/build-feed.mjs
```

Enable **Actions** on the repo; run **Update feed (daily)** manually once if you need a fresh `feed-investor.json`.

## Usage

In chat: e.g. **“Run my PEVC AI radar digest”** or **“Set up pevc-ai-radar”**. First setup runs an immediate digest; daily runs use OpenClaw or an OS scheduler (Cursor has no built-in cron).

## Repo layout

- `SKILL.md` — agent instructions  
- `default-sources.json` — feed builder config  
- `feed-investor.json` — CI-built feed  
- `feed-investor.schema.json` — JSON shape  
- `prompts/` — summarization  
- `sources.md` — source list + Path A/B  
- `scripts/fetch-feed.mjs`, `scripts/build-feed.mjs`  
- `.github/workflows/update-feed.yml`, `validate-feed.yml`  

## License

MIT — [LICENSE](LICENSE).

## 中文说明

[README.zh-CN.md](README.zh-CN.md).
