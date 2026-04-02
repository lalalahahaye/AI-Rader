# Sourcing pipeline (deal flow from feed)

Use after fetching the feed when the user wants **sourcing**, **pipeline**, **可跟进项目**, or **优先级列表**.

## Inputs

- Items especially `funding`, deal-like `news`, strong `oss`, and `social_en` with deal hints.
- User thesis / cheque size / geography from config if present.

## Output structure (keep compact when embedded in daily digest)

1. **Tier A — Act now** (3–6 **one-line** bullets): clearest thesis fit; each line ends with **link** from feed.
2. **Tier B — Validate** (3–8 one-liners): needs confirmation; link each.
3. **Tier C — Watchlist** (2–5 one-liners): low priority + half-line why.
4. **Per Tier A** (only if user asks for detail): mini block — What / Why now (1 line) / Open questions (2 bullets max) / Next step (1 line).

In the **default daily digest**, tiers **A–C only** — skip per-item mini blocks unless asked.

## Funding rows (when type is funding or clear deal)

For each deal-like item, extract if (and only if) stated in title/summary/source:

- **Investors** (named leads / participants)
- **Amount** and **currency** — if not stated: **未披露 / undisclosed**
- **Round** (Seed, A, extension, etc.)

Never fabricate amounts or investor names.

## Rules

- **Noise control**: drop items that fail thesis fit (e.g. **quantum computing**, pure crypto, unrelated politics); list **“Dropped (reason)”** (3–8 max) so the user trusts the filter.
- Separate **fact / reported / opinion / rumor** for social-sourced leads.
