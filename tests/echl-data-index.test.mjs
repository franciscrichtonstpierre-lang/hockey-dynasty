import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = new URL("../data/echl/", import.meta.url);
const readJson = name => JSON.parse(readFileSync(fileURLToPath(new URL(name, root)), "utf8"));
const index = readJson("teams.json");
const slug = value => String(value || "")
  .normalize("NFD")
  .replace(/[\\u0300-\\u036f]/g, "")
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-|-$/g, "");

test("all 30 ECHL team index paths preserve full normalized team names", () => {
  assert.equal(index.teamCount, 30);
  assert.equal(index.rostersFetched, 30);
  assert.equal(index.failed, 0);
  assert.equal(index.teams.length, 30);
  for (const team of index.teams) {
    assert.equal(team.file, slug(team.teamName) + ".json", team.teamName + " file name");
    const roster = readJson(team.file);
    assert.equal(roster.teamName, team.teamName);
    assert.ok(roster.players.length >= 10, team.teamName + " roster must be populated");
  }
});
