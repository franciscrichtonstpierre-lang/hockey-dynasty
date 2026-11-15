# Hockey Dynasty — GM Connected-inspired player rating methodology

Date: 2026-11-15  
Status: implementation specification; **not yet applied to production ratings**

## Objective

Use the public-data approach described by GM Connected as the benchmark for Hockey Dynasty: combine reliable on-ice performance data, advanced analytics and player-tracking evidence rather than treating points, plus/minus or draft reputation as a complete measure of ability.

GM Connected publicly identifies Evolving Hockey, MoneyPuck and NHL EDGE as inputs to its ratings. Its exact formula and private data pipeline are not public. Hockey Dynasty must not claim to reproduce that proprietary formula; this document specifies an independent, auditable model using lawfully accessible public data.

## Non-negotiable project constraints

- Keep the existing 0–99 scale and the exact 16 fields: FI, SH, PL, ST, CH, PO, HI, SK, EN, PE, FA, LE, SR, OFF, DEF, OA.
- Keep current ability (OA) separate from potential. Potential is not an input to OA.
- FI means Fighting only. It is excluded from OFF, DEF and OA and must use fight-specific evidence only.
- Keep separate rating paths for forwards, defencemen and goaltenders. Role/archetype adjustments may refine skater ratings, but must not erase position-specific differences.
- Retain each player's source, source URL, date checked, season, sample size, method, confidence and evidence status.
- Preserve verified/manual records and existing calibration overrides unless a documented review explicitly replaces them.
- Never use salary, cap hit, contract status, draft position, height or weight as a direct measure of current ability. Draft/scouting information may inform a separately labelled potential estimate, not OA.
- Do not present statistical estimates as verified scouting grades.

## Evidence hierarchy

1. **Direct on-ice performance and tracking:** NHL EDGE measures where published; MoneyPuck expected-goal and shot-quality data; Evolving Hockey public analytics where accessible and permitted.
2. **Official league statistics and deployment:** NHL Stats, AHL/CHL/NCAA/European league feeds, ice time, special-teams usage, faceoffs and goalie workload.
3. **Independent scouting evidence:** multiple dated reports for traits that box-score and tracking data cannot measure reliably, especially decision-making, positioning, compete, leadership and prospect projection.
4. **Video-game / manager-game ratings:** comparison anchors and sanity checks only, never the sole source of a rating.

Respect source terms and redistribution rights. Store source references and derived values where redistribution of raw source data is not permitted. MoneyPuck states that its published downloads are free for non-commercial use and asks users to contact it for other purposes; do not assume that a public download grants commercial redistribution rights. Evolving Hockey exposes advanced metrics such as RAPM, GAR and xGAR, while CSV downloads and some tools are subscription features; do not automate access to subscriber-only data without authorized access. NHL EDGE publishes public tracking comparisons and leaderboards (including skating speed, bursts, distance, shot speed/location and zone time); record the exact metric, season and retrieval date, and do not mistake a top-10 leaderboard for a complete player dataset.

## Metric families and attribute evidence

### Skaters

- **OFF:** even-strength and all-situations individual expected goals, goals above expected, individual shot quality, goals/60, primary points/60 and shot generation. Separate power-play production from five-on-five production.
- **DEF:** on-ice expected goals against and expected-goal differential, shot-attempt suppression, defensive-zone deployment, penalty-kill usage and repeatable defensive impact. Treat raw plus/minus as a weak contextual signal, never the core defensive measure.
- **SH:** individual expected goals, shot volume, shot location/quality and goals above expected. Do not equate raw goals alone with shooting skill.
- **PL:** primary assists, primary points, controlled entries/exits and passing or chance-creation metrics when available. Total assists alone are an incomplete proxy.
- **SK:** NHL EDGE skating speed, acceleration/bursts and repeated high-intensity skating measures when available. Do not infer skating from height, weight, points or ice time.
- **CH / HI / ST:** use the exact in-game attribute definitions after confirming their UI labels; support them with relevant repeatable hockey actions (checks, puck battles, blocks, net-front work and physical engagement). Body size alone is not evidence.
- **EN / PE / FA / LE / SR:** do not manufacture precise grades from unrelated box-score fields. Use only relevant deployment, faceoff, discipline, availability or independently documented scouting evidence; otherwise retain a clearly marked low-confidence estimate pending better evidence.
- **FI:** fighting-specific event evidence only; penalty minutes, body size and ordinary physical play do not establish fighting skill.

### Goaltenders

Use a dedicated model, not skater formulas. Prioritize goals saved above expected, shot-quality-adjusted save percentage, high-danger performance, rebound control where measurable, workload and performance stability. Wins and raw goals-against average are context, not primary skill measures. Map goalie evidence to the shared 16-field card only after confirming the game's goalie attribute semantics; never imply that goalie statistics directly measure skater skills.

## Normalization and calibration

- Compare players within position, league, season and appropriate usage cohorts before mapping percentiles to 0–99.
- Stabilize small samples toward a neutral prior; expose sample size and confidence. A short hot streak must not create an elite rating.
- Adjust for league strength only through a documented, testable cross-league calibration; do not hard-code an unexplained league prestige bonus.
- Separate five-on-five, power play and penalty kill where source data permits.
- Avoid double-counting correlated signals (for example points, goals and expected goals) by grouping them into evidence families before combining them.
- Calculate OA from position-specific attribute weights. FI and potential are excluded. The exact weight tables must be versioned, tested and calibrated against representative players before a full production run.
- Keep unknown/unmeasured traits distinct from measured traits. A complete game card may require a model estimate, but its metadata must identify which fields are inferred and why.

## Calibration and rollout gates

1. Confirm the exact displayed definitions of all 16 attributes in the application.
2. Build source-backed examples for the existing ten-player pilot, including McDavid, MacKinnon, McKenna, Leonard, Gauthier, Caufield, Anderson, Hutson, Zadorov and Dostal.
3. Add several goalies, defensive defencemen, offensive defencemen, two-way forwards, depth players and prospects from different leagues.
4. Compare the resulting distributions across all 32 NHL organizations, AHL, ECHL, NCAA, junior and European leagues.
5. Test ranking stability, small-sample behaviour, role differences, position-specific OA, FI exclusion and potential independence.
6. Run the complete repository test suite and database validation; inspect the generated diff and coverage report.
7. Only then promote the versioned model. Do not mass-replace existing ratings or verified overrides before all gates pass.

## Current implementation gap

The existing model has useful cross-league coverage and provenance, but its current statistical path leans heavily on points, goals, assists, plus/minus, games played and profile fallbacks. The repository does not yet contain an integrated Evolving Hockey / MoneyPuck / NHL EDGE advanced-metric feed. The current model therefore cannot honestly be described as GM Connected-level yet. Adding a new formula without adding and validating those inputs would only create more elaborate guesses.

## First verified cleanup on the working branch

The existing code had a semantic mismatch: the rating generator and calibration rules treated FI as fighting and FA as faceoffs, while the player editor and development engine treated FI as faceoffs and FA as aggression. The working branch now aligns the editor labels and field-name mapping with the canonical data model, excludes FI from the development engine's OA calculation, and moves FI/FA references in the training focus pools to match their meanings. A regression test was added for the label mapping and another for FI exclusion from OA. These changes are isolated on `ratings/gm-connected-methodology-v1`; production `main` ratings and player records have not been bulk-modified.
