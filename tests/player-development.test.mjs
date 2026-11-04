import test from "node:test";
import assert from "node:assert/strict";
import "../player-development.js";

const engine = globalThis.HDPlayerDevelopment;
const attributes = engine.ATTRIBUTES;
const player = {
  id: "nhl:8470001",
  name: "Prospect Test",
  birthDate: "2007-06-15",
  position: "F",
  overall: 68,
  potential: 91,
  potentialStatus: "provisional_model_estimate",
  attributes: Object.fromEntries(attributes.map((key, index) => [key, 55 + (index % 12)]))
};
const start = new Date("2026-10-07T00:00:00Z");
const training = { focus: "Développement des jeunes", intensity: "Normale", coachSkill: 78, facilities: 65 };

test("maps visible 0–99 ratings to internal 1–200 ability", () => {
  assert.equal(engine.visibleToAbility(0), 1);
  assert.equal(engine.visibleToAbility(99), 200);
  assert.equal(engine.abilityToVisible(1), 0);
  assert.equal(engine.abilityToVisible(200), 99);
});

test("tracks all 16 attributes with individual CA and PA ceilings", () => {
  const state = engine.createInitialState(player, null);
  assert.deepEqual(Object.keys(state.abilityAttributes), attributes);
  for (const key of attributes) {
    assert.ok(state.abilityAttributes[key].ca >= 1 && state.abilityAttributes[key].ca <= 200);
    assert.ok(state.abilityAttributes[key].pa >= state.abilityAttributes[key].ca);
    assert.ok(state.abilityAttributes[key].pa <= 200);
  }
  assert.equal(state.potentialIsEstimated, true);
});


test("migrates existing overall and attribute-specific development deltas", () => {
  const legacy = engine.createInitialState(player, {
    delta: 2,
    attributeDelta: { SH: 3 },
    experience: 14
  });
  assert.equal(engine.abilityToVisible(legacy.abilityAttributes.FI.ca), player.attributes.FI + 2);
  assert.equal(engine.abilityToVisible(legacy.abilityAttributes.SH.ca), player.attributes.SH + 5);
  assert.equal(legacy.schemaVersion, 2);
});

test("assigns a position-specific individual peak age", () => {
  const forward = engine.createInitialState({ ...player, position: "F" }, null);
  const defender = engine.createInitialState({ ...player, id: "nhl:8470002", position: "D" }, null);
  const goalie = engine.createInitialState({ ...player, id: "nhl:8470003", position: "G" }, null);
  assert.ok(forward.peakAge >= 24 && forward.peakAge <= 27);
  assert.ok(defender.peakAge >= 25 && defender.peakAge <= 29);
  assert.ok(goalie.peakAge >= 27 && goalie.peakAge <= 31);
});

test("development is accumulated over days and never exceeds an attribute PA", () => {
  let state = engine.createInitialState(player, null);
  for (let block = 0; block < 12; block++) {
    const date = new Date(start.getTime() + block * 28 * 86400000);
    state = engine.advancePlayer(player, state, { days: 28, asOf: date, training }).state;
  }
  for (const key of attributes) {
    assert.ok(state.abilityAttributes[key].ca <= state.abilityAttributes[key].pa, key);
    assert.ok(Number.isFinite(state.abilityAttributes[key].progress), key);
  }
});

test("28 days at once equals four consecutive 7-day blocks", () => {
  const initial = engine.createInitialState(player, null);
  const oneBlock = engine.advancePlayer(player, structuredClone(initial), {
    days: 28, asOf: start, training
  }).state;
  let fourBlocks = structuredClone(initial);
  for (let block = 0; block < 4; block++) {
    const date = new Date(start.getTime() + block * 7 * 86400000);
    fourBlocks = engine.advancePlayer(player, fourBlocks, {
      days: 7, asOf: date, training
    }).state;
  }
  assert.deepEqual(fourBlocks, oneBlock);
});

test("injuries slow development without erasing stored ability", () => {
  const initial = engine.createInitialState(player, null);
  const healthy = engine.advancePlayer(player, structuredClone(initial), {
    days: 28, asOf: start, training, injuredDays: 0
  }).state;
  const injured = engine.advancePlayer(player, structuredClone(initial), {
    days: 28, asOf: start, training, injuredDays: 28
  }).state;
  const totalProgress = state => attributes.reduce((sum, key) => {
    const initialAbility = initial.abilityAttributes[key].ca;
    const current = state.abilityAttributes[key];
    return sum + (current.ca - initialAbility) + current.progress;
  }, 0);
  assert.ok(totalProgress(injured) < totalProgress(healthy));
  for (const key of attributes) assert.ok(injured.abilityAttributes[key].ca >= 1);
});


test("applies each attribute's current ability to its visible 0–99 rating", () => {
  const state = engine.createInitialState(player, null);
  const key = "FI";
  state.abilityAttributes[key].ca = engine.visibleToAbility(81);
  const result = engine.applyToRatings(player.attributes, state);
  assert.equal(result[key], 81);
  assert.equal(result.SH, engine.abilityToVisible(state.abilityAttributes.SH.ca));
});

test("application changes only the 16 visible ratings and keeps them within 0–99", () => {
  const initial = engine.createInitialState(player, null);
  const advanced = engine.advancePlayer(player, initial, { days: 28, asOf: start, training }).state;
  const result = engine.applyToRatings(player.attributes, advanced);
  assert.deepEqual(Object.keys(result), attributes);
  for (const key of attributes) assert.ok(result[key] >= 0 && result[key] <= 99);
});
