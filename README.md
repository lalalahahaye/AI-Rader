# PEVC AI Radar (Cursor / Agent Skill)

Investor-oriented **daily AI market radar**: funding, news, Reddit/X, Chinese social (via curated feed), GitHub, papers, crowdfunding — **no API keys required for readers**, same pattern as [follow-builders](https://github.com/zarazhangrui/follow-builders).

**Central feed**: [`.github/workflows/update-feed.yml`](.github/workflows/update-feed.yml) runs **`npm install`** in `scripts/`, then [`scripts/build-feed.mjs`](scripts/build-feed.mjs), **daily** / on push to `default-sources.json` or `scripts/*` / **manual run**. Sources: **RSS** (TechCrunch AI, VentureBeat AI, Sifted, …), **Hacker News**, **Reddit**, **GitHub Search** with **`minStars`** (default 500), optional **X** for **`aiLeaders` + `aiInvestors`** if repo secret **`TWITTER_BEARER_TOKEN`** is set. **PEVC noise control**: `filter` keywords + `feed.capsByType` in [`default-sources.json`](default-sources.json).

**Agent side**: [`SKILL.md`](SKILL.md) + [`prompts/`](prompts/) drive **sourcing pipeline**, **mapping delta**, and funding rows with **investors / amount / 未披露** rules — not “news only”.

## Quick install (Cursor)

**One link to share**: your GitHub repo URL, e.g. `https://github.com/<OWNER>/<REPO>.git` — users **clone** it into the skills folder (there is no separate “skill URL” besides the repo).

**macOS / Linux**

```bash
git clone https://github.com/<OWNER>/<REPO>.git ~/.cursor/skills/pevc-ai-radar
```

**Windows (PowerShell)**

```powershell
git clone https://github.com/<OWNER>/<REPO>.git "$env:USERPROFILE\.cursor\skills\pevc-ai-radar"
```

Replace `<OWNER>/<REPO>` with your published GitHub path.

## OpenClaw + Feishu

1. Install the skill the way **OpenClaw documents** (often still a **git clone** into that product’s global skills directory — use the **same repo URL** as above if paths differ from Cursor).
2. In OpenClaw, set a **daily schedule** that invokes this skill’s digest workflow (fetch central JSON → summarize with `prompts/` → **post the digest in Feishu**).
3. Readers only need the **public feed URL** below; **no** X/GitHub/news API keys on the Feishu side.

## Central feed (zero keys for users)

Default public URL (after publish):

`https://raw.githubusercontent.com/<OWNER>/<REPO>/main/feed-investor.json`

Optional env:

```bash
export FEED_URL="https://raw.githubusercontent.com/<OWNER>/<REPO>/main/feed-investor.json"
```

Local dev: point the agent at `feed-investor.json` in the repo root, or run:

```bash
cd scripts && node fetch-feed.mjs ../feed-investor.json
```

Rebuild feed locally (maintainer / debugging):

```bash
node scripts/build-feed.mjs
```

## Usage

In chat, say e.g. **“Run my PEVC AI radar digest”** or **“Set up pevc-ai-radar”**.

The skill will:

1. On **setup**: ask cadence, language, delivery — then **run the first digest immediately**.
2. On **schedule**: rely on OpenClaw (Feishu) or OS task scheduler for **daily** runs (Cursor IDE has no built-in cron).

## For friends

- Fork or clone this repo into `~/.cursor/skills/pevc-ai-radar` (or OpenClaw’s skills path).
- Optionally set `FEED_URL` to **your** maintained raw JSON.
- Do **not** commit Telegram/email tokens; keep local env or host secrets only.

## Repo layout

- `SKILL.md` — agent instructions  
- `default-sources.json` — maintainer config for automated pulls (HN / Reddit / GitHub); no script edit  
- `feed-investor.json` — central feed (updated by `update-feed` workflow)  
- `feed-investor.schema.json` — JSON shape  
- `prompts/` — summarization prompts  
- `sources.md` — curator source list + fallback hints  
- `scripts/fetch-feed.mjs` — GET JSON, no keys  
- `scripts/build-feed.mjs` — RSS + HN + Reddit + GitHub + optional X (needs `fast-xml-parser`; CI runs `npm install` in `scripts/`)  
- `prompts/mapping-market.md`, `prompts/sourcing-deals.md` — mapping & sourcing outputs  
- `.github/workflows/validate-feed.yml` — validates JSON on push  
- `.github/workflows/update-feed.yml` — daily feed rebuild + commit  

## Push this repo to GitHub

### Option A — Git (recommended for ongoing updates)

1. Create an **empty** repository on GitHub (no README) named e.g. `pevc-ai-radar`.
2. In this folder:

```bash
git init -b main
git add .
git commit -m "Initial commit: PEVC AI Radar skill"
git remote add origin https://github.com/<OWNER>/<REPO>.git
git push -u origin main
```

### Option B — No Git: upload the folder in the browser

Yes, you can **without installing Git**: create a new empty repo on GitHub, then use **Add file → Upload files**, drag in the **entire project tree** (all folders and files). GitHub preserves paths when you upload multiple files. Caveats: **large or frequent updates** are easier with Git or [GitHub Desktop](https://desktop.github.com/); **Actions** still run on the server and can **commit** updated `feed-investor.json` for you, so day-to-day you may never need local Git.

3. Replace every `<OWNER>/<REPO>` in README / `SKILL.md` / `sources.md` with your real path (or keep placeholders until you publish).
4. On GitHub → **Actions**, enable workflows if prompted; run **Update feed (daily)** once manually to refresh `feed-investor.json`.

## License

MIT — see [LICENSE](LICENSE).

## 中文说明

见 [README.zh-CN.md](README.zh-CN.md).
