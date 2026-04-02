# Market mapping (segment view)

Use when the user asks for a **market map**, **赛道图谱**, or **mapping update** from the current feed items (and optional `~/.pevc-ai-radar/config.json` thesis).

## Inputs

- Parsed `feed-investor.json` items (all `type`s).
- User **thesis** / focus segments if available (e.g. AI 3D, world models, AI video, infra, China vs US).

## Output structure

1. **Scope**: date window + data sources (feed only vs fallback).
2. **Segment grid** (table or bullets):
   - **Segment** (e.g. world models, video gen, eval infra, robotics sim)
   - **Stage** (research / early product / scale-up) — inferred cautiously
   - **Representative players** (from items: company or repo name + link)
   - **Recent signal** (funding, release, benchmark, partnership) — one line + link
   - **White space** (underserved niches or missing layers) — hypothesis, not fact
3. **Delta** (if user provided a prior digest or “last week”): **new** names, **upgraded** signals, **faded** attention (no item this run).
4. **Risks**: where the map is thin (single-source, rumor-heavy).

## Rules

- Do **not** invent companies or rounds; every named entity should trace to a feed `url` or explicit search you cite.
- Prefer **investor-relevant** segmentation (buy/build/partner, infra vs app, geo, open vs closed).
- Keep **non-financial-advice** tone; label inference vs sourced fact.
