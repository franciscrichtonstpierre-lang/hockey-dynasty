import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("rating evidence schema accepts advanced metrics and tracking percentiles", async () => {
  const schema = JSON.parse(await readFile(new URL("../data/rating-source-observation.schema.json", import.meta.url), "utf8"));
  assert.ok(schema.properties.sourceType.enum.includes("advanced_metrics_feed"));
  assert.ok(schema.properties.sourceType.enum.includes("player_tracking_data"));
  assert.equal(schema.properties.normalizedPercentile.minimum, 0);
  assert.equal(schema.properties.normalizedPercentile.maximum, 1);
  assert.equal(schema.properties.sampleSize.minimum, 0);
  assert.ok(schema.properties.metric);
});
