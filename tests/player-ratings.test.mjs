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
    if (data.playerMetadata[id]?.status !== "manual_pilot_calibration_owner_reference") {
      const fights = Number(data.playerMetadata[id]?.fightingMajors || 0);
      const expectedFI = fights > 0 ? Math.max(0, Math.min(99, Math.round(20 + Math.min(79, fights * 12)))) : 10;
      assert.equal(ratings.FI, expectedFI, `FI must reflect fighting-specific evidence only for ${id}`);
    }
    assert.ok(!("POT" in ratings), `potential is separate for ${id}`);
    const metadata = data.playerMetadata[id];
    assert.ok(metadata?.source, `source for ${id}`);
    assert.ok(metadata?.status, `status for ${id}`);
    assert.ok(["high", "medium", "low", "very_low", "manual_calibration_anchor"].includes(metadata?.confidence), `valid evidence-based confidence label for ${id}`);
    assert.ok(metadata?.status && metadata?.method && metadata?.evidence, `rating provenance for ${id}`);
    if (metadata.sampleSize != null) {
      assert.ok(["low", "medium", "high"].includes(metadata.sampleConfidence), `sample confidence for ${id}`);
      assert.ok(Number.isInteger(metadata.sampleSize) && metadata.sampleSize >= 0, `sample size for ${id}`);
      if (metadata.sampleSize === 0) assert.equal(metadata.sampleConfidence, "low", `zero-game sample must have low confidence for ${id}`);
    } else assert.equal(metadata.sampleConfidence, null, `no sample confidence without a sample for ${id}`);
    assert.ok(RATING_ATTRIBUTES.every(key => Number.isInteger(ratings[key]) && ratings[key] >= 0 && ratings[key] <= 99), `complete rating range for ${id}`);
    assert.deepEqual(metadata.ratedAttributes, RATING_ATTRIBUTES, `rated attributes for ${id}`);
  }
});
