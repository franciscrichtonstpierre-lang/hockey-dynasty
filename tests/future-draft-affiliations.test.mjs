import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const corrections = JSON.parse(readFileSync("data/players/manual-league-corrections.json", "utf8"));
const byName = new Map((corrections.players || []).map(player => [player.name, player]));
const futureDraft = JSON.parse(readFileSync("data/future-draft-prospects/2027-2029.json", "utf8"));
const draftByName = new Map((futureDraft.prospects || []).map(player => [player.name, player]));
const registry = JSON.parse(readFileSync("data/players/registry.json", "utf8"));
const registryByName = new Map((registry.players || []).map(player => [player.name, player]));

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
    const draftPlayer = draftByName.get(name);
    assert.ok(draftPlayer, name + " appears in the future-draft dataset");
    assert.equal(draftPlayer.currentLeague, league, name + " draft-list league");
    assert.equal(draftPlayer.currentTeam, team, name + " draft-list club");
    assert.ok(draftPlayer.birthDate, name + " birth date");
    const registryPlayer = registryByName.get(name);
    assert.ok(registryPlayer, name + " canonical registry record");
    assert.equal(registryPlayer.currentLeague, league, name + " canonical league");
    assert.equal(registryPlayer.currentTeam, team, name + " canonical club");
    assert.ok(draftPlayer.currentTeamSource, name + " draft-list source");
    assert.equal(draftPlayer.affiliationVerifiedAt, "2026-11-18", name + " draft-list review date");
  }
});

test("verified birth dates are copied into the future-draft dataset", () => {
  const expectedBirthDates = {
    "Camryn Warren": "2009-05-07",
    "Šimon Bělohorský": "2008-10-18",
    "Timothy Kazda": "2008-10-04"
  };
  for (const [name, birthDate] of Object.entries(expectedBirthDates)) {
    const player = draftByName.get(name);
    assert.ok(player, name + " future-draft record");
    assert.equal(player.birthDate, birthDate, name + " birth date");
    assert.ok(player.birthDateSource, name + " birth-date source");
  }
});

test("each manual affiliation correction preserves its own verification date", () => {
  const script = readFileSync("scripts/build-player-registry.mjs", "utf8");
  assert.match(script, /correction\.sourceUpdatedAt\s*\|\|\s*manualLeagueCorrections\.verifiedAt/);
  assert.match(script, /p\.sourceUpdatedAt=correction\.sourceUpdatedAt\s*\|\|\s*manualLeagueCorrections\.verifiedAt/);
});

test("the fallback draft parser never stores handedness as a club name", () => {
  const script = readFileSync("scripts/sync-future-draft-prospects.mjs", "utf8");
  assert.match(script, /\^shoots\\s\+\[LR\]\$/);
  assert.match(script, /manual-league-corrections\.json/);
  assert.match(script, /Future draft affiliation overrides/);
});
