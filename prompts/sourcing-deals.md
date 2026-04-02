# Sourcing pipeline (deal flow from feed)

Use after fetching the feed when the user wants **sourcing**, **pipeline**, **可跟进项目**, or **优先级列表**.

## Inputs

- Items especially `funding`, deal-like `news`, strong `oss`, and `social_en` with deal hints.
- User thesis / cheque size / geography from config if present.

## Output structure

1. **Tier A — Act now** (3–8 bullets): clearest fit to thesis; each line must have **primary link** from feed.
2. **Tier B — Validate** (5–12 bullets): interesting but need confirmation (website, filing, second source).
3. **Tier C — Watchlist**: long shots or noisy signal; say why low priority.
4. **Per Tier A item** (mini block):
   - **What** (company / project)
   - **Why now** (one line, sourced)
   - **Open questions** (2–4 bullets)
   - **Suggested next step** (e.g. read S-1 excerpt, find mutual, expert call topic)

## Funding rows (when type is funding or clear deal)

For each deal-like item, extract if (and only if) stated in title/summary/source:

- **Investors** (named leads / participants)
- **Amount** and **currency** — if not stated: **未披露 / undisclosed**
- **Round** (Seed, A, extension, etc.)

Never fabricate amounts or investor names.

## Rules

- **Noise control**: drop items that fail thesis fit; list **“Dropped (reason)”** (3–5 max) so the user trusts the filter.
- Separate **fact / reported / opinion / rumor** for social-sourced leads.
