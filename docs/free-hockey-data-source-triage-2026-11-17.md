# Free hockey data source triage — commercial zero-budget build

Checked: 2026-11-17

## Decision rules
A package's software license is not a license for the data returned by an upstream API. Do not infer commercial permission from public accessibility, an open-source client, a CSV download, or a repository's code license.

## Current candidates

| Source | What it can contribute | Rights / freshness decision |
|---|---|---|
| OpenSport hockey.db | Legacy NHL entities and historical fixtures | Repository declares schema, data and scripts public domain. Dataset is old (2015-16 fixture tree); use only for legacy reference/fixtures after inspecting each file. Not a current roster feed. |
| ehlersio/nhl-contracts | Historical NHL contract records | Repository declares CC0; inspect individual file provenance and completeness before production use. |
| fastRhockey / SportsDataverse | Client software for NHL, AHL, CHL, PWHL, NCAA and European public endpoints; play-by-play, shifts, rosters, stats, EDGE wrappers | MIT applies to package code, not automatically to upstream NHL/ESPN/HockeyTech data. Treat as a connector/tool only; no production import until endpoint-specific rights are established. |
| PlayerWON | CSV datasets and original analytics | Provider policy may cover PlayerWON-controlled material; every dataset needs a provenance and third-party-rights decision. Current NHL dataset records remain review_required. |
| MoneyPuck | Shot-level, xG and goalie analytics | Public download is not commercial permission; exclude from commercial pipeline under current non-commercial terms. |
| Evolving Hockey | RAPM/GAR/xGAR and related metrics | Paid/personal-use restrictions; excluded under zero-budget commercial policy. |
| NHL EDGE / NHL APIs | Tracking and official NHL statistics | Public endpoint/package availability is not commercial reuse permission; exclude until a no-cost permission is explicitly documented. |

## Immediate engineering sequence
1. Import only legacy public-domain/CC0 files after per-file verification; preserve license and provenance metadata.
2. Use fastRhockey only for local research/testing until each upstream endpoint has an approved rights record.
3. Build independent rating formulas and xG/GSAx implementations from approved raw inputs; do not copy proprietary coefficients or tables.
4. Keep unverified data out of production while allowing unrelated development and verified sources to proceed.
5. Do not fabricate current 2026-27 rosters, prospects, contracts, or advanced metrics from incomplete legacy files.

## Important limitation
This inventory identifies promising free routes; it does not establish that every data item in those repositories is accurate, complete, current, or cleared for commercial use. The source-level decision must be revisited when a new dataset/file or upstream endpoint is selected.
