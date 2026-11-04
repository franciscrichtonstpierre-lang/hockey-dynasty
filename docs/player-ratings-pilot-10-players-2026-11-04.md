# Hockey Dynasty — calibration pilot: 10 reference players

Date: 2026-11-04  
Status: **working calibration proposal — not yet applied to player records**

## Purpose

Calibrate the 0–99 scale against ten deliberately different player profiles before applying a consistent pass across all NHL organizations, AHL players, and prospects. These are provisional target bands for review and simulation testing, not claims that a scouting service has published these exact grades.

The existing 16 fields remain unchanged: FI, SH, PL, ST, CH, PO, HI, SK, EN, PE, FA, LE, SR, OFF, DEF, OA. Potential remains a separate value and must not be folded into OA. Goaltenders require a separate role-specific rating path.

## Pilot group and provisional overall bands

| Player | Profile represented | Provisional OA |
|---|---|---:|
| Connor McDavid | generational, elite two-way offensive centre | 97–98 |
| Nathan MacKinnon | elite high-volume scoring centre | 96–97 |
| Gavin McKenna | elite young prospect; projection must not equal NHL readiness | 74–75 |
| Ryan Leonard | young NHL forward with strong competitive / power profile | 82–84 |
| Cutter Gauthier | young scoring winger with high-end finishing potential | 84–86 |
| Cole Caufield | established elite goal scorer | 88–90 |
| Josh Anderson | middle-six power forward; physical play and speed matter, not just points | 76–78 |
| Lane Hutson | elite puck-moving offensive defenceman | 87–89 |
| Nikita Zadorov | large defensive defenceman; defensive and physical value distinct from offence | 77–80 |
| Lukas Dostal | established starting-calibre goaltender; use goalie-specific attributes | 85–88 |

## Calibration rules

1. OA represents current ability, not ceiling, draft pedigree, salary, or reputation alone.
2. Potential is stored independently. A prospect may have a modest current OA and a much higher potential.
3. Use several evidence families: NHL and other league statistics, deployment and role, scouting reports, tracking/advanced metrics where available, and video-game / manager-game ratings only as secondary cross-checks.
4. Do not infer player quality from salary or draft position alone.
5. Do not use height or weight as a shortcut for player ability. Physical play is assessed through hockey actions and role, not body measurements.
6. Do not turn a single season's point totals into all 16 ratings. Offensive production, defensive impact, skating, physicality, endurance, faceoffs, leadership, and role-specific skills need separate evidence.
7. For goalies, do not infer skater skills. Use goalie-specific evidence and map only to the existing 16-field schema where the game requires a shared card.
8. Keep confidence and evidence provenance visible. A model-generated estimate must never be labelled as a verified scouting grade.

## Evidence snapshot used for the first pass

The completed 2025–26 NHL regular season provides a useful offensive anchor: McDavid recorded 138 points (48 goals, 90 assists) in 82 games; MacKinnon recorded 127 points (53 goals, 74 assists) in 80 games. Caufield recorded 51 goals and 88 points in 81 games, while Hutson recorded 78 points (12 goals, 66 assists) in 82 games. Those totals support elite offensive grades but do not, by themselves, determine defensive or physical attributes.

Sources:
- Hockey-Reference, 2025–26 NHL skater statistics: https://www.hockey-reference.com/leagues/NHL_2026_skaters.html
- NHL.com, 2025–26 season statistics: https://www.nhl.com/stats/fr/skaters?gameType=2&reportName=summary&reportType=season&seasonFrom=20252026&seasonTo=20252026&sort=timeOnIcePerGame%2Ca_gamesPlayed
- NHL 2025–26 Season in Review (official league statistical summary): https://media.d3.nhle.com/image/private/t_document/prd/m7vwkuwqrbodswneqkwb.pdf

## Required implementation checks before applying the pilot

- Confirm each player's canonical registry record and current organization/league assignment.
- Build a source sheet per player, separating observed facts from judgement-based grades.
- Assign all 16 fields, not only OA, with a written rationale for meaningful strengths/weaknesses.
- Verify the goalie path with Lukas Dostal and at least two additional goalies before scaling.
- Run the rating and registry tests; check that no attribute leaves the 0–99 range and no extra attribute is introduced.
- Compare resulting team-strength distributions so the scale is consistent across all 32 NHL clubs and the AHL/prospect pool.
- Do not overwrite source-verified values without an explicit provenance trail.

## Known model risks to resolve

The current cross-league model contains proxy signals that should not be treated as scouting evidence: salary can influence profile OA, draft rank can influence estimates, and height/weight can influence physical attributes. The next implementation pass should remove those shortcuts or constrain them to transparent low-confidence priors, then add explicit calibration fixtures for this ten-player pilot. Existing model estimates are not verified scouting grades.
