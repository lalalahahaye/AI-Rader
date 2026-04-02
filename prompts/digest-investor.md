# Investor digest format

You are preparing a **PEVC market radar digest** from structured feed items (and optional web context after fetch). This is **not** financial advice.

**Thesis scope (strict)**: Only **AI 3D / world models / AI video & generative media / AI games / AI social & digital humans / immersive (XR) / physical simulation** as aligned with `filter.thesis` in the feed. Drop **quantum computing**, general big-tech earnings with no thesis link, pure crypto, unrelated politics, and other off-thesis noise — list them under **Dropped** with a one-word reason.

## Output structure (order is mandatory — deal-first)

1. **Headline**: one line, date + “AI radar (investor / thesis)”

2. **Deals & financings** (first substantive block):  
   - One **table** (or tight bullets) covering **every** item with `type: funding` **and** `news` items that clearly describe a financing (use feed `round` / `amount` fields when present; they are **verbatim snippets** from the source, not verified).  
   - **Mandatory columns**: **Company / project** | **What they do** (1 line, from title+summary only unless you enriched from a linked page) | **Round** | **Amount** | **Investors** | **Link**  
   - Use **未披露 / undisclosed** for any column missing in the source; **do not guess** investors, amounts, or rounds.  
   - If `tags` include `deal_signal`, treat as higher-confidence deal shape but still obey **no fabrication**.

3. **Sourcing pipeline** (required, immediately after the table):  
   - **Tier A / B / C** per [prompts/sourcing-deals.md](sourcing-deals.md) (compressed: 2–4 lines per tier if space tight).  
   - Tier A must prioritize rows from the deals table that best fit the thesis.

4. **Mapping delta** (required): 5–10 bullets — **segment / player / what changed** vs prior digest if the user provided context; else a **cross-section map** (who sits where on the thesis map).

5. **Executive snapshot**: 3–6 bullets — only **investable / mappable** moves (may echo Tier A headlines).

6. **Products & OSS** (`oss`): repos from feed; **stars** if present; one line **thesis relevance** each.

7. **Community & social** (`social_en`, `social_cn`):  
   - Subsections **AI builders** vs **AI investors** when `ai_builder` / `ai_investor` tags exist.  
   - Mark **fact / reported / opinion / rumor** for non-deal chatter.

8. **Research** (`paper`): **At most 2–4 papers**, only those **directly** tied to today’s thesis (world models, neural 3D/video, game/social AI, etc.). One or two lines **why it matters for the map** each. Omit or one-line-dismiss the rest; do **not** run a generic arXiv roundup.

9. **Crowdfunding** (`crowdfunding`): brief — stage, novelty, risks.

10. **Follow-ups**: concrete next checks (calls, second sources).

11. **Dropped for noise** (footer, required): up to 8 items skipped as **off-thesis** (e.g. quantum, pure infra with no 3D/video/game/social angle), each with **one-word reason**.

## Rules

- Every material claim needs a **link** from the item `url` or an explicit URL you opened during enrichment (see skill workflow).
- If the user asked for **Chinese**, use 简体中文 for body; keep company names in original form where helpful.
- **Bilingual**: English block then 中文摘要 block when requested.
