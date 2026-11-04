import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeLiigaGoalies, normalizeLiigaSkaters, normalizeShlGoalies, normalizeShlSkaters
} from "../scripts/lib/european-stat-feed.mjs";

test("normalizes Liiga skater statistics to the shared league-stat schema", () => {
  const rows = normalizeLiigaSkaters([{ player_id:123, first_name:"Test", last_name:"Skater", role:"CENTER", played_games:20, goals:8, assists:12, points:20, plus_minus:4, penalty_minutes:10, shots:55 }]);
  assert.equal(rows.length,1);
  assert.equal(rows[0].name,"Test Skater");
  assert.equal(rows[0].games_played,20);
  assert.equal(rows[0].points,20);
  assert.equal(rows[0].player_id,123);
});

test("normalizes Liiga goalie statistics", () => {
  const rows = normalizeLiigaGoalies([{ player_id:456, first_name:"Test", last_name:"Goalie", played_games:14, saves:380, save_percentage:"91.2", goals_against_average:"2.31", gk_wins:8, shut_out:2 }]);
  assert.equal(rows.length,1);
  assert.equal(rows[0].position,"G");
  assert.equal(rows[0].save_percentage,91.2);
  assert.equal(rows[0].shutouts,2);
});

test("normalizes SHL player and goalie summary fields", () => {
  const skaters = normalizeShlSkaters([{ player_id:789, info_full_name:"SHL Skater", info_position:"CE", gp:18, g:7, a:9, tp:16, plus_minus:3, pim:8, sog:40 }]);
  const goalies = normalizeShlGoalies([{ player_id:790, info_full_name:"SHL Goalie", gp:12, w:7, svs:300, svs_perc:"92.1", gaa:"2.10", so:1 }]);
  assert.equal(skaters[0].name,"SHL Skater");
  assert.equal(skaters[0].points,16);
  assert.equal(goalies[0].name,"SHL Goalie");
  assert.equal(goalies[0].save_percentage,92.1);
  assert.equal(goalies[0].shutouts,1);
});
