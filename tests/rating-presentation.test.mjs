import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const presentation = require("../rating-presentation.js");
const escapeHtml = value => String(value ?? "").replace(/[&<>\"']/g, character => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;"
})[character]);

test("the player directory displays the exact sixteen attributes and separate potential without GEN", () => {
  const attributes = Object.fromEntries(presentation.ATTRIBUTES.map((attribute, index) => [attribute, 40 + index]));
  const html = presentation.directoryTable([{
    name: "Josh Anderson",
    kind: "LNH",
    league: "NHL",
    currentTeam: "MTL",
    pos: "AD",
    potential: 65,
    overall: 99,
    attributes,
    ratingStatus: "sample_adjusted_statistical_estimate_with_profile_completion",
    ratingSource: "NHL Stats REST"
  }], escapeHtml);
  const headers = [...html.matchAll(/<th>(.*?)<\/th>/g)].map(match => match[1]);

  assert.deepEqual(headers, ["Nom du joueur", "Type", "Ligue", "Équipe / droits", "Pos.", "POT", ...presentation.ATTRIBUTES]);
  assert.equal((html.match(/class="ratingCell"/g) || []).length, 17, "POT plus all sixteen attributes are shown");
  assert.match(html, /<td class="playerName">Josh Anderson<\/td>/);
  assert.doesNotMatch(html, /GEN|≈|ratingStatus|ratingSource|<small>/);
  assert.doesNotMatch(html, /<td class="ratingCell">99<\/td>/, "duplicate overall is not rendered as GEN");
});

test("directory pagination exposes every player across successive pages", () => {
  const players = Array.from({ length: 1201 }, (_, index) => ({ id: index }));
  const first = presentation.paginate(players, 0, 500);
  const second = presentation.paginate(players, 1, 500);
  const third = presentation.paginate(players, 2, 500);

  assert.equal(first.pageCount, 3);
  assert.equal(first.items.length, 500);
  assert.equal(second.items.length, 500);
  assert.equal(third.items.length, 201);
  assert.deepEqual([...first.items, ...second.items, ...third.items], players);
});

test("directory table safely escapes names and displays absent ratings as a dash", () => {
  const html = presentation.directoryTable([{ name: "A<BC>", attributes: { FI: 0 } }], escapeHtml);

  assert.match(html, /A&lt;BC&gt;/);
  assert.match(html, /<td class="ratingCell">0<\/td>/);
  assert.equal(presentation.displayValue(undefined), "—");
  assert.equal(presentation.displayValue(0), "0");
});

test("the application exposes the entire directory by searchable pages without old rating badges", () => {
  const html = readFileSync("index.html", "utf8");

  assert.match(html, /const PLAYER_DIRECTORY_PAGE_SIZE=500/);
  assert.match(html, /window\.hdRatingPresentation\.paginate\(filtered,playerDirectoryPage,PLAYER_DIRECTORY_PAGE_SIZE\)/);
  assert.match(html, /window\.hdRatingPresentation\.directoryTable\(page\.items,esc\)/);
  assert.match(html, /function changePlayerDirectoryPage\(delta\)/);
  assert.doesNotMatch(html, /filtered\.slice\(0,1000\)/);
  assert.doesNotMatch(html, /\bGEN\b|≈|hdRatingPresentation\.metadata/);
});
