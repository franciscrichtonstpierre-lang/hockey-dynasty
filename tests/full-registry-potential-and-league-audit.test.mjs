import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const registry = JSON.parse(await readFile("data/players/registry.json","utf8"));
const players = registry.players || [];
const byName = new Map(players.map(player => [player.name,player]));

test("every registry player has a valid audited potential", () => {
  assert.ok(players.length >= 3000);
  assert.equal(registry.playerCount,players.length);
  let reviewed = 0;
  let modeled = 0;
  for (const player of players) {
    assert.ok(Number.isInteger(player.potential), `missing integer potential: ${player.name} (${player.id})`);
    assert.ok(player.potential >= 0 && player.potential <= 99, `potential out of range: ${player.name}`);
    assert.ok(Number.isFinite(Number(player.overall)), `missing OA: ${player.name}`);
    assert.ok(player.potential >= Number(player.overall), `potential below OA: ${player.name}`);
    if (player.potentialStatus === "scouting_source_reviewed_estimate") {
      reviewed++;
      assert.ok(player.potentialSource && player.potentialRationale, `source evidence missing: ${player.name}`);
      assert.equal(player.potentialReviewRequired,false);
    } else {
      assert.equal(player.potentialStatus,"provisional_model_estimate",`unknown potential status: ${player.name}`);
      assert.match(player.potentialEstimateMethod,/projection_v5/);
      modeled++;
    }
  }
  assert.ok(reviewed >= 319, `expected at least 319 source-reviewed estimates, got ${reviewed}`);
  assert.ok(modeled > 0);
});

test("source-verified league corrections are reflected in the registry", () => {
  const expected = [
    ["Adam Gajan","ECHL","Indy Fuel"],
    ["Adam Jecho","AHL","Springfield Thunderbirds"],
    ["Adam Novotny","OHL","Peterborough Petes"],
    ["Calum Ritchie","NHL","NYI"],
    ["Alexander Pelevin","VHL","Dizel Penza"],
    ["Alexander Perevalov","VHL","Metallurg Novokuznetsk"],
    ["Alexander Rykov","KHL","Traktor Chelyabinsk"],
    ["Vladimir Grudinin","KHL","Severstal Cherepovets"],
    ["Timur Mukhanov","VHL","Dizel Penza"],
    ["Egor Velmakin","ECHL","Greensboro Gargoyles"]
  ];
  for (const [name,league,team] of expected) {
    const player = byName.get(name);
    assert.ok(player, `missing registry player ${name}`);
    assert.equal(player.currentLeague,league,`wrong league for ${name}`);
    assert.equal(player.currentTeam,team,`wrong team for ${name}`);
    assert.equal(player.leagueResolution,"manual_source_verified",`missing source resolution for ${name}`);
  }
});

test("unresolved leagues are explicit and never assigned a fabricated team", () => {
  const unknown = players.filter(player => player.currentLeague === "UNKNOWN");
  for (const player of unknown) {
    assert.equal(player.currentTeam,null,`unverified team assigned to ${player.name}`);
    assert.equal(player.leagueResolution,"unresolved_no_verified_current_roster_source");
    assert.ok(player.source,`source trail missing for ${player.name}`);
  }
});
