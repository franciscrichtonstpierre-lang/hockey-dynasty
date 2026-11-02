import test from "node:test";
import assert from "node:assert/strict";
import { RATING_ATTRIBUTES } from "../scripts/lib/player-ratings.mjs";
import { createLeagueStatIndex, estimatePlayerRatings, matchLeagueStats, matchStatIndex, statNameKey } from "../scripts/lib/cross-league-rating-model.mjs";

test("normalizes surname-first junior feed names without weakening exact matching", () => {
  assert.equal(statNameKey("Veilleux, Philippe"), statNameKey("Philippe Veilleux"));
  const index = createLeagueStatIndex({ league:"QMJHL", source:"https://league.example/stats", season:"2026-2027", skaters:[{ player_id:12, name:"Veilleux, Philippe", position:"F", games_played:30, goals:12, assists:18, points:30, shots:70, plus_minus:8, penalty_minutes:14 }], goalies:[] });
  assert.equal(matchLeagueStats({ name:"Philippe Veilleux", currentLeague:"QMJHL", position:"F" }, index).player_id, 12);
});

test("does not match an unrelated league to USHL statistics", () => {
  const index = createLeagueStatIndex({ league:"USHL", source:"Official USHL feed", skaters:[{ player_id:12, name:"Dennis Good Bogg", games_played:20, goals:3, assists:5, points:8 }], goalies:[] });
  assert.equal(matchStatIndex({ name:"Dennis Good Bogg", currentLeague:"HSA" }, new Map([["USHL", index]])).row, null);
});

test("league-stat estimates are individualized, complete, bounded, and provenance-labelled", () => {
  const rows = [
    { player_id:1, name:"High Output", position:"F", games_played:30, goals:20, assists:20, points:40, shots:100, plus_minus:12, penalty_minutes:8 },
    { player_id:2, name:"Low Output", position:"F", games_played:30, goals:1, assists:2, points:3, shots:20, plus_minus:-15, penalty_minutes:70 }
  ];
  const index = createLeagueStatIndex({ league:"OHL", source:"https://official.example/ohl/stats", season:"2026-2027", skaters:rows, goalies:[] });
  const high = estimatePlayerRatings({ name:"High Output", currentLeague:"OHL", position:"F", age:18 }, rows[0], index);
  const low = estimatePlayerRatings({ name:"Low Output", currentLeague:"OHL", position:"F", age:18 }, rows[1], index);
  for (const result of [high, low]) {
    assert.deepEqual(Object.keys(result.attributes), RATING_ATTRIBUTES);
    assert.ok(RATING_ATTRIBUTES.every(key => Number.isInteger(result.attributes[key]) && result.attributes[key] >= 0 && result.attributes[key] <= 99));
    assert.ok(result.metadata.source.includes("https://official.example/ohl/stats"));
    assert.equal(result.metadata.confidence, "low");
    assert.equal(result.metadata.status, "model_estimate_from_league_statistics");
    assert.deepEqual(result.metadata.ratedAttributes, RATING_ATTRIBUTES);
    assert.ok(!("POT" in result.attributes));
  }
  assert.notDeepEqual(high.attributes, low.attributes);
  assert.notEqual(high.overall, low.overall);
});

test("a profile-only estimate is explicitly marked very low confidence", () => {
  const result = estimatePlayerRatings({ name:"Unscouted Profile", currentLeague:"EUROPE", position:"D", age:20, source:"https://club.example/roster" });
  assert.deepEqual(Object.keys(result.attributes), RATING_ATTRIBUTES);
  assert.equal(result.metadata.confidence, "very_low");
  assert.equal(result.metadata.status, "minimal_profile_model_estimate");
  assert.equal(result.metadata.evidence, "minimal_player_profile");
  assert.ok(result.metadata.source.includes("https://club.example/roster"));
});
