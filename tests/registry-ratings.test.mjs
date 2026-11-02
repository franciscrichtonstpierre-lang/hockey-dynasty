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
  for (const player of registry.players) {
    assert.ok(Number.isInteger(player.potential) && player.potential >= 0 && player.potential <= 99, `separate potential estimate for ${player.id}`);
    assert.equal(player.potential, player.potentialEstimate, `potential estimate is labelled consistently for ${player.id}`);
    assert.equal(player.potentialStatus, "provisional_model_estimate", `potential confidence status for ${player.id}`);
  }
});

test("the ratings lookup gives every organization prospect row a complete sourced or labelled model card", () => {
  const lookup = JSON.parse(readFileSync(resolve("data/players/registry-index/ratings-lookup.json"), "utf8"));
  const byNhlId = new Map(lookup.players.filter(player => player.nhlPlayerId != null).map(player => [String(player.nhlPlayerId), player]));
  const byName = new Map();
  const key = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const nameOf = prospect => prospect.fullName || prospect.name || prospect.display_name ||
    [prospect.firstName?.default || prospect.firstName || prospect.first_name || "", prospect.lastName?.default || prospect.lastName || prospect.last_name || ""].join(" ").trim();
  for (const player of lookup.players) {
    const name = key(player.name);
    if (!name) continue;
    const candidates = byName.get(name) || [];
    candidates.push(player);
    byName.set(name, candidates);
  }
  for (const code of ["ANA","BOS","BUF","CGY","CAR","CHI","COL","CBJ","DAL","DET","EDM","FLA","LAK","MIN","MTL","NSH","NJD","NYI","NYR","OTT","PHI","PIT","SJS","SEA","STL","TBL","TOR","UTA","VAN","VGK","WSH","WPG"]) {
    const data = JSON.parse(readFileSync(resolve(`data/prospects/${code}.json`), "utf8"));
    for (const prospect of data.prospects || []) {
      const name = nameOf(prospect);
      const id = prospect.id ?? prospect.playerId ?? prospect.player_id ?? prospect.nhlPlayerId;
      let player = id != null ? byNhlId.get(String(id)) : null;
      if (!player) {
        let candidates = byName.get(key(name)) || [];
        const rightsTeam = prospect.nhlRightsTeam || prospect.rightsTeam || prospect.nhlTeamCode || code;
        const teamCandidates = candidates.filter(candidate => candidate.nhlRightsTeam === rightsTeam);
        if (teamCandidates.length) candidates = teamCandidates;
        const fallback = candidates.filter(candidate => candidate.prospectFallback && candidate.nhlRightsTeam === rightsTeam);
        if (fallback.length === 1) player = fallback[0];
        else if (candidates.length === 1) player = candidates[0];
      }
      assert.ok(player, `rating card match for ${code} prospect ${name} (${id ?? "no source ID"})`);
      assert.deepEqual(Object.keys(player.attributes || {}), RATING_ATTRIBUTES, `exact 16 attributes for ${player.name}`);
      assert.ok(RATING_ATTRIBUTES.every(attribute => Number.isInteger(player.attributes[attribute]) && player.attributes[attribute] >= 0 && player.attributes[attribute] <= 99), `complete prospect card for ${player.name}`);
      assert.ok(player.ratingSource && player.ratingStatus && ["low", "very_low"].includes(player.ratingConfidence), `source, status and confidence for ${player.name}`);
      assert.ok(Number.isInteger(player.potentialEstimate ?? player.potential), `separate potential for ${player.name}`);
    }
  }
  assert.ok(lookup.organizationProspectProfiles >= 1, "unmatched rows get explicit low-confidence profile estimates");
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
