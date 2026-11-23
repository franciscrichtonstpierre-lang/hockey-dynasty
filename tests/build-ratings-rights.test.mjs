import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

test("legacy NHL Stats REST ratings builder is blocked before network access", () => {
  const run = spawnSync(process.execPath, ["scripts/build-ratings.mjs"], { encoding:"utf8" });
  assert.notEqual(run.status, 0);
  assert.match(run.stderr, /Blocked NHL Stats REST ratings build \(prohibited\)/);
  assert.match(run.stderr, /commercialUseAllowed is explicitly not permitted/);
});
