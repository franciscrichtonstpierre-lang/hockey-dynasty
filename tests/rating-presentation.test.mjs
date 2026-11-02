import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const presentation = require("../rating-presentation.js");

test("player rating status and confidence are displayed in French", () => {
  assert.equal(
    presentation.metadata({
      ratingStatus: "sample_adjusted_statistical_estimate_with_profile_completion",
      ratingSource: "NHL Stats REST regular-season player statistics",
      ratingConfidence: "low",
      ratingSampleSize: 72,
      ratingSampleConfidence: "high"
    }),
    "Estimation statistique complétée par profil · Statistiques LNH · saison régulière · fiabilité faible · échantillon : 72 matchs (volume élevé)"
  );
});

test("cross-league sources are compact and keep their league/provider visible", () => {
  assert.equal(
    presentation.sourceLabel("Official AHL HockeyTech public player statistics feed | https://example.test/feed?team=1"),
    "Statistiques officielles LAH · HockeyTech"
  );
  assert.equal(
    presentation.sourceLabel("Official OHL HockeyTech / LeagueStat public player statistics feed | https://example.test/feed?team=1"),
    "Statistiques officielles OHL · HockeyTech / LeagueStat"
  );
});

test("unknown machine-readable statuses remain readable", () => {
  assert.equal(presentation.statusLabel("new_model_status"), "new model status");
  assert.equal(presentation.confidenceLabel("very_low"), "très faible");
});

test("the player-name column stays visible and wraps rating provenance", () => {
  const html = readFileSync("index.html", "utf8");
  assert.match(html, /\.rosterTable \.playerName\{width:210px;min-width:210px;max-width:210px;white-space:normal;overflow-wrap:anywhere;word-break:break-word;position:sticky;left:0;z-index:2;/);
  assert.match(html, /\.rosterTable \.playerName small\{display:block;white-space:normal;overflow-wrap:anywhere;word-break:break-word;/);
  assert.ok(html.indexOf('<script src="./rating-presentation.js') < html.lastIndexOf("<script>"));
  assert.match(html, /window\.hdRatingPresentation\.metadata\(ratingMeta\|\|\{\}\)/);
});
