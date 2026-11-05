import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const overrides = JSON.parse(await readFile("data/potential-scouting-overrides.json","utf8")).players;
const registry = JSON.parse(await readFile("data/players/registry.json","utf8"));
const byId = new Map(registry.players.map(player => [player.id,player]));

test("every source-reviewed potential override is applied and documented", () => {
  assert.ok(Object.keys(overrides).length >= 7);
  for (const [id, override] of Object.entries(overrides)) {
    assert.ok(Number.isInteger(override.potential) && override.potential >= 0 && override.potential <= 99, `invalid potential for ${id}`);
    assert.ok(typeof override.source === "string" && /^https?:\\/\\//.test(override.source), `missing source URL for ${id}`);
    assert.ok(typeof override.rationale === "string" && override.rationale.trim().length >= 30, `missing rationale for ${id}`);
    assert.ok(["low","medium","high"].includes(override.confidence), `invalid confidence for ${id}`);
    const player = byId.get(id);
    assert.ok(player, `missing player ${id}`);
    assert.equal(player.potential,override.potential);
    assert.equal(player.potentialStatus,"scouting_source_reviewed_estimate");
    assert.equal(player.potentialReviewRequired,false);
    assert.equal(player.potentialSource,override.source);
    assert.ok(player.potentialRationale);
    assert.ok(player.potentialEstimateMethod.includes("manual_source_review"));
  }
});
