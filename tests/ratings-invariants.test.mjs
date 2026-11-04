import test from "node:test";
import assert from "node:assert/strict";
import { estimatePlayerRatings } from "../scripts/lib/cross-league-rating-model.mjs";
import { RATING_ATTRIBUTES } from "../scripts/lib/player-ratings.mjs";

const card = (fi) => ({
  FI: fi, SH:78, PL:75, ST:70, CH:82, PO:80, HI:68, SK:76,
  EN:74, PE:72, FA:65, LE:77, SR:73, OFF:79, DEF:81, OA:99
});

test("FI changes never affect OA", () => {
  const low = estimatePlayerRatings({ name:"Test Skater", position:"F", currentLeague:"NHL", attributes:card(5) });
  const high = estimatePlayerRatings({ name:"Test Skater", position:"F", currentLeague:"NHL", attributes:card(99) });
  assert.equal(low.attributes.OA, high.attributes.OA);
  assert.equal(low.attributes.FI, 5);
  assert.equal(high.attributes.FI, 99);
});

test("OFF and DEF are derived from their three component attributes, overriding imported values", () => {
  const result = estimatePlayerRatings({ name:"Test Skater", position:"D", currentLeague:"NHL", attributes:card(20) });
  assert.equal(result.attributes.OFF, Math.round((78 + 75 + 70) / 3));
  assert.equal(result.attributes.DEF, Math.round((82 + 80 + 68) / 3));
});

test("OA is recalculated from the 14 non-FI attributes, not retained from input", () => {
  const result = estimatePlayerRatings({ name:"Test Skater", position:"D", currentLeague:"NHL", attributes:card(20) });
  const weights = {SH:.08,PL:.08,ST:.05,CH:.08,PO:.10,HI:.05,SK:.06,EN:.08,PE:.08,FA:.03,LE:.05,SR:.08,OFF:.10,DEF:.08};
  const expected = Math.round(Object.entries(weights).reduce((sum,[key,weight])=>sum+result.attributes[key]*weight,0)/Object.values(weights).reduce((sum,weight)=>sum+weight,0));
  assert.equal(result.attributes.OA, expected);
  assert.notEqual(result.attributes.OA, 99);
});

test("goalie OFF and DEF also follow the component formulas", () => {
  const goalie = estimatePlayerRatings({ name:"Test Goalie", position:"G", currentLeague:"NHL", attributes:card(10) });
  assert.equal(goalie.attributes.OFF, Math.round((78 + 75 + 70) / 3));
  assert.equal(goalie.attributes.DEF, Math.round((82 + 80 + 68) / 3));
});

test("goalies retain all 16 bounded card attributes and FI is not part of OA", () => {
  const goalie = estimatePlayerRatings({ name:"Test Goalie", position:"G", currentLeague:"NHL", attributes:card(10) });
  assert.deepEqual(Object.keys(goalie.attributes), RATING_ATTRIBUTES);
  for (const key of RATING_ATTRIBUTES) assert.ok(Number.isInteger(goalie.attributes[key]) && goalie.attributes[key]>=0 && goalie.attributes[key]<=99);
  const altered = estimatePlayerRatings({ name:"Test Goalie", position:"G", currentLeague:"NHL", attributes:card(99) });
  assert.equal(goalie.attributes.OA, altered.attributes.OA);
});
