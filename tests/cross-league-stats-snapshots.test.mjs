import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const snapshots = [
  ["AHL", "data/ahl/player-stats-2026-2027.json", 500, 40],
  ["ECHL", "data/echl/player-stats-2026-2027.json", 300, 30],
  ["OHL", "data/junior/player-stats-ohl-2026-2027.json", 300, 20],
  ["WHL", "data/junior/player-stats-whl-2026-2027.json", 300, 20],
  ["QMJHL", "data/junior/player-stats-qmjhl-2026-2027.json", 250, 20],
  ["USHL", "data/junior/player-stats-ushl-2026-2027.json", 250, 15]
];

test("current AHL, ECHL, and junior statistics snapshots are complete and source-labelled", () => {
  for (const [league, path, minSkaters, minGoalies] of snapshots) {
    const data = JSON.parse(readFileSync(resolve(path), "utf8"));
    assert.equal(data.league, league, `league in ${path}`);
    assert.equal(data.season, "2026-2027", `season in ${path}`);
    assert.match(data.source, /official/i, `source label in ${path}`);
    assert.ok(data.endpoints?.skaters?.startsWith("https://"), `skater endpoint in ${path}`);
    assert.ok(data.endpoints?.goalies?.startsWith("https://"), `goalie endpoint in ${path}`);
    assert.ok(data.skaters.length >= minSkaters, `skater feed in ${path}`);
    assert.ok(data.goalies.length >= minGoalies, `goalie feed in ${path}`);
    assert.equal(data.counts.skaters, data.skaters.length);
    assert.equal(data.counts.goalies, data.goalies.length);
    assert.ok(data.skaters.every(player => player.player_id != null && player.games_played != null), `raw skater stats in ${path}`);
  }
});
