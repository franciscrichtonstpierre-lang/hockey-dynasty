# UHM player-rating reference framework

Status: design baseline only. This document does not claim that external ratings have already been imported or that player ratings have been recalculated.

## Objective

Produce a consistent 0-99 current-ability card and a separate 0-99 potential estimate for NHL, AHL, ECHL, junior, NCAA and European-league players. Keep the existing UHM fields: FI, SH, PL, ST, CH, PO, HI, SK, EN, PE, FA, LE, SR, OFF, DEF, OA.

## Evidence hierarchy

1. **Official competition data**: league/team statistics, game appearances, ice time, special-teams usage, position, goalie workload and results. Prefer the current season plus the previous two completed seasons; shrink small samples toward the league/role average.
2. **Independent player databases and scouting**: Elite Prospects profiles/statistics and published scouting reports/rankings. Store source URL, retrieval date, season, player identity and whether a value is a statistic, observation or projection.
3. **Public rating systems**: EHM database/editor values, SHM community/player ratings, NHL game ratings and other documented public ratings. Treat each as a separate opinion, not as ground truth. Never infer unavailable/private values.
4. **Context**: age, position, league strength, role, deployment, injuries only when reliably documented, draft position and physical measurements. Salary is not a skill rating and must not be used as a primary ability signal.

## Cross-scale normalization

- Convert EHM's 1-20 attributes linearly to the 0-99 display scale only as a first-pass normalization; retain the original scale and source.
- EHM Current Ability and Potential Ability are distinct 1-200 concepts and must not be conflated with a 1-20 attribute or directly treated as an NHL-style OVR. Calibrate them against player/league reference anchors before using them.
- NHL-style 1-99 ratings can be compared directly only after confirming the attribute definition and season.
- SHM ratings must be mapped attribute-by-attribute from its published scale and documented definitions. If the scale or provenance is unknown, keep the value as an uncalibrated reference rather than blending it.
- Never average unlike concepts (e.g. overall ability, potential, speed, and points-per-game).

## Attribute evidence mapping

- FI / FA: faceoff percentage and volume, position/usage, plus scouting observations.
- SH / OFF: goals, shot volume and quality where available, shooting rates, offensive role, and scouting.
- PL: assists, primary assists where available, chance creation and playmaking observations.
- ST / HI / CH: measured size is context only; combine hits, puck battles, blocks and scouting observations. Do not equate height/weight with strength or checking skill.
- PO / PE / LE: pressure/decision-making/discipline cannot be reliably inferred from points or penalty minutes alone; require scouting or explicitly low-confidence estimates.
- SK / EN / SR: skating tracking, workload, shifts/TOI and repeated-season availability; avoid equating games played with durability.
- DEF: defensive deployment, penalty-kill role, shot/chance suppression and individual scouting; plus/minus alone is not an adequate defensive measure.
- OA: calibrated composite of position-specific attributes and role, not a direct copy of points or league average.
- Goalies require a separate goalie model; do not manufacture skater skill attributes from save percentage.

## Potential

Potential is a forecast of future ability, not current OA plus a fixed age bonus. It should combine age/development stage, multi-season performance relative to league and age peers, draft/scouting evidence, role projection and uncertainty. Keep current ability and potential separate. A prospect with limited evidence should receive a broad/low-confidence estimate, not a falsely precise ceiling. Verified scouting values must retain their source and must not be overwritten by the model.

## Required provenance on every rating

Store: source type, source URL or dataset ID, retrieval date, season, attribute(s) supported, sample size, method/version, confidence, and which attributes remain modeled. A rating with no traceable evidence must be labelled as a model estimate.

## Safety gates before publishing a recalculation

1. Build an identity-matched source ledger; do not join on name alone where ambiguity exists.
2. Report coverage by league, team, position and attribute.
3. Compare a representative benchmark set (elite, middle-six/top-four, depth, AHL regular, junior prospect, goalie) against the current values.
4. Flag large unexplained changes and source conflicts for review.
5. Run validation and regression tests; preserve a dated backup of the current ratings.
6. Do not publish a bulk recalculation until the benchmark review passes.

## Public reference starting points

- EA SPORTS NHL 27 attribute guide: https://help.ea.com/en/articles/nhl/nhl-attributes-guide/
- EHM attribute and CA/PA documentation: https://github-wiki-see.page/m/archibalduk/ehmtheblueline/wiki/Attributes-%28players-and-staff%29
- WebSim Hockey player evolution documentation: https://beta.websimhockey.com/Info/PlayersEvolution
- Elite Prospects developer API: https://developer.eliteprospects.com/
- Eat.Sleep.Sim ratings methodology (public PDF): https://www.simhockeyfans.com/eat.sleep.sim.ratings.pdf

These sources describe different systems and are not interchangeable. Access terms, licenses and attribution requirements must be checked before importing any external dataset.
