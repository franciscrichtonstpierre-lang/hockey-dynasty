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


test("salary, cap hit, body measurements, and draft rank do not inflate profile ability", () => {
  const plain = estimatePlayerRatings({ name:"Prospect A", currentLeague:"NHL", position:"F", age:19 });
  const decorated = estimatePlayerRatings({
    name:"Prospect A", currentLeague:"NHL", position:"F", age:19,
    annualSalary:15000000, previousCapHit:15000000,
    heightCm:203, weightKg:115, draftOverall:1, prospectRank:1
  });
  assert.deepEqual(decorated.attributes, plain.attributes);
  assert.equal(plain.metadata.confidence, "very_low");
  assert.ok(plain.metadata.method.includes("v5_derived_off_def_fighting_excluded_goalie_complete_attributes"));
});


test("FI is Fighting, stays independent, and never changes OA", () => {
  const lowFight = estimatePlayerRatings(
    { name:"Cole Caufield", currentLeague:"NHL", position:"F", age:25 },
    null, null,
    { FI:10, OA:88 }
  );
  const highFight = estimatePlayerRatings(
    { name:"Cole Caufield", currentLeague:"NHL", position:"F", age:25 },
    null, null,
    { FI:90, OA:88 }
  );
  assert.equal(lowFight.attributes.FI, 10);
  assert.equal(highFight.attributes.FI, 90);
  assert.equal(lowFight.attributes.OA, highFight.attributes.OA);
  assert.notEqual(lowFight.attributes.OA, 88); // stale imported OA must be recomputed
});


test("FI never contributes to calculated OA when no stored OA exists", () => {
  const low = estimatePlayerRatings({ name:"Player Low FI", currentLeague:"NHL", position:"F", age:25, fightingSkill:5 });
  const high = estimatePlayerRatings({ name:"Player High FI", currentLeague:"NHL", position:"F", age:25, fightingSkill:95 });
  assert.equal(low.attributes.FI, 5);
  assert.equal(high.attributes.FI, 95);
  assert.equal(low.attributes.OA, high.attributes.OA);
});

test("goalies receive all 16 attributes and a calculated OA from goalie-specific statistics", () => {
  const rows = [
    { player_id:1, name:"Goalie One", position:"G", games_played:45, wins:30, save_percentage:0.925, goals_against_average:2.20, shutouts:5 },
    { player_id:2, name:"Goalie Two", position:"G", games_played:45, wins:15, save_percentage:0.895, goals_against_average:3.10, shutouts:1 }
  ];
  const index = createLeagueStatIndex({ league:"NHL", source:"official goalie stats", season:"2026-2027", skaters:[], goalies:rows });
  const strong = estimatePlayerRatings({ name:"Goalie One", currentLeague:"NHL", position:"G", age:25 }, rows[0], index);
  const weak = estimatePlayerRatings({ name:"Goalie Two", currentLeague:"NHL", position:"G", age:25 }, rows[1], index);
  for (const result of [strong, weak]) {
    assert.deepEqual(Object.keys(result.attributes), RATING_ATTRIBUTES);
    assert.ok(RATING_ATTRIBUTES.every(key => Number.isInteger(result.attributes[key]) && result.attributes[key] >= 0 && result.attributes[key] <= 99));
    assert.ok(RATING_ATTRIBUTES.filter(key => key !== "FI" && key !== "OA").every(key => result.attributes[key] != null));
    assert.ok(Number.isInteger(result.attributes.OA));
  }
  assert.ok(strong.attributes.OA > weak.attributes.OA);
});


test("OA uses normalized weights across exactly 14 non-FI attributes", () => {
  const result = estimatePlayerRatings({
    name:"OA normalization", currentLeague:"NHL", position:"F", age:25
  }, null, null, {
    FI:99, SH:80, PL:80, ST:80, CH:80, PO:80, HI:80, SK:80,
    EN:80, PE:80, FA:80, LE:80, SR:80, OFF:80, DEF:80, OA:5
  });
  assert.equal(result.attributes.OA, 80);
});
