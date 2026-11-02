import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { emptyRatings, hasAnyRating, normalizeRatings, RATING_ATTRIBUTES } from "../scripts/lib/player-ratings.mjs";

test("shared model has exactly the required sixteen attributes in order", () => {
  assert.deepEqual(RATING_ATTRIBUTES, ["FI","SH","PL","ST","CH","PO","HI","SK","EN","PE","FA","LE","SR","OFF","DEF","OA"]);
  assert.deepEqual(Object.keys(emptyRatings()), RATING_ATTRIBUTES);
});

test("keeps absent or invalid ratings blank and normalizes valid values to 0–99 integers", () => {
  assert.deepEqual(normalizeRatings({ FI: 15.4, OA: 99, EXTRA: 70, SH: 100 }), {
    FI:15,SH:null,PL:null,ST:null,CH:null,PO:null,HI:null,SK:null,EN:null,PE:null,FA:null,LE:null,SR:null,OFF:null,DEF:null,OA:99
  });
  assert.equal(hasAnyRating({}), false);
});

test("every generated NHL rating has exactly the shared schema and individual provenance", () => {
  const data = JSON.parse(readFileSync(resolve("data/ratings.json"), "utf8"));
  assert.deepEqual(data.attributes, RATING_ATTRIBUTES);
  assert.ok(data.playerMetadata);
  for (const [id, ratings] of Object.entries(data.players)) {
    assert.deepEqual(Object.keys(ratings), RATING_ATTRIBUTES, `attribute keys for ${id}`);
    assert.ok(!("POT" in ratings), `potential is separate for ${id}`);
    const metadata = data.playerMetadata[id];
    assert.ok(metadata?.source, `source for ${id}`);
    assert.ok(metadata?.status, `status for ${id}`);
    assert.equal(metadata?.confidence, "low", `proxy estimate confidence for ${id}`);
    assert.ok(["low", "medium", "high"].includes(metadata?.sampleConfidence), `sample confidence for ${id}`);
    assert.ok(Number.isInteger(metadata?.sampleSize) && metadata.sampleSize > 0, `sample size for ${id}`);
    assert.ok(RATING_ATTRIBUTES.every(key => ratings[key] == null || (Number.isInteger(ratings[key]) && ratings[key] >= 0 && ratings[key] <= 99)), `rating range for ${id}`);
    assert.deepEqual(metadata.ratedAttributes, RATING_ATTRIBUTES.filter(key => ratings[key] != null), `rated attributes for ${id}`);
  }
});
