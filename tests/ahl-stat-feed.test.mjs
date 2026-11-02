import test from "node:test";
import assert from "node:assert/strict";
import { findPlayerRows, parseJsonp, validatePlayerRows } from "../scripts/lib/ahl-stat-feed.mjs";

test("parses HockeyTech JSONP section rows and keeps source statistics", () => {
  const body = "([{" +
    '"sections":[{"data":[' +
    '{"prop":{"name":{"playerLink":"101","seoName":"Casey Example"}},"row":{"player_id":"101","name":"Casey Example","position":"C","team_code":"AAA","games_played":"12","goals":"4"}},' +
    '{"prop":{"name":{"playerLink":"102","seoName":"Riley Example"}},"row":{"player_id":"102","name":"Riley Example","position":"D","team_code":"BBB","games_played":"8","goals":"1"}}' +
    ']}]}])';

  const rows = findPlayerRows(parseJsonp(body));
  assert.equal(rows.length, 2);
  assert.equal(rows[0].player_id, "101");
  assert.equal(rows[0].games_played, "12");
  assert.equal(rows[0].team_code, "AAA");
  assert.equal(validatePlayerRows(rows, { minimum: 2, kind: "skater" }).length, 2);
});

test("accepts a player array and unwraps JSONP without a callback name", () => {
  assert.deepEqual(parseJsonp("([{\"sections\":[]}])"), [{ sections: [] }]);
  const rows = findPlayerRows([{ player_id: 7, games_played: 3, goals: 1 }]);
  assert.equal(rows.length, 1);
});

test("rejects incomplete feeds before replacing the snapshot", () => {
  assert.throws(
    () => validatePlayerRows([{ player_id: "1", name: "No stats" }], { minimum: 2, kind: "goalie" }),
    /response incomplete\/schema changed/
  );
});
