import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const registry = JSON.parse(await readFile("data/players/registry.json","utf8"));
const players = registry.players || [];
const corrections = JSON.parse(await readFile("data/players/manual-league-corrections.json","utf8")).players || [];
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
      assert.equal(player.potentialEvidence,"published_scouting_sources",`source evidence type missing: ${player.name}`);
      assert.equal(player.potentialReviewRequired,false);
    } else {
      assert.equal(player.potentialStatus,"provisional_model_estimate",`unknown potential status: ${player.name}`);
      assert.match(player.potentialEstimateMethod,/projection_v5|oa_floor_invariant/);
      assert.ok(["low","very_low"].includes(player.potentialConfidence), `missing potential confidence: ${player.name}`);
      assert.ok(player.potentialEvidence || player.potentialRationale, `missing potential evidence label: ${player.name}`);
      assert.equal(player.potentialReviewRequired,true);
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
    ["Egor Velmakin","ECHL","Greensboro Gargoyles"],
    ["Bogdan Konyushkov","KHL","Torpedo Nizhny Novgorod"],
    ["Daniil Sobolev","KHL","Spartak Moskva"],
    ["Dmitri Kostenko","KHL","Amur Khabarovsk"],
    ["Makar Khanin","VHL","Khimik Voskresensk"],
    ["John Mooney","NCAA","University of Minnesota"],
    ["Mikus Vecvanags","BCHL","Victoria Grizzlies"],
    ["Yevgeni Volokhin","VHL","Khimik Voskresensk"],
    ["Antoine Keller","NL","HC Ajoie"]
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
    assert.ok(typeof player.leagueResolution==="string" && player.leagueResolution.length>0,`missing league resolution reason: ${player.name}`);
    assert.ok(player.source,`source trail missing for ${player.name}`);
  }
});

test("no source-backed exact league correction remains unresolved", () => {
  const unknown = players.filter(player => player.currentLeague === "UNKNOWN");
  const unresolved = unknown.filter(player => corrections.some(correction =>
    correction.playerId && String(correction.playerId) === String(player.id) &&
    correction.currentLeague && /^https?:\/\//.test(correction.source || "")
  ));
  assert.deepEqual(unresolved.map(player => player.name),[]);
});
