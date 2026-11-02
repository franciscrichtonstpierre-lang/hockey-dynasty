import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { normalizeRatings, RATING_ATTRIBUTES } from "../scripts/lib/player-ratings.mjs";

test("every registry player has the complete shared card and explicit estimate provenance", () => {
  const registry = JSON.parse(readFileSync(resolve("data/players/registry.json"), "utf8"));
  assert.ok(registry.players.length > 0);
  const uniqueCards = new Set();
  for (const player of registry.players) {
    assert.deepEqual(Object.keys(player.attributes), RATING_ATTRIBUTES, `attribute keys for ${player.id}`);
    assert.deepEqual(player.attributes, normalizeRatings(player.attributes), `range and shape for ${player.id}`);
    assert.ok(RATING_ATTRIBUTES.every(key => Number.isInteger(player.attributes[key])), `all ratings are populated for ${player.id}`);
    assert.ok(player.ratingSource, `source or model disclosure for ${player.id}`);
    assert.ok(player.ratingStatus, `status for ${player.id}`);
    assert.ok(["low", "very_low"].includes(player.ratingConfidence), `honest confidence for ${player.id}`);
    assert.ok(player.ratingMethod && player.ratingEvidence, `method and evidence for ${player.id}`);
    assert.equal(player.overall, player.attributes.OA, `overall matches OA for ${player.id}`);
    assert.deepEqual(player.ratedAttributes, RATING_ATTRIBUTES, `rated attributes for ${player.id}`);
    uniqueCards.add(JSON.stringify(player.attributes));
    assert.ok(!( "POT" in player.attributes), `potential is a separate field for ${player.id}`);
  }
  assert.ok(uniqueCards.size > registry.players.length * 0.5, "player cards must be individualized, not a shared template");
  assert.equal(registry.ratingsMetadata.counts.total, registry.players.length);
  const currentLeagueStatEstimates = registry.players.filter(player => player.ratingEvidence === "league_statistics");
  assert.ok(currentLeagueStatEstimates.length > 1000, "current league feeds should cover thousands of players");
  assert.ok(currentLeagueStatEstimates.some(player => player.currentLeague === "AHL" && player.ratingSource.includes("AHL")), "AHL players use current AHL statistics");
  assert.equal(Object.values(registry.ratingsMetadata.leagueCoverage).reduce((sum, item) => sum + item.total, 0), registry.players.length);
});

test("every available free agent has the same complete, separately sourced card", () => {
  const freeAgents = JSON.parse(readFileSync(resolve("data/free-agents/2026-2027.json"), "utf8"));
  assert.ok(freeAgents.players.length > 0);
  for (const player of freeAgents.players) {
    assert.deepEqual(Object.keys(player.attributes), RATING_ATTRIBUTES, `attribute keys for ${player.id}`);
    assert.ok(RATING_ATTRIBUTES.every(key => Number.isInteger(player.attributes[key]) && player.attributes[key] >= 0 && player.attributes[key] <= 99), `complete ratings for ${player.id}`);
    assert.ok(player.ratingSource && player.ratingStatus && ["low", "very_low"].includes(player.ratingConfidence), `provenance for ${player.id}`);
    assert.ok(!("POT" in player.attributes), `potential remains separate for ${player.id}`);
  }
});
