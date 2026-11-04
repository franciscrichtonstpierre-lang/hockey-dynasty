# NHL 32-team ratings rollout plan

Date: 2026-11-04
Status: plan and validation gates only; no roster ratings changed.

## Scope
Apply one consistent 0–99 player-rating framework to all 32 NHL organizations, AHL affiliates, and prospects whose rights are held by those organizations. Preserve the existing 16 card attributes and separate potential from current OA. Goalies use a position-specific model.

## Mandatory phases
1. **Inventory:** enumerate all player records, team rights, active club, league, position, age, source status, and current 16 attributes. Reconcile duplicates and stale affiliations.
2. **Evidence:** collect multi-season official stats, deployment, advanced metrics, scouting reports and public game/manager ratings where accessible. Store source URL, retrieval date, season, sample size and confidence.
3. **Calibration:** use the ten-player pilot as fixtures; add at least one elite/middle/depth/prospect sample per position and goalie cohort.
4. **Model:** remove salary/cap-hit/draft-rank/body-measurement shortcuts from skill ratings. Separate offensive, defensive, physical, skating, endurance, faceoff, leadership and role traits.
5. **Validation:** unit tests, range checks (0–99), position-specific checks, regression checks, team distribution checks and human review of outliers.
6. **Dry run:** generate a before/after diff for every record; no writes to production.
7. **Approval and rollout:** only after reviewing the full diff, run a reversible batch update with backup and audit log. Re-run validation after each team batch.

## Hard constraints
- Never infer that a record is verified merely because an old workflow marked it so; retain evidence and verification status separately.
- Never change salary, cap hit, contract, roster assignment, team rights or UI fields as part of rating calibration.
- Never add or rename player-card attributes without explicit product approval.
- Keep unverified records flagged; do not silently fabricate ratings.
- No bulk writes until the owner approves the dry-run report.

## Deliverables
- Complete 32-team/AHL/prospect inventory.
- Evidence-backed per-player ratings and confidence.
- Before/after diff and outlier report.
- Passing automated test report.
- Reversible rollout log and backup reference.


## Global FI and goalie OA rules (2026-11-04 update)
- FI is Fighting only and is excluded from the OA formula for every skater and goalie, across NHL, AHL, junior, NCAA and European records.
- FI must be based on explicit fight-related evidence. Penalty minutes, body size, toughness reputation, and position are not substitutes for fight data. With no evidence, use a conservative low default and low confidence.
- Goalies retain all 16 existing card fields. Their non-FI attributes are estimated from goalie-specific performance indicators (save percentage, goals-against average, workload/games played, wins and shutouts) mapped to the shared card fields. Their OA is calculated from the non-FI attributes only.
- The shared card labels are retained to avoid changing the UI schema. A future UI enhancement may add goalie-specific labels/tooltips, but must not add/remove/rename fields without approval.
- These code changes are on the calibration branch only. No production roster batch has been run.
