import test from "node:test";
import assert from "node:assert/strict";
import { RATING_ATTRIBUTES } from "../scripts/lib/player-ratings.mjs";
import { parseNCAAPlayerStats } from "../scripts/lib/ncaa-stat-feed.mjs";
import { combineLeagueStatRows, createLeagueStatIndex, estimatePlayerRatings, matchLeagueStats, matchStatIndex, statNameKey } from "../scripts/lib/cross-league-rating-model.mjs";

test("uses a unique official league-stat match when the profile omits its current league", () => {
  const row = { player_id:77, name:"Prospect Cross League", position:"F", games_played:18, goals:8, assists:11, points:19, shots:52, plus_minus:4, penalty_minutes:6 };
  const ohl = createLeagueStatIndex({ league:"OHL", source:"official OHL stats", season:"2026-2027", skaters:[row], goalies:[] });
  const q = createLeagueStatIndex({ league:"QMJHL", source:"official QMJHL stats", season:"2026-2027", skaters:[], goalies:[] });
  const matched = matchStatIndex({ name:"Prospect Cross League", position:"F" }, new Map([["OHL",ohl],["QMJHL",q]]));
  assert.equal(matched.index, ohl);
  assert.equal(matched.row.player_id, 77);
  const result = estimatePlayerRatings({ name:"Prospect Cross League", currentLeague:"UNKNOWN", position:"F", age:18 }, matched.row, matched.index);
  assert.equal(result.metadata.evidence, "league_statistics");
  assert.ok(result.metadata.source.includes("official OHL stats"));
});

test("uses unique non-NHL league statistics for an NHL prospect with no NHL sample", () => {
  const row = { player_id:91, name:"NHL Prospect Without NHL Stats", position:"F", games_played:16, goals:7, assists:10, points:17, shots:44, plus_minus:3, penalty_minutes:8 };
  const ohl = createLeagueStatIndex({ league:"OHL", source:"official OHL stats", season:"2026-2027", skaters:[row], goalies:[] });
  const player = { name:"NHL Prospect Without NHL Stats", currentLeague:"NHL", position:"F" };
  assert.equal(matchStatIndex(player,new Map([["OHL",ohl]])).row,null);
  const matched = matchStatIndex(player,new Map([["OHL",ohl]]),{allowCrossLeague:true});
  assert.equal(matched.index,ohl);
  assert.equal(matched.row.player_id,91);
});

test("does not use an ambiguous cross-league match for an NHL prospect", () => {
  const row = { player_id:91, name:"Ambiguous NHL Prospect", position:"F", games_played:16, goals:7, assists:10, points:17 };
  const ohl = createLeagueStatIndex({ league:"OHL", source:"official OHL stats", season:"2026-2027", skaters:[row], goalies:[] });
  const whl = createLeagueStatIndex({ league:"WHL", source:"official WHL stats", season:"2026-2027", skaters:[{...row,player_id:92}], goalies:[] });
  const matched = matchStatIndex({ name:"Ambiguous NHL Prospect", currentLeague:"NHL", position:"F" },new Map([["OHL",ohl],["WHL",whl]]),{allowCrossLeague:true});
  assert.equal(matched.row,null);
});

test("combines short current-season skater samples with prior-season totals", () => {
  const current = { games_played:8, goals:4, assists:5, points:9, shots:30, plus_minus:2, penalty_minutes:4 };
  const previous = { games_played:40, goals:12, assists:18, points:30, shots:110, plus_minus:6, penalty_minutes:20 };
  const combined = combineLeagueStatRows(current,previous);
  assert.equal(combined.games_played,48);
  assert.equal(combined.goals,16);
  assert.equal(combined.assists,23);
  assert.equal(combined.points,39);
  assert.equal(combined.shots,140);
});

test("combines goalie saves and shots before recalculating save percentage", () => {
  const current = { games_played:5, saves:130, shots_against:140, save_percentage:92.86, goals_against_average:2.0, wins:3, shutouts:1 };
  const previous = { games_played:30, saves:780, shots_against:840, save_percentage:92.86, goals_against_average:2.4, wins:16, shutouts:2 };
  const combined = combineLeagueStatRows(current,previous);
  assert.equal(combined.games_played,35);
  assert.equal(combined.saves,910);
  assert.equal(combined.shots_against,980);
  assert.ok(Math.abs(combined.save_percentage - 92.857) < 0.01);
  assert.equal(combined.wins,19);
  assert.equal(combined.shutouts,3);
});

test("uses prior-season statistics only when current-season statistics have no player row", () => {
  const oldRow = { player_id:88, name:"Historical Sample Player", position:"F", games_played:42, goals:18, assists:21, points:39, shots:90, plus_minus:5, penalty_minutes:12 };
  const current = createLeagueStatIndex({ league:"AHL", source:"current AHL stats", season:"2026-2027", skaters:[], goalies:[] });
  const previous = createLeagueStatIndex({ league:"AHL", source:"previous AHL stats", season:"2025-2026", skaters:[oldRow], goalies:[] });
  const matched = matchStatIndex({ name:"Historical Sample Player", currentLeague:"AHL", position:"F" }, new Map([["AHL",[current,previous]]]));
  assert.equal(matched.index.season,"2025-2026");
  assert.equal(matched.row.player_id,88);
});

