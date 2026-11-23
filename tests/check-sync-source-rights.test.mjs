import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

test("bulk multi-league sync is blocked before fetching unapproved feeds", () => {
  const run = spawnSync(process.execPath, ["scripts/check-sync-source-rights.mjs"], { encoding:"utf8" });
  assert.notEqual(run.status, 0);
  assert.match(run.stderr, /Multi-league data sync is blocked/);
  assert.match(run.stderr, /nhl_public_api_rosters_2026_2027/);
  assert.match(run.stderr, /ahl_hockeytech_rosters_stats_2026_2027/);
  assert.match(run.stderr, /future_draft_prospect_pages_2027_2029/);
});
