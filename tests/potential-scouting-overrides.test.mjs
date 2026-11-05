import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { estimatePlayerPotential } from "../scripts/lib/cross-league-rating-model.mjs";

const overrides = JSON.parse(await readFile("data/potential-scouting-overrides.json","utf8")).players;
const registry = JSON.parse(await readFile("data/players/registry.json","utf8"));
const byId = new Map(registry.players.map(player => [player.id,player]));

test("every source-reviewed potential override is applied and documented", () => {
  assert.ok(Object.keys(overrides).length >= 7);
  for (const [id, override] of Object.entries(overrides)) {
    assert.ok(Number.isInteger(override.potential) && override.potential >= 0 && override.potential <= 99, `invalid potential for ${id}`);
    assert.ok(typeof override.source === "string" && /^https?:\/\//.test(override.source), `missing source URL for ${id}`);
    assert.ok(typeof override.rationale === "string" && override.rationale.trim().length >= 30, `missing rationale for ${id}`);
    assert.ok(["low","medium","high"].includes(override.confidence), `invalid confidence for ${id}`);
    const player = byId.get(id);
    assert.ok(player, `missing player ${id}`);
    const expectedPotential = Math.max(override.potential,Number(player.overall || 0));
    assert.equal(player.potential,expectedPotential);
    assert.ok(player.potential >= Number(player.overall || 0), `potential must not be below OA for ${id}`);
    assert.equal(player.potentialSource,override.source);
    assert.ok(player.potentialRationale);
    if (override.potential < Number(player.overall || 0)) {
      assert.equal(player.potentialStatus,"provisional_model_estimate");
      assert.equal(player.potentialReviewRequired,true);
      assert.ok(player.potentialEstimateMethod.includes("oa_floor_invariant"));
    } else {
      assert.equal(player.potentialStatus,"scouting_source_reviewed_estimate");
      assert.equal(player.potentialReviewRequired,false);
      assert.ok(player.potentialEstimateMethod.includes("manual_source_review"));
    }
  }
});

test("young skater production raises projected potential", () => {
  const low = estimatePlayerPotential({age:19,position:"F",currentLeague:"OHL",potentialStats:{games_played:30,points:12}},65);
  const high = estimatePlayerPotential({age:19,position:"F",currentLeague:"OHL",potentialStats:{games_played:30,points:54}},65);
  assert.ok(high.value > low.value);
  assert.match(high.method,/projection_v5/);
});
test("production evidence does not inflate older players", () => {
  const a = estimatePlayerPotential({age:29,position:"F",currentLeague:"NHL"},80);
  const b = estimatePlayerPotential({age:29,position:"F",currentLeague:"NHL",potentialStats:{games_played:30,points:50}},80);
  assert.equal(a.value,b.value);
});
test("young goalie potential recognizes official savePctg", () => {
  const a = estimatePlayerPotential({age:20,position:"G",currentLeague:"AHL",potentialStats:{games_played:20,savePctg:0.895}},65);
  const b = estimatePlayerPotential({age:20,position:"G",currentLeague:"AHL",potentialStats:{games_played:20,savePctg:0.920}},65);
  assert.ok(b.value > a.value);
  assert.match(b.evidence,/goalie_save_percentage/);
});

test("verified birth date overrides a stale imported age", () => {
  const birthDate = new Date();
  birthDate.setUTCFullYear(birthDate.getUTCFullYear() - 18);
  const date = birthDate.toISOString().slice(0,10);
  const fromBirthDate = estimatePlayerPotential({age:20,birthDate:date,position:"F"},65);
  const fromStaleAge = estimatePlayerPotential({age:20,position:"F"},65);
  assert.equal(fromBirthDate.value,85);
  assert.equal(fromStaleAge.value,79);
});
