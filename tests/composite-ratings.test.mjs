import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { Script, createContext } from "node:vm";
const registry = JSON.parse(await readFile("data/players/registry-index/ratings-lookup.json", "utf8"));
const keys = ["SH","PL","ST","CH","PO","HI","SK","EN","PE","FA","LE","SR"];
const mean = values => Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
test("every complete registry card obeys OFF, DEF and OA formulas (FI excluded)", () => {
  const players = registry.players || [];
  assert.ok(players.length >= 2500, "Expected full registry, got " + players.length);
  let checked = 0;
  for (const player of players) {
    const a = player.attributes;
    if (!a || !keys.every(key => Number.isInteger(a[key]) && a[key] >= 0 && a[key] <= 99)) continue;
    assert.equal(a.OFF, mean([a.SH, a.PL, a.ST]), player.name + ": OFF");
    assert.equal(a.DEF, mean([a.CH, a.PO, a.HI]), player.name + ": DEF");
    assert.equal(a.OA, mean([...keys.map(key => a[key]), a.OFF, a.DEF]), player.name + ": OA");
    assert.equal(player.overall, a.OA, player.name + ": overall");
    checked++;
  }
  assert.ok(checked >= 2500, "Expected at least 2500 complete rating cards, got " + checked);
});
test("FI does not influence OA", () => {
  const base = { SH:76, PL:75, ST:79, CH:83, PO:78, HI:83, SK:71, EN:78, PE:81, FA:55, LE:79, SR:79, OFF:77, DEF:81 };
  const oa = mean([...keys.map(key => base[key]), base.OFF, base.DEF]);
  const changedFi = { ...base, FI:0 };
  assert.equal(mean([...keys.map(key => base[key]), base.OFF, base.DEF]), oa);
  assert.equal(mean([...keys.map(key => changedFi[key]), changedFi.OFF, changedFi.DEF]), oa);
});

test("live development changes always rebuild OFF, DEF and OA and ignore FI", async () => {
  const html = await readFile("index.html", "utf8");
  const applyLine = html.split("\\n").find(line => line.startsWith("function applyDevelopment("));
  assert.ok(applyLine, "live development function exists");
  const context = createContext({
    S: { development: { "test-player": { attributeDelta: { FI: 40, SH: 3 } } } },
    window: {},
    hdCanonicalPlayerId: value => value,
    uhmDbPlayerId: () => "test-player",
    UHM_PLAYER_OVERRIDES_BY_ID: new Map()
  });
  new Script(applyLine + "\\nglobalThis.apply = applyDevelopment;").runInContext(context);
  const base = { FI:10, SH:76, PL:75, ST:79, CH:83, PO:78, HI:83, SK:71, EN:78, PE:81, FA:55, LE:79, SR:79, OFF:1, DEF:1, OA:1 };
  const result = context.apply("test-player", base, {});
  assert.equal(result.FI, 50);
  assert.equal(result.OFF, mean([79,75,79]));
  assert.equal(result.DEF, mean([83,78,83]));
  assert.equal(result.OA, mean([...keys.map(key => result[key]), result.OFF, result.DEF]));
  const fiOnly = { ...result, FI: 0 };
  assert.equal(fiOnly.OA, result.OA);
});
