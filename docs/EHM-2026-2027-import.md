# EHM 2026-2027 rating import

This importer stages an **authorized** EHM roster export for review. It does not fetch Steam Workshop files, bypass access controls, or edit production data.

## Input contract

Run:

```sh
node scripts/import-ehm-ratings.mjs <export.json> <rights-manifest.json> [output.json]
```

The source JSON must contain an explicit overall value on the documented 0-99 or 1-100 scale. The exact source field is selected with `overallField` and its scale with `overallScale`; the importer refuses to invent an OA if either is missing. Example:

```json
{
  "season": "2026-2027",
  "players": [
    {
      "nhlPlayerId": 8478402,
      "name": "Example Player",
      "CA": 155,
      "PA": 180,
      "OA": 79,
      "attributes": {
        "SH": 16, "PL": 15, "ST": 14, "CH": 13, "PO": 14, "HI": 12,
        "SK": 16, "EN": 15, "PE": 14, "FA": 13, "LE": 15, "SR": 14,
        "FI": 8
      }
    }
  ]
}
```

Use the source's actual field names in `attributeMap` in the manifest when they differ. `attributeScale` documents whether the twelve mapped ratings are on 1-20, 1-99 or 1-100. `overallScale` must be 99 or 100, and `overallField` identifies the source overall field (default `OA`). CA and PA remain on EHM's native 1-200 scale in `ehmCA` and `ehmPA`; the current game-facing potential field is separately normalized to 0-99. The source overall is retained separately as `ehmSourceOverall` / `ehmOverall`; Hockey Dynasty's game-facing `overall` and `attributes.OA` are recalculated from the 12 non-FI attributes plus OFF and DEF, using the project's agreed formula. Raw source values remain in `ehmReference`.

## Rights manifest

The manifest must explicitly identify the dataset, author, season, source URL, attribute scale and field mapping, and include a `permission` object with all of:

- `commercialUseAllowed: true`
- `redistributionAllowed: true`
- `thirdPartyRightsVerified: true`
- `author`: rights holder's name
- `writtenPermissionReference`: a verifiable written permission reference

A free download, Steam subscription, attribution, or open-source editor license does not satisfy these requirements by itself. The importer stops if any permission field is missing or false.

## Safety and mapping rules

- Only players whose existing registry `currentLeague` is `NHL` are processed. All AHL, junior, NCAA, European and other non-NHL records remain untouched.
- Match by NHL player ID first; use an exact normalized name only when unique.
- Ambiguous and unmatched players are reported, never guessed.
- The import output is a preview file. It does not write to `registry.json`, team rosters, team assignments, positions, or deployed data.
- OFF = average(SH, PL, ST), DEF = average(CH, PO, HI), and OA = average of the twelve non-FI attributes plus OFF and DEF. FI is excluded. The original EHM overall, CA and PA are retained separately as source reference fields. Team, position, league and roster-placement fields are copied from the existing registry record.
- Review the preview and source coverage before any separately authorized production promotion.
