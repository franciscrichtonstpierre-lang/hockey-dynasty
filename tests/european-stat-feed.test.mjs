import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeLiigaGoalies, normalizeLiigaSkaters, normalizeShlGoalies, normalizeShlSkaters,
  normalizeEliteProspectsShlGoalies, normalizeEliteProspectsShlSkaters,
  normalizeAllsvenskanGoalies, normalizeAllsvenskanSkaters
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


test("normalizes Elite Prospects SHL skater table rows and position", () => {
  const html = '<table><tr><th>Rank</th><th>Player</th></tr><tr><td>1.</td><td><img alt="Sweden"><a href="/player/oscar-lindberg">Oscar Lindberg (C)</a></td><td>Skellefteå AIK</td><td>14</td><td>6</td><td>13</td><td>19</td><td>1.36</td><td>14</td><td>3</td></tr><tr><td>2.</td><td><a href="/player/oliwer-kaski">Oliwer Kaski (D)</a></td><td>Malmö</td><td>14</td><td>7</td><td>6</td><td>13</td><td>0.93</td><td>6</td><td>2</td></tr></table>';
  const rows = normalizeEliteProspectsShlSkaters(html);
  assert.equal(rows.length,2);
  assert.equal(rows[0].name,"Oscar Lindberg");
  assert.equal(rows[0].position,"F");
  assert.equal(rows[0].points,19);
  assert.equal(rows[1].position,"D");
  assert.equal(rows[1].player_id,"ep:oliwer-kaski");
});

test("normalizes Elite Prospects SHL goalie table rows", () => {
  const html = '<table><tr><th>Rank</th><th>Player</th></tr><tr><td>1.</td><td><a href="/player/marek-langhamer">Marek Langhamer</a></td><td>Malmö</td><td>10</td><td>1.78</td><td>.932</td><td>7</td><td>3</td><td>-</td><td>2</td><td>608</td><td>247</td><td>18</td></tr></table>';
  const rows = normalizeEliteProspectsShlGoalies(html);
  assert.equal(rows.length,1);
  assert.equal(rows[0].position,"G");
  assert.equal(rows[0].save_percentage,93.2);
  assert.equal(rows[0].saves,247);
  assert.equal(rows[0].goals_against,18);
});


test("normalizes official HockeyAllsvenskan skater statistics", () => {
  const raw = {data:[
    {player_name:"Oskar Kvist",team_statnet_id:"MODO",gp:12,g:5,a:7,tp:12,pim:8,plus_minus:4,sog:31},
    {player_name:"Elias Pettersson",team_statnet_id:"AIK",gp:9,g:2,a:4,tp:6,pim:2,plus_minus:-1,sog:18}
  ]};
  const rows = normalizeAllsvenskanSkaters(raw);
  assert.equal(rows.length,2);
  assert.equal(rows[0].name,"Oskar Kvist");
  assert.equal(rows[0].games_played,12);
  assert.equal(rows[0].points,12);
  assert.equal(rows[0].player_id,"ha:oskar-kvist");
});

test("normalizes official HockeyAllsvenskan goalie statistics", () => {
  const raw = {data:[
    {player_name:"Robin Christoffersson",gp:10,svs:280,svs_perc:93.98,ga:18,gaa:1.8,w:7,l:2,so:2}
  ]};
  const rows = normalizeAllsvenskanGoalies(raw);
  assert.equal(rows.length,1);
  assert.equal(rows[0].position,"G");
  assert.equal(rows[0].save_percentage,93.98);
  assert.equal(rows[0].wins,7);
});
