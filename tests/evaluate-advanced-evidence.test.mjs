import test from "node:test";
import assert from "node:assert/strict";
import { RATING_ATTRIBUTES } from "../scripts/lib/player-ratings.mjs";
import {
  createLeagueStatIndex,
  estimatePlayerPotential,
  estimatePlayerRatings,
  matchLeagueStats
} from "../scripts/lib/cross-league-rating-model.mjs";

const completeCard = {
  FI:10, SH:70, PL:72, ST:68, CH:65, PO:66, HI:64, SK:71,
  EN:69, PE:67, FA:60, LE:68, SR:70, OFF:70, DEF:65, OA:0
};

test("shared rating model returns all sixteen bounded integer attributes", () => {
  const result = estimatePlayerRatings(
    { name:"Test Forward", age:24, currentLeague:"NHL", position:"F" },
    null,
    null,
    completeCard
  );
  assert.deepEqual(Object.keys(result.attributes), RATING_ATTRIBUTES);
  for (const key of RATING_ATTRIBUTES) {
    assert.ok(Number.isInteger(result.attributes[key]), key + " must be an integer");
    assert.ok(result.attributes[key] >= 0 && result.attributes[key] <= 99, key + " must be within 0-99");
  }
});

test("FI is independent and never changes the overall", () => {
  const player = { name:"Test Forward", age:24, currentLeague:"NHL", position:"F" };
  const lowFight = estimatePlayerRatings(player, null, null, { ...completeCard, FI:5 });
  const highFight = estimatePlayerRatings(player, null, null, { ...completeCard, FI:99 });
  assert.equal(lowFight.overall, highFight.overall);
  assert.equal(lowFight.attributes.OA, highFight.attributes.OA);
  assert.equal(lowFight.attributes.FI, 5);
  assert.equal(highFight.attributes.FI, 99);
});

test("OFF and DEF are derived from their agreed component attributes", () => {
  const result = estimatePlayerRatings(
    { name:"Test Defender", age:27, currentLeague:"NHL", position:"D" },
    null,
    null,
    { ...completeCard, SH:81, PL:72, ST:69, CH:77, PO:74, HI:70 }
  );
  assert.equal(result.attributes.OFF, Math.round((81 + 72 + 69) / 3));
  assert.equal(result.attributes.DEF, Math.round((77 + 74 + 70) / 3));
  const oaKeys = RATING_ATTRIBUTES.filter(key => key !== "FI" && key !== "OA");
  assert.equal(result.attributes.OA, Math.round(oaKeys.reduce((sum, key) => sum + result.attributes[key], 0) / oaKeys.length));
});

test("league stat matching uses a unique normalized player name", () => {
  const index = createLeagueStatIndex({
    league:"NHL",
    season:"2025-2026",
    source:"synthetic test fixture",
    skaters:[
      { player_id:"101", name:"Smith, Alex", position:"C", games_played:20, goals:8, assists:12, points:20 },
      { player_id:"102", name:"Jones, Pat", position:"D", games_played:18, goals:2, assists:7, points:9 }
    ],
    goalies:[]
  });
  const matched = matchLeagueStats({ name:"Alex Smith", position:"C" }, index);
  assert.equal(matched.player_id, "101");
});

test("potential projection never falls below current ability", () => {
  const result = estimatePlayerPotential({
    name:"Young Prospect",
    age:19,
    currentLeague:"OHL",
    position:"F",
    draftOverall:12,
    potentialStats:{ games_played:30, goals:18, assists:24, points:42 }
  }, 78);
  assert.ok(result.value >= 78);
  assert.equal(result.status, "provisional_model_estimate");
});
