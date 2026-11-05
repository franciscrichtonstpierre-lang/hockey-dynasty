import test from "node:test";
import assert from "node:assert/strict";
import { normalizeShlHtmlSkaters, normalizeShlHtmlGoalies } from "../scripts/lib/european-stat-feed.mjs";

test("parses official SHL skater summary HTML rows", () => {
  const html = `<table>
    <tr><th>Rank</th><th>Spelare</th><th>LAG</th><th>GP</th><th>TP</th><th>G</th><th>A</th></tr>
    <tr><td>1.</td><td>O Lindberg</td><td>Skellefteå AIK</td><td>14</td><td>19</td><td>6</td><td>13</td><td>14</td><td>0</td><td>5</td><td>40</td><td>11</td><td>4</td><td>13</td><td>10</td><td>3</td><td>18:42</td><td>1.36</td></tr>
  </table>`;
  const rows = normalizeShlHtmlSkaters(html);
  assert.equal(rows.length,1);
  assert.equal(rows[0].name,"O Lindberg");
  assert.equal(rows[0].games_played,14);
  assert.equal(rows[0].points,19);
  assert.equal(rows[0].goals,6);
  assert.equal(rows[0].assists,13);
  assert.equal(rows[0].player_id,"shlhtml:o-lindberg");
});

test("parses official SHL goalkeeper summary HTML rows", () => {
  const html = `<table>
    <tr><th>Rank</th><th>Spelare</th><th>LAG</th><th>SVS</th><th>SVS%</th><th>GP</th><th>GPI</th><th>GA</th><th>GAA</th><th>W</th><th>T</th><th>L</th><th>SO</th><th>MIP</th></tr>
    <tr><td>1.</td><td>M Thelin</td><td>Färjestad BK</td><td>166</td><td>95.95</td><td>14</td><td>7</td><td>7</td><td>0.99</td><td>7</td><td>0</td><td>0</td><td>3</td><td>425:00</td></tr>
  </table>`;
  const rows = normalizeShlHtmlGoalies(html);
  assert.equal(rows.length,1);
  assert.equal(rows[0].name,"M Thelin");
  assert.equal(rows[0].games_played,14);
  assert.equal(rows[0].saves,166);
  assert.equal(rows[0].save_percentage,95.95);
  assert.equal(rows[0].goals_against_average,0.99);
  assert.equal(rows[0].wins,7);
  assert.equal(rows[0].shutouts,3);
});
