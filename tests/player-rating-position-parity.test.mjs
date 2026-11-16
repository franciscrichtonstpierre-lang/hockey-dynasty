import test from "node:test";
import assert from "node:assert/strict";
import "../player-development.js";

const engine = globalThis.HDPlayerDevelopment;
const attributes = engine.ATTRIBUTES;
const base = Object.fromEntries(attributes.map((key) => [key, 70]));

for (const [position, label] of [["F", "attaquant"], ["D", "défenseur"], ["G", "gardien"]]) {
  test(`OFF, DEF, OA et FI suivent les mêmes règles pour un ${label}`, () => {
    const ratings = { ...base, SH: 90, PL: 60, ST: 75, CH: 80, PO: 50, HI: 65, FI: 0, OFF: 1, DEF: 2, OA: 3 };

    assert.equal(engine.calculateOffensiveOverall(ratings), 75);
    assert.equal(engine.calculateDefensiveOverall(ratings), 65);

    const expectedOA = Math.round((
      ratings.SH + ratings.PL + ratings.ST +
      ratings.CH + ratings.PO + ratings.HI +
      ratings.SK + ratings.EN + ratings.PE + ratings.FA + ratings.LE + ratings.SR +
      75 + 65
    ) / 14);

    assert.equal(engine.calculateOverall(ratings, position), expectedOA);
    assert.equal(engine.calculateOverall({ ...ratings, FI: 99 }, position), expectedOA);

    const player = { id: `formula-${position}`, position, overall: 70, potential: 90, attributes: ratings };
    const state = engine.createInitialState(player, null);
    const applied = engine.applyToRatings(ratings, state);

    assert.equal(applied.OFF, Math.round((applied.SH + applied.PL + applied.ST) / 3));
    assert.equal(applied.DEF, Math.round((applied.CH + applied.PO + applied.HI) / 3));
    assert.equal(applied.OA, engine.calculateOverall(applied, position));
    assert.equal(engine.calculateOverall({ ...applied, FI: 0 }, position), applied.OA);
    assert.equal(engine.calculateOverall({ ...applied, FI: 99 }, position), applied.OA);
  });
}
