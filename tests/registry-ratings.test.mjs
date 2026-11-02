import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { emptyRatings, hasAnyRating, normalizeRatings, RATING_ATTRIBUTES } from "../scripts/lib/player-ratings.mjs";

test("registry retains the exact shared schema and never fills missing ratings with age/position defaults", () => {
  const registry = JSON.parse(readFileSync(resolve("data/players/registry.json"), "utf8"));
  assert.ok(registry.players.length > 0);
  for (const player of registry.players) {
    assert.deepEqual(Object.keys(player.attributes), RATING_ATTRIBUTES, `attribute keys for ${player.id}`);
    assert.deepEqual(player.attributes, normalizeRatings(player.attributes), `range and shape for ${player.id}`);
    if (hasAnyRating(player.attributes)) {
      assert.ok(player.ratingSource, `source for ${player.id}`);
      assert.ok(player.ratingStatus, `status for ${player.id}`);
      assert.ok(player.ratingConfidence, `confidence for ${player.id}`);
      assert.deepEqual(player.ratedAttributes, RATING_ATTRIBUTES.filter(key => player.attributes[key] != null), `rated attributes for ${player.id}`);
    } else {
      assert.deepEqual(player.attributes, emptyRatings(), `missing ratings remain blank for ${player.id}`);
      assert.equal(player.ratingStatus, "unrated");
      assert.equal(player.overall, null);
    }
    assert.ok(!("POT" in player.attributes), `potential is a separate field for ${player.id}`);
  }
});
