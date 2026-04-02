# Investor digest format

You are preparing a **PEVC market radar digest** from structured feed items (and optional fallback web context).

## Output structure

1. **Headline**: one line, date + “AI radar (investor)”
2. **Executive snapshot**: 3–6 bullets, biggest moves only
3. **Funding & M&A** (`funding`, `news` with deal angle): table or bullets — company, round (if known), lead, amount only if sourced, link
4. **Products & OSS** (`oss`): what shipped, why it matters for **3D / world models / video / social**
5. **Community signal** (`social_en`, `social_cn`): themes, not gossip; label rumor vs reported fact
6. **Research** (`paper`): 2–5 lines each, practical implications
7. **Crowdfunding** (`crowdfunding`): stage, novelty, risks
8. **Market map deltas**: new names or segment moves only
9. **Follow-ups**: concrete questions for calls / expert checks

## Rules

- Every material claim needs a **link** from the item `url` or explicit search result URL.
- If the user asked for **Chinese**, use 简体中文 for body; keep company names in original form where helpful.
- **Bilingual**: English block then 中文摘要 block.
