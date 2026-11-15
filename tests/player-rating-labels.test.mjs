import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("player editor labels FI as fighting and FA as faceoffs", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  assert.match(html, /\["FI","Combats"\]/);
  assert.match(html, /\["FA","Mises au jeu"\]/);
  assert.match(html, /FI:"fighting"/);
  assert.match(html, /FA:"faceoffs"/);
  assert.doesNotMatch(html, /\["FI","Mises au jeu"\]/);
  assert.doesNotMatch(html, /\["FA","Agressivité"\]/);
});
