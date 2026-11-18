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
    assert.equal(draftPlayer.birthDate, player.birthDate, name + " sourced birth date");
    assert.ok(draftPlayer.birthDateSource, name + " birth-date source");
    const registryPlayer = registryByName.get(name);
    assert.ok(registryPlayer, name + " canonical registry record");
    assert.equal(registryPlayer.currentLeague, league, name + " canonical league");
    assert.equal(registryPlayer.currentTeam, team, name + " canonical club");
    assert.equal(registryPlayer.birthDate, player.birthDate, name + " canonical sourced birth date");
    assert.ok(registryPlayer.birthDateSource, name + " canonical birth-date source");
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

test("verified birth dates are propagated for the additional 2027 draft prospects", () => {
  const expectedBirthDates = {
    "Landon DuPont": "2009-05-28",
    "Brock England": "2009-08-22",
    "Dima Zhilkin": "2008-10-21",
    "Sammy Nelson": "2008-09-19",
    "Jaxon Jacobson": "2008-12-11",
    "Luca Santala": "2009-07-28",
    "Brock Cripps": "2009-07-23",
    "Jaakko Wycisk": "2009-03-16",
    "Andrei Pustovoy": "2008-12-08",
    "Noah Davidson": "2008-11-01",
    "Levi Harper": "2008-10-03",
    "Shaeffer Gordon-Carroll": "2008-11-26",
    "Boston Tait": "2009-04-13",
    "Nolan Fitzhenry": "2009-02-10",
    "Ryerson Edgar": "2009-07-30",
    "Aden Bouchard": "2009-03-25",
    "Carson Scott": "2009-04-02",
    "Colin Grubb": "2009-04-02",
    "Colton Lien": "2009-03-20",
    "Diego Gutierrez": "2009-05-13",
    "Eli McKamey": "2009-01-19",
    "Freddie Schneider": "2009-02-16",
    "Gunnar Conboy": "2009-04-02",
    "Ilya Nikitins": "2008-12-21",
    "Jacob Schwartz": "2009-06-06",
    "Jake Prunty": "2009-03-04",
    "Luca Blonda": "2008-11-25",
    "Luca Jarvis": "2008-11-15"
  };
  for (const [name, birthDate] of Object.entries(expectedBirthDates)) {
    const manual = byName.get(name);
    const draft = draftByName.get(name);
    const registryPlayer = registryByName.get(name);
    assert.equal(manual?.birthDate, birthDate, name + " manually sourced birth date");
    assert.ok(manual?.birthDateSource, name + " manual birth-date source");
    assert.equal(draft?.birthDate, birthDate, name + " draft birth date");
    assert.ok(draft?.birthDateSource, name + " draft birth-date source");
    assert.equal(registryPlayer?.birthDate, birthDate, name + " registry birth date");
    assert.ok(registryPlayer?.birthDateSource, name + " registry birth-date source");
  }
});

test("verified birth dates are propagated for 2028 and 2029 draft prospects", () => {
  const expectedBirthDates = {
    "Adrian Sgro": "2010-03-15",
    "Aiden Kelly": "2010-02-02",
    "Cruz Jim": "2010-01-27",
    "Drew Daley": "2010-02-16",
    "Ezekiel Kaebel": "2010-01-23",
    "Gordei Khotkov": "2010-03-10",
    "Jack Hair": "2010-05-28",
    "Joey Cullen": "2010-04-17",
    "Kane Cloutier": "2010-06-14",
    "Liam Pue": "2010-02-16",
    "Louis-Oscar Holowaychuk": "2010-02-05",
    "Maddox Schultz": "2010-03-15",
    "Milan Kutsevich": "2010-02-02",
    "Reid Nicol": "2010-02-04",
    "Wilson Boumedienne": "2010-06-29",
    "Zaac Charbonneau": "2010-01-18",
    "Dominik Železný": "2011-07-04",
    "Madden Daneault": "2011-05-07",
    "Parker McMillan": "2011-06-13",
    "Pierre-Alexandre Lemieux": "2010-11-27",
    "Thor Liffiton": "2010-12-06"
  };
  for (const [name, birthDate] of Object.entries(expectedBirthDates)) {
    const manual = byName.get(name);
    const draft = draftByName.get(name);
    const registryPlayer = registryByName.get(name);
    assert.equal(manual?.birthDate, birthDate, name + " manually sourced birth date");
    assert.ok(manual?.birthDateSource, name + " manual birth-date source");
    assert.equal(draft?.birthDate, birthDate, name + " draft birth date");
    assert.ok(draft?.birthDateSource, name + " draft birth-date source");
    assert.equal(registryPlayer?.birthDate, birthDate, name + " registry birth date");
    assert.ok(registryPlayer?.birthDateSource, name + " registry birth-date source");
  }
});

test("the remaining 2028 and 2029 birth dates are propagated from verified profiles", () => {
  const expectedBirthDates = {
    "Isak Alvudd": "2010-03-05",
    "Jack Trupiano": "2010-06-11",
    "Jose Tiilikainen": "2010-06-14",
    "Lionel Dedial": "2010-11-27",
    "Matyas Čutta": "2010-04-03",
    "Chase Schulberger": "2010-11-09"
  };
  for (const [name, birthDate] of Object.entries(expectedBirthDates)) {
    const manual = byName.get(name);
    const draft = draftByName.get(name);
    const registryPlayer = registryByName.get(name);
    assert.equal(manual?.birthDate, birthDate, name + " manually sourced birth date");
    assert.ok(manual?.birthDateSource, name + " manual birth-date source");
    assert.equal(draft?.birthDate, birthDate, name + " draft birth date");
    assert.ok(draft?.birthDateSource, name + " draft birth-date source");
    assert.equal(registryPlayer?.birthDate, birthDate, name + " registry birth date");
    assert.ok(registryPlayer?.birthDateSource, name + " registry birth-date source");
  }
});

test("each manual affiliation correction preserves its own verification date", () => {
  const script = readFileSync("scripts/build-player-registry.mjs", "utf8");
  assert.match(script, /correctionDate=Date\.parse\(correction\.sourceUpdatedAt\|\|manualLeagueCorrections\.verifiedAt/);
  assert.match(script, /p\.sourceUpdatedAt=new Date\(correctionDate\)\.toISOString\(\)/);
  assert.match(script, /recordDate>correctionDate/);
  assert.match(script, /newerRecord/);
  assert.match(script, /applyRights=!newerRecord\|\|!p\.nhlRightsTeam/);
  assert.match(script, /correctionLeagueGeneric/);
  assert.match(script, /currentLeagueGeneric/);
});

test("the fallback draft parser never stores handedness as a club name", () => {
  const script = readFileSync("scripts/sync-future-draft-prospects.mjs", "utf8");
  assert.match(script, /\^shoots\\s\+\[LR\]\$/);
  assert.match(script, /manual-league-corrections\.json/);
  assert.match(script, /Future draft affiliation overrides/);
});
