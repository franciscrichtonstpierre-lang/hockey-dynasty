# EHM 2026-2027 rating import

This importer stages an **authorized** EHM roster export for review. It does not fetch Steam Workshop files, bypass access controls, or edit production data.

## Input contract

Run:

```sh
node scripts/import-ehm-ratings.mjs <export.json> <rights-manifest.json> [output.json]
```

The source JSON must contain:

```json
{
  "season": "2026-2027",
  "players": [
    {
      "nhlPlayerId": 8478402,
      "name": "Example Player",
      "CA": 155,
      "PA": 180,
      "OA": 15,
      "attributes": {
        "SH": 16, "PL": 15, "ST": 14, "CH": 13, "PO": 14, "HI": 12,
        "SK": 16, "EN": 15, "PE": 14, "FA": 13, "LE": 15, "SR": 14,
        "FI": 8
      }
    }
  ]
}
```

Use the source's actual field names in `attributeMap` in the manifest when they differ. `attributeScale` must document whether the twelve mapped ratings are on 1-20, 1-99 or 1-100. CA and PA must be on EHM's 1-200 ability scale. The importer converts those values to the game's 0-99 range and preserves raw CA, PA, OA and attributes in `ehmReference`.

## Rights manifest

The manifest must explicitly identify the dataset, author, season, source URL, attribute scale and field mapping, and include a `permission` object with all of:

- `commercialUseAllowed: true`
- `redistributionAllowed: true`
- `thirdPartyRightsVerified: true`
- `author`: rights holder's name
- `writtenPermissionReference`: a verifiable written permission reference

A free download, Steam subscription, attribution, or open-source editor license does not satisfy these requirements by itself. The importer stops if any permission field is missing or false.

## Safety and mapping rules

- Only players whose existing registry `currentLeague` is `NHL` are processed.
- Match by NHL player ID first; use an exact normalized name only when unique.
- Ambiguous and unmatched players are reported, never guessed.
- The import output is a preview file. It does not write to `registry.json`, team rosters, team assignments, positions, or deployed data.
- The Hockey Dynasty card recalculates OFF = average(SH, PL, ST), DEF = average(CH, PO, HI), and OA = average of the twelve individual mapped attributes plus OFF and DEF. FI is excluded. The source's raw EHM OA is retained for audit in `ehmReference.rawOA`; it is not allowed to override the agreed Hockey Dynasty OA formula.
- Review the preview and source coverage before any separately authorized production promotion.
