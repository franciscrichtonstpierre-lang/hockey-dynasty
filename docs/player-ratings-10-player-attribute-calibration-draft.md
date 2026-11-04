# Ten-player attribute calibration — provisional

Date: 2026-11-04
Branch: `ratings/pilot-calibration-10-players`

**Important:** These are explicit provisional model targets for human review, not verified scouting grades. FI means Fighting and is a standalone attribute; it is excluded from every OA calculation. All 16 existing fields are retained. Goalies require a dedicated attribute schema; skater fields are intentionally left null for Lukas Dostal rather than fabricating skater ratings. OA is a provisional summary target and must be recalculated by the production position-aware formula before release.

| Player | FI | SH | PL | ST | CH | PO | HI | SK | EN | PE | FA | LE | SR | OFF | DEF | OA |
|---|FI|SH|PL|ST|CH|PO|HI|SK|EN|PE|FA|LE|SR|OFF|DEF|OA|
|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| Connor McDavid | 65 | 96 | 99 | 88 | 94 | 98 | 91 | 99 | 97 | 94 | 65 | 96 | 99 | 99 | 92 | 98 |
| Nathan MacKinnon | 65 | 98 | 95 | 92 | 96 | 97 | 95 | 98 | 98 | 95 | 65 | 94 | 98 | 98 | 91 | 97 |
| Gavin McKenna | 20 | 76 | 84 | 55 | 64 | 65 | 57 | 82 | 76 | 70 | 45 | 65 | 75 | 76 | 62 | 75 |
| Ryan Leonard | 45 | 82 | 78 | 83 | 84 | 80 | 86 | 83 | 85 | 82 | 55 | 82 | 84 | 83 | 82 | 83 |
| Cutter Gauthier | 25 | 91 | 80 | 78 | 79 | 76 | 77 | 86 | 85 | 78 | 45 | 75 | 86 | 88 | 73 | 85 |
| Cole Caufield | 15 | 97 | 87 | 65 | 73 | 82 | 61 | 91 | 88 | 80 | 45 | 75 | 94 | 94 | 70 | 89 |
| Josh Anderson | 55 | 76 | 68 | 86 | 82 | 73 | 91 | 84 | 86 | 77 | 48 | 76 | 80 | 76 | 78 | 77 |
| Lane Hutson | 15 | 78 | 96 | 54 | 78 | 91 | 57 | 94 | 91 | 85 | 55 | 80 | 91 | 89 | 82 | 89 |
| Nikita Zadorov | 85 | 55 | 62 | 91 | 88 | 75 | 95 | 68 | 84 | 77 | 40 | 82 | 72 | 61 | 84 | 79 |
| Lukas Dostal | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | 87 |

## Interpretation and guardrails
- Ratings use 0–99. OA describes current ability; potential remains a separate field and is not included in this table.
- These targets are deliberately varied by role: McDavid/MacKinnon elite, McKenna prospect-level current ability, Caufield an elite finisher, Hutson an offensive defenceman, Zadorov a physical defensive defenceman, Anderson a power forward.
- Do not derive DEF from point totals, ST from height/weight, or OA from salary, cap hit, or draft position.
- The 10 rows are fixtures for calibration discussion, not authority to mass-update the player registry.
- Before production use: validate each row against current-season statistics, multi-year usage, advanced metrics, scouting reports and accessible EHM/SHM/NHL-game comparisons. Record URLs, dates, sample sizes and confidence for each attribute.
- For goalies, implement a separate goalie-rating model and preserve the existing player-card contract; do not substitute null skater attributes into production records.
- Run the test suite and inspect the generated diff. No NHL/AHL/prospect bulk update is authorized by this document.

## FI / Fighting rule
FI is the fighting attribute only. It must be estimated from explicit fight-related evidence (fights/fighting majors or a verified fighting rating), not assists, points, physical size, or generic penalty minutes. When no reliable evidence exists, use a conservative low-confidence default and mark it unverified. FI is excluded from OA and all overall-rating aggregation. Josh Anderson/Zadorov may have higher FI only when supported by actual fighting evidence; Cole Caufield should remain low absent such evidence.
