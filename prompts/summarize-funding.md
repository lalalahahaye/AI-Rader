# Summarize funding / deal news

For each `funding` or deal-like `news` item:

- **Company** (and parent if relevant)
- **Round / instrument** (Seed, A, strategic, etc.) — only if stated in source; else **未披露 / not stated**
- **Amount** — exact phrase from source with currency; if missing: **未披露 / undisclosed** (never estimate)
- **Investors** — **every name** must appear in the source text; if none named: **未披露 / not disclosed**
- **Stated use of funds** (one line) if present
- **Thesis fit**: map to AI 3D, world models, AI video, AI social/avatar, infra, etc.
- **Risks / open questions** (2–3 bullets)
- **Primary link**: item `url`

If title implies a deal but body lacks investors/amount, still output **未披露** for missing fields.

Avoid valuation speculation unless the source states it.
