# Sources and curator checklist

Maintain **central** `feed-investor.json`. End users only **GET** the file.

## Automated daily build (this repo)

The workflow **Update feed (daily)** runs [`scripts/build-feed.mjs`](scripts/build-feed.mjs) on GitHub Actions. **You do not edit the script** to change subreddits or search queries: edit **[`default-sources.json`](default-sources.json)** at the repo root (HN limits, Reddit list, GitHub `searchQuery`, `maxTotalItems`, `enabled` flags). If that file is missing, the builder uses safe built-in defaults.

Default pull targets (overridable in JSON):

- **Hacker News** top stories (type `news`)
- **Reddit** hot JSON per configured subreddits (type `social_en`)
- **GitHub** repository search from `github.searchQuery` (type `oss`)

No API keys are required for these calls on the runner. Extend the script or add Actions secrets for **X**, paywalled APIs, or fragile scrapers — keys stay on the **maintainer side** only.

## Focus tags (for filtering)

Suggest tagging feed items with any of:

`ai_3d`, `world_models`, `ai_video`, `ai_social`, `avatar`, `generative`, `robotics_sim`, `funding`, `china`, `us`, `eu`, `oss`, `paper`, `crowdfunding`.

## RSS and news (English)

- TechCrunch — venture/AI categories (RSS URLs change; verify current feed on site).
- VentureBeat — AI section RSS.
- Sifted — Europe tech (RSS where available).
- The Verge / Wired — technology feeds (broader signal).

*Optional:* add RSS ingestion to `build-feed.mjs` or a separate maintainer job; keep reader-facing feed as **one JSON URL**.

## RSS and news (Chinese)

- 36氪、晚点 LatePost、机器之心、量子位 — use official RSS or curator summaries into `feed-investor.json` (WeChat often needs central curation).

## Reddit (public JSON, rate-limit friendly)

Subreddits useful for **early signal** (not investment advice):

- `r/startups`, `r/SaaS`, `r/MachineLearning`, `r/LocalLLaMA`, `r/artificial`, `r/computervision`, `r/GaussianSplatting`, `r/3Dprinting` (hardware overlap).

Pattern: `https://www.reddit.com/r/<name>/hot.json` — respect Reddit ToS; prefer low frequency. Add subreddit `{ "name": "...", "limit": N }` entries under `reddit.subreddits` in [`default-sources.json`](default-sources.json).

## X (Twitter)

- No stable anonymous API for end users. **Curate** high-signal accounts or links into `feed-investor.json` from the maintainer side (maintainer may use API keys in **GitHub Actions secrets**, not exposed to friends).

## 小红书 / 微信公众号

- Typically require maintainer-side collection or manual curation into `feed-investor.json`.
- Optional: RSS bridges (fragile); document bridge URLs in your fork if you use them.

## GitHub

- Topics: `gaussian-splatting`, `nerf`, `world-models`, `video-generation`, `diffusion`, `3d-generation`.
- Explore → Trending (by period) for optional maintainer scripts.
- **Search API** is used in `build-feed.mjs` (unauthenticated quota applies).

## Crowdfunding

- Kickstarter / Indiegogo: search keywords (AI video, 3D, neural, hologram, etc.); add top new projects to feed as `crowdfunding` items.

## Academic

- arXiv API: CS.CV, CS.GR, CS.LG with keyword queries.
- Semantic Scholar public API / Hugging Face Papers for **world models**, **video**, **3D**.

## Default FEED_URL for friends

After publishing:

`https://raw.githubusercontent.com/<OWNER>/<REPO>/main/feed-investor.json`

Replace `OWNER`/`REPO`; optionally pin branch or release asset.