test("does not guess a league when an identical name occurs in multiple official feeds", () => {
  const row = { player_id:77, name:"Ambiguous Prospect", position:"F", games_played:18, goals:8, assists:11, points:19 };
  const ohl = createLeagueStatIndex({ league:"OHL", source:"official OHL stats", season:"2026-2027", skaters:[row], goalies:[] });
  const whl = createLeagueStatIndex({ league:"WHL", source:"official WHL stats", season:"2026-2027", skaters:[{...row,player_id:88}], goalies:[] });
  const matched = matchStatIndex({ name:"Ambiguous Prospect", position:"OTHER", positionCode:"F" }, new Map([["OHL",ohl],["WHL",whl]]));
  assert.equal(matched.row, null);
});

test("parses official NCAA skater statistics and excludes goalie rows", () => {
  const html = `
    <table><tr><th>Rk</th><th>Name</th><th>Team</th><th>Pos.</th><th>Yr</th><th>GP</th><th>G</th><th>A</th><th>PTS</th><th>Pt/Gm</th><th>PIM</th><th>Shots</th><th>GWG</th><th>PPG</th><th>SHG</th><th>+/-</th></tr>
    <tr><td>1</td><td><a>Michael Hage</a></td><td>Michigan</td><td>F</td><td>Jr</td><td>9</td><td>4</td><td>16</td><td>20</td><td>2.22</td><td>0</td><td>34</td><td>1</td><td>1</td><td>0</td><td>14</td></tr>
    <tr><td>2</td><td><a>Ty Hanson</a></td><td>Minnesota-Duluth</td><td>D</td><td>Jr</td><td>10</td><td>8</td><td>6</td><td>14</td><td>1.40</td><td>0</td><td>35</td><td>2</td><td>3</td><td>1</td><td>9</td></tr>
    <tr><td>3</td><td><a>Goalie Name</a></td><td>Michigan</td><td>G</td><td>Fr</td><td>4</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td></tr>
    </table>`;
  const rows = parseNCAAPlayerStats(html);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].name, "Michael Hage");
  assert.equal(rows[0].points, 20);
  assert.equal(rows[0].plus_minus, 14);
  assert.equal(rows[1].position, "D");
});

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


test("matches abbreviated and expanded first names only on a unique surname-initial-position key", () => {
  const row = { player_id:401, name:"Jeffrey JP Hurlbert", position:"F", games_played:68, goals:42, assists:55, points:97 };
  const index = createLeagueStatIndex({ league:"WHL", source:"official WHL stats", season:"2025-2026", skaters:[row], goalies:[] });
  const matched = matchLeagueStats({ name:"J.P. Hurlbert", currentLeague:"WHL", position:"F" }, index);
  assert.equal(matched, row);
});

test("does not guess between players sharing the same first initial and surname", () => {
  const rows = [
    { player_id:501, name:"John Smith", position:"F", games_played:30, goals:10, assists:10, points:20 },
    { player_id:502, name:"James Smith", position:"F", games_played:30, goals:8, assists:9, points:17 }
  ];
  const index = createLeagueStatIndex({ league:"OHL", source:"official OHL stats", season:"2026-2027", skaters:rows, goalies:[] });
  assert.equal(matchLeagueStats({ name:"J. Smith", currentLeague:"OHL", position:"F" }, index), null);
});

test("uses position to disambiguate first-initial and surname matches when exactly one remains", () => {
  const rows = [
    { player_id:601, name:"Jordan Brown", position:"D", games_played:30, goals:4, assists:12, points:16 },
    { player_id:602, name:"Jack Brown", position:"F", games_played:30, goals:12, assists:14, points:26 }
  ];
  const index = createLeagueStatIndex({ league:"OHL", source:"official OHL stats", season:"2026-2027", skaters:rows, goalies:[] });
  const matched = matchLeagueStats({ name:"J. Brown", currentLeague:"OHL", position:"F" }, index);
  assert.equal(matched, rows[1]);
});


test("allows a unique current-season cross-league match for a player labeled SHL when the SHL feed has no row", () => {
  const row = { player_id:880, name:"Axel Elofsson", position:"D", games_played:15, goals:0, assists:14, points:14, shots:18, plus_minus:2, penalty_minutes:8 };
  const allsvenskan = createLeagueStatIndex({ league:"ALLSVENSKAN", source:"official HockeyAllsvenskan stats", season:"2026-2027", skaters:[row], goalies:[] });
  const shl = createLeagueStatIndex({ league:"SHL", source:"official SHL stats", season:"2026-2027", skaters:[], goalies:[] });
  const matched = matchStatIndex({ name:"Axel Elofsson", currentLeague:"SHL", position:"D" }, new Map([["SHL",shl],["ALLSVENSKAN",allsvenskan]]), { allowCrossLeague:true });
  assert.equal(matched.index,allsvenskan);
  assert.equal(matched.row.player_id,880);
});

test("does not accept cross-league matches when more than one league has the same player", () => {
  const rowA = { player_id:881, name:"Alex Example", position:"F", games_played:10, goals:2, assists:3, points:5 };
  const rowB = { player_id:882, name:"Alex Example", position:"F", games_played:10, goals:1, assists:4, points:5 };
  const shl = createLeagueStatIndex({ league:"SHL", source:"official SHL stats", season:"2026-2027", skaters:[], goalies:[] });
  const allsvenskan = createLeagueStatIndex({ league:"ALLSVENSKAN", source:"official HockeyAllsvenskan stats", season:"2026-2027", skaters:[rowA], goalies:[] });
  const liiga = createLeagueStatIndex({ league:"LIIGA", source:"official Liiga stats", season:"2026-2027", skaters:[rowB], goalies:[] });
  const matched = matchStatIndex({ name:"Alex Example", currentLeague:"SHL", position:"F" }, new Map([["SHL",shl],["ALLSVENSKAN",allsvenskan],["LIIGA",liiga]]), { allowCrossLeague:true });
  assert.equal(matched.row,null);
});
