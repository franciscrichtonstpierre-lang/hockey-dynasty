import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const corrections = JSON.parse(readFileSync("data/players/manual-league-corrections.json", "utf8"));
const byName = new Map((corrections.players || []).map(player => [player.name, player]));

const expected = [
  ["Artem Katsuro", "WHL", "Calgary Hitmen"],
  ["Brenner Lammens", "OHL", "Owen Sound Attack"],
  ["Camryn Warren", "OHL", "North Bay Battalion"],
  ["Easton Walos", "OHL", "Sarnia Sting"],
  ["Gensen Geldart", "OHL", "Saginaw Spirit"],
  ["Joaquin Geras", "WHL", "Kamloops Blazers"],
  ["Kaden McGregor", "OHL", "Brantford Bulldogs"],
  ["Kane Barch", "OHL", "London Knights"],
  ["Kayden Stroeder", "WHL", "Edmonton Oil Kings"],
  ["Kohyn Eshkawkogan", "OHL", "Ottawa 67's"],
  ["Noah Laus", "OHL", "Soo Greyhounds"],
  ["Peter Green", "OHL", "Brampton Steelheads"],
  ["Prabh Bhathal", "WHL", "Brandon Wheat Kings"],
  ["Rhett Sather", "WHL", "Spokane Chiefs"],
  ["Šimon Bělohorský", "OHL", "Flint Firebirds"],
  ["Timothy Kazda", "OHL", "Guelph Storm"]
];

test("the 2027 draft watchlist has sourced league and club affiliations for all 16 previously unknown prospects", () => {
  for (const [name, league, team] of expected) {
    const player = byName.get(name);
    assert.ok(player, name + " has a manual correction");
    assert.equal(player.currentLeague, league, name + " league");
    assert.equal(player.currentTeam, team, name + " current club");
    assert.ok(player.source, name + " source");
    assert.equal(player.sourceUpdatedAt, "2026-11-18", name + " review date");
  }
});

test("each manual affiliation correction preserves its own verification date", () => {
  const script = readFileSync("scripts/build-player-registry.mjs", "utf8");
  assert.match(script, /correction\.sourceUpdatedAt\s*\|\|\s*manualLeagueCorrections\.verifiedAt/);
});
