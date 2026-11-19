// Completes the shared 16-rating card for every registry and free-agent player.
import { readFile, writeFile } from "node:fs/promises";
import { combineLeagueStatRows, createLeagueStatIndex, estimatePlayerPotential, estimatePlayerRatings, matchStatIndex, statNameKey } from "./lib/cross-league-rating-model.mjs";
import { RATING_ATTRIBUTES } from "./lib/player-ratings.mjs";

async function readJson(path, fallback = null) {
  try { return JSON.parse(await readFile(path, "utf8")); }
  catch (error) { if (error.code === "ENOENT" && fallback != null) return fallback; throw error; }
}
const registry = await readJson("data/players/registry.json");
const ratings = await readJson("data/ratings.json");
if (!Array.isArray(registry.players) || registry.players.length < 3000) throw new Error(`Full-registry rating pass stopped: expected at least 3000 players, found ${registry.players?.length ?? 0}.`);
const statsFiles = [
  "data/ahl/player-stats-2026-2027.json",
  "data/ahl/player-stats-2025-2026.json",
  "data/echl/player-stats-2026-2027.json",
  "data/echl/player-stats-2025-2026.json",
  "data/ncaa/player-stats-2026-2027.json",
  "data/ncaa/player-stats-2025-2026.json",
  "data/europe/player-stats-liiga-2026-2027.json",
  "data/europe/player-stats-liiga-2025-2026.json",
  "data/europe/player-stats-allsvenskan-2026-2027.json",
  "data/europe/player-stats-shl-2026-2027.json",
  "data/europe/player-stats-shl-2025-2026.json",
  "data/junior/player-stats-ohl-2026-2027.json",
  "data/junior/player-stats-ohl-2025-2026.json",
  "data/junior/player-stats-whl-2026-2027.json",
  "data/junior/player-stats-whl-2025-2026.json",
  "data/junior/player-stats-qmjhl-2026-2027.json",
  "data/junior/player-stats-qmjhl-2025-2026.json",
  "data/junior/player-stats-ushl-2026-2027.json",
  "data/junior/player-stats-ushl-2025-2026.json"
];
const statsIndexes = new Map();
for (const path of statsFiles) {
  let data = null;
  try { data = await readJson(path); }
  catch (error) { if (error.code !== "ENOENT") throw error; }
  if (data) {
    if (!statsIndexes.has(data.league)) statsIndexes.set(data.league, []);
    statsIndexes.get(data.league).push(createLeagueStatIndex(data));
  }
}
const directSourceRatings = ratings.players || {};
const directMetadata = ratings.playerMetadata || {};
const counts = { nhlStats:0, leagueStats:0, profileModel:0, minimalProfile:0 };
const exact = values => RATING_ATTRIBUTES.every(key => Number.isInteger(values?.[key]) && values[key] >= 0 && values[key] <= 99);

for (const player of registry.players || []) {
  const playerId = player.nhlPlayerId == null ? null : String(player.nhlPlayerId);
  const direct = playerId ? directSourceRatings[playerId] : null;
  const directMeta = playerId ? directMetadata[playerId] : null;
  const hasNhlStatistics = directMeta?.evidence === "nhl_player_statistics" || /NHL Stats REST/i.test(directMeta?.source || "");
  const match = matchStatIndex(player, statsIndexes, {
    // The preferred league feed is always tried first. If it has no match,
    // allow a unique current-season match from another official league; this
    // also handles loans and stale rights-team league labels without guessing.
    allowCrossLeague: !hasNhlStatistics
  });
  let statRow = match.row;
  let statIndex = match.index;
  // When a rights-only profile has no verified current league, a unique match
  // in an official league-wide statistics feed is sufficient to identify the
  // player's playing league (but not to invent a team name).
  if (statRow && statIndex?.league && ["UNKNOWN", "OTHER"].includes(String(player.currentLeague || "").toUpperCase())) {
    player.currentLeague = statIndex.league;
    player.leagueResolution = "unique_official_league_statistics_match";
  }
  if (statRow && match.additionalMatches?.length) {
    const currentGames = Number(statRow.games_played ?? statRow.gamesPlayed ?? statRow.GP ?? 0);
    if (currentGames > 0 && currentGames < 10) {
      const prior = match.additionalMatches[0];
      statRow = combineLeagueStatRows(statRow,prior.row);
      statIndex = {
        ...statIndex,
        season:`${prior.index.season} + ${statIndex.season}`,
        source:`${statIndex.source}; previous-season fallback: ${prior.index.source}`
      };
    }
  }
  // Prefer a player's current-league season over an older NHL season. Never
  // treat values produced by an earlier model run as source ratings.
  const useCurrentLeagueStats = Boolean(statRow && statIndex?.league !== "NHL");
  const useNhlStats = Boolean(direct && !useCurrentLeagueStats && hasNhlStatistics);
  const directMissing = direct ? RATING_ATTRIBUTES.filter(key => direct[key] == null) : [];
  const modelPlayer = useNhlStats ? player : { ...player, overall:null, attributes:null };
  const result = estimatePlayerRatings(modelPlayer, useCurrentLeagueStats ? statRow : null, useCurrentLeagueStats ? statIndex : null, useNhlStats ? direct : null);
  player.attributes = result.attributes;
  player.overall = result.overall;
  if (!(["source_verified", "verified"].includes(player.potentialStatus))) {
    const potential = estimatePlayerPotential({
      ...player,
      potentialStats:statRow || null,
      potentialLeague:statIndex?.league || player.currentLeague
    }, player.overall);
    player.potential = potential.value;
    player.potentialEstimate = potential.value;
    player.potentialStatus = potential.status;
    player.potentialEstimateMethod = potential.method;
    player.potentialConfidence = potential.confidence || "very_low";
    player.potentialEvidence = potential.evidence || "current_ability_and_age";
    player.potentialEvidenceSourceCount = 0;
    player.potentialReviewRequired = true;
  }
  player.ratedAttributes = RATING_ATTRIBUTES.slice();
  if (useNhlStats && directMeta) {
    player.ratingSource = directMeta.source || ratings.source;
    player.ratingConfidence = "low";
    player.ratingSampleConfidence = directMeta.sampleConfidence || "low";
    player.ratingSampleSize = directMeta.sampleSize ?? null;
    player.ratingStatus = directMissing.length ? "sample_adjusted_statistical_estimate_with_profile_completion" : (directMeta.status || "sample_adjusted_statistical_estimate");
    player.ratingMethod = "nhl_season_stats_with_shared_profile_completion_v1";
    player.ratingEvidence = "nhl_player_statistics";
    player.ratingModeledAttributes = RATING_ATTRIBUTES.filter(key => direct[key] == null);
    counts.nhlStats++;
  } else {
    const metadata = result.metadata;
    player.ratingSource = metadata.source;
    player.ratingConfidence = metadata.confidence;
    player.ratingSampleConfidence = metadata.sampleConfidence;
    player.ratingSampleSize = metadata.sampleSize;
    player.ratingStatus = metadata.status;
    player.ratingMethod = metadata.method;
    player.ratingEvidence = metadata.evidence;
    player.ratingModeledAttributes = metadata.modeledAttributes;
    if (useCurrentLeagueStats) counts.leagueStats++;
    else if (metadata.evidence === "minimal_player_profile") counts.minimalProfile++;
    else counts.profileModel++;
  }
  if (!exact(player.attributes)) throw new Error(`Invalid 16-rating card for ${player.name} (${player.id}).`);
}

// Apply owner-approved calibration anchors after statistical/profile estimates.
const calibrationOverrides = await readJson("data/ratings-calibration-overrides.json", { players:{} });
for (const player of registry.players || []) {
  const override = calibrationOverrides.players?.[String(player.nhlPlayerId || "")];
  if (!override) continue;
  player.attributes = { ...player.attributes, ...override.attributes };
  // Re-derive composite attributes and OA from the 14 non-FI fields.
  player.attributes.OFF = Math.round((player.attributes.SH + player.attributes.PL + player.attributes.ST) / 3);
  player.attributes.DEF = Math.round((player.attributes.CH + player.attributes.PO + player.attributes.HI) / 3);
  const oaKeys = RATING_ATTRIBUTES.filter(key => key !== "FI" && key !== "OA");
  player.attributes.OA = Math.round(oaKeys.reduce((sum, key) => sum + player.attributes[key], 0) / oaKeys.length);
  player.overall = player.attributes.OA;
  player.potential = override.potential;
  player.potentialEstimate = override.potential;
  player.potentialStatus = override.potentialStatus || "provisional_model_estimate";
  player.ratingSource = override.ratingSource;
  player.ratingConfidence = override.ratingConfidence;
  player.ratingStatus = override.ratingStatus;
  player.ratingMethod = override.ratingMethod;
  player.ratingEvidence = "owner_approved_calibration_anchor";
  player.ratingModeledAttributes = [];
  player.ratedAttributes = RATING_ATTRIBUTES.slice();
  if (!exact(player.attributes)) throw new Error(`Invalid calibrated rating card for ${player.name}.`);
  const oa = Math.round(oaKeys.reduce((sum, key) => sum + player.attributes[key], 0) / oaKeys.length);
  if (oa !== player.attributes.OA) throw new Error(`Calibrated OA mismatch for ${player.name}: ${player.attributes.OA} vs ${oa}.`);
}

// Source-reviewed scouting potentials take precedence over pilot calibration anchors.
const potentialOverrides = await readJson("data/potential-scouting-overrides.json", { players:{} });
let potentialOverridesApplied = 0;
for (const player of registry.players || []) {
  const override = potentialOverrides.players?.[player.id];
  if (!override) continue;
  if (!Number.isInteger(override.potential) || override.potential < 0 || override.potential > 99 || !override.source || !override.rationale) {
    throw new Error(`Invalid source-reviewed potential override for ${player.name}.`);
  }
  const potentialFloor = Math.max(0, Number(player.overall) || 0);
  const floorAdjusted = potentialFloor > override.potential;
  const appliedPotential = Math.max(override.potential, potentialFloor);
  player.potential = appliedPotential;
  player.potentialEstimate = appliedPotential;
  player.potentialStatus = floorAdjusted ? "provisional_model_estimate" : "scouting_source_reviewed_estimate";
  player.potentialEstimateMethod = floorAdjusted
    ? "oa_floor_invariant_correction_2026-11-05; requires_source_review"
    : "manual_source_review_2026-11-04";
  player.potentialSource = override.source;
  player.potentialEvidence = floorAdjusted
    ? "source_reviewed_value_floor_adjusted_requires_recheck"
    : "published_scouting_sources";
  player.potentialEvidenceSourceCount = String(override.source || "").split(";").map(value => value.trim()).filter(Boolean).length;
  player.potentialConfidence = floorAdjusted ? "low" : (override.confidence || "medium");
  player.potentialRationale = floorAdjusted
    ? `${override.rationale} Floor-adjusted to current OA ${potentialFloor}; this correction requires a fresh source review.`
    : override.rationale;
  player.potentialReviewRequired = floorAdjusted;
  player.potentialReviewResolution = floorAdjusted ? null : "manual_source_review_2026-11-04";
  potentialOverridesApplied++;
}
console.log(`Source-reviewed potential overrides applied: ${potentialOverridesApplied}.`);

// Final full-registry audit: no player may be published with a missing or stale composite.
const oaKeysAudit = RATING_ATTRIBUTES.filter(key => key !== "FI" && key !== "OA");
let auditedPlayers = 0;
for (const player of registry.players || []) {
  const a = player.attributes;
  if (!exact(a)) throw new Error(`Full-registry audit found incomplete attributes for ${player.name} (${player.id}).`);
  const expectedOff = Math.round((a.SH + a.PL + a.ST) / 3);
  const expectedDef = Math.round((a.CH + a.PO + a.HI) / 3);
  const expectedOa = Math.round(oaKeysAudit.reduce((sum, key) => sum + a[key], 0) / oaKeysAudit.length);
  if (a.OFF !== expectedOff || a.DEF !== expectedDef || a.OA !== expectedOa || player.overall !== expectedOa) {
    throw new Error(`Full-registry composite mismatch for ${player.name} (${player.id}): OFF ${a.OFF}/${expectedOff}, DEF ${a.DEF}/${expectedDef}, OA ${a.OA}/${expectedOa}, overall ${player.overall}.`);
  }
  auditedPlayers++;
}
console.log(`FULL REGISTRY RATING AUDIT PASSED: ${auditedPlayers} / ${registry.players.length} players; 16 attributes complete; OFF/DEF/OA verified.`);

// Publish current NHL ratings to the NHL-ID lookup used by live NHL rosters.
// Keep historical NHL-stat rows intact for players currently assigned abroad.
for (const player of registry.players || []) {
  if (player.nhlPlayerId == null || player.currentLeague !== "NHL") continue;
  const id = String(player.nhlPlayerId);
  directSourceRatings[id] = player.attributes;
  const fightingMajors = directMetadata[id]?.fightingMajors ?? null;
  directMetadata[id] = {
    source:player.ratingSource, status:player.ratingStatus, confidence:player.ratingConfidence,
    sampleConfidence:player.ratingSampleConfidence || null, sampleSize:player.ratingSampleSize ?? null, fightingMajors,
    ratedAttributes:player.ratedAttributes, modeledAttributes:player.ratingModeledAttributes || [],
    method:player.ratingMethod, evidence:player.ratingEvidence, position:player.detailedPosition || player.position || null,
    season:ratings.season || "2026-2027"
  };
}

// The NHL stats table can include players absent from the current registry,
// and omits role-inapplicable fields (goalie skater attributes and faceoffs).
// Complete those fields as model estimates and retain that distinction.
for (const [id, raw] of Object.entries(directSourceRatings)) {
  const previous = directMetadata[id] || {};
  const missing = RATING_ATTRIBUTES.filter(key => !Number.isInteger(raw?.[key]) || raw[key] < 0 || raw[key] > 99);
  const position = previous.position || (/goalie/i.test(previous.source || "") ? "G" : "UNKNOWN");
  if (missing.length) {
    const completion = estimatePlayerRatings({ currentLeague:"NHL", position, overall:raw?.OA ?? null }, null, null, raw);
    directSourceRatings[id] = completion.attributes;
  }
  const evidence = previous.evidence || (previous.sampleSize != null ? "nhl_player_statistics" : "player_profile");
  directMetadata[id] = {
    ...previous,
    source:previous.source || ratings.source || "Hockey Dynasty profile model; no external rating source",
    status:missing.length && evidence === "nhl_player_statistics" ? "sample_adjusted_statistical_estimate_with_profile_completion" : (previous.status || "minimal_profile_model_estimate"),
    confidence:previous.confidence || (previous.sampleSize != null ? "low" : "very_low"),
    sampleConfidence:previous.sampleConfidence ?? null,
    sampleSize:previous.sampleSize ?? null,
    ratedAttributes:RATING_ATTRIBUTES.slice(),
    modeledAttributes:[...new Set([...(previous.modeledAttributes || []), ...missing])],
    method:previous.method || (evidence === "nhl_player_statistics" ? "nhl_season_stats_with_profile_completion_v1" : "cross_league_profile_model_v1"),
    evidence,
    position,
    season:previous.season || ratings.season || "2026-2027"
  };
}
ratings.schemaVersion = 3;
ratings.attributes = RATING_ATTRIBUTES.slice();
ratings.playerCount = Object.keys(directSourceRatings).length;
ratings.players = directSourceRatings;
ratings.playerMetadata = directMetadata;
ratings.description = "Complete shared 16-attribute model. NHL and league statistics inform low-confidence estimates; other players receive explicitly labelled profile-model estimates. These are not verified scouting grades.";

const freeAgents = await readJson("data/free-agents/2026-2027.json", { players:[] });
const registryByName = new Map();
for (const player of registry.players || []) {
  const key = statNameKey(player.name);
  if (!registryByName.has(key)) registryByName.set(key, []);
  registryByName.get(key).push(player);
}
for (const player of freeAgents.players || []) {
  const matches = registryByName.get(statNameKey(player.name)) || [];
  if (matches.length === 1) {
    const record = matches[0];
    player.attributes = record.attributes;
    player.overall = record.overall;
    player.ratingSource = record.ratingSource;
    player.ratingConfidence = record.ratingConfidence;
    player.ratingSampleConfidence = record.ratingSampleConfidence ?? null;
    player.ratingSampleSize = record.ratingSampleSize ?? null;
    player.ratingStatus = record.ratingStatus;
    player.ratingMethod = record.ratingMethod;
    player.ratingEvidence = record.ratingEvidence;
    player.potential = record.potential;
    player.potentialEstimate = record.potentialEstimate;
    player.potentialStatus = record.potentialStatus;
    player.potentialEstimateMethod = record.potentialEstimateMethod;
    player.ratedAttributes = RATING_ATTRIBUTES.slice();
    player.ratingModeledAttributes = record.ratingModeledAttributes || [];
  } else {
    const result = estimatePlayerRatings({ ...player, overall:null, attributes:null }, null, null, null);
    player.attributes = result.attributes;
    player.overall = result.overall;
    Object.assign(player, {
      ratingSource:result.metadata.source, ratingConfidence:result.metadata.confidence,
      ratingStatus:result.metadata.status, ratingMethod:result.metadata.method,
      ratingEvidence:result.metadata.evidence, ratedAttributes:RATING_ATTRIBUTES.slice(),
      ratingModeledAttributes:result.metadata.modeledAttributes
    });
  }
  if (!(["source_verified", "verified"].includes(player.potentialStatus))) {
    const potential = estimatePlayerPotential(player, player.overall);
    player.potential = potential.value;
    player.potentialEstimate = potential.value;
    player.potentialStatus = potential.status;
    player.potentialEstimateMethod = potential.method;
  }
  if (!exact(player.attributes)) throw new Error(`Invalid 16-rating card for free agent ${player.name} (${player.id}).`);
}

// Full-registry potential audit: every player must have a valid projection at or above current OA.
const potentialAudit = { total:registry.players.length, sourceReviewed:0, modelEstimated:0, unresolved:0 };
for (const player of registry.players || []) {
  const value = player.potential;
  const oa = Number(player.overall);
  if (!Number.isInteger(value) || value < 0 || value > 99) throw new Error(`Invalid/missing potential for ${player.name} (${player.id}): ${value}.`);
  if (Number.isFinite(oa) && value < oa) throw new Error(`Potential below OA for ${player.name} (${player.id}): PA ${value}, OA ${oa}.`);
  if (player.potentialStatus === "scouting_source_reviewed_estimate") {
    if (!player.potentialSource || !player.potentialRationale || player.potentialReviewRequired) throw new Error(`Incomplete source-reviewed potential evidence for ${player.name} (${player.id}).`);
    potentialAudit.sourceReviewed++;
  } else if (player.potentialStatus === "provisional_model_estimate") {
    if (!player.potentialEstimateMethod) throw new Error(`Missing potential model method for ${player.name} (${player.id}).`);
    potentialAudit.modelEstimated++;
  } else {
    potentialAudit.unresolved++;
    throw new Error(`Unrecognized potential status for ${player.name} (${player.id}): ${player.potentialStatus}.`);
  }
}
if (potentialAudit.total < 3000 || potentialAudit.sourceReviewed < 300 || potentialAudit.modelEstimated < 1) throw new Error(`Full-registry potential coverage failed: ${JSON.stringify(potentialAudit)}.`);
console.log(`FULL REGISTRY POTENTIAL AUDIT PASSED: ${JSON.stringify(potentialAudit)}; all values 0-99 and PA >= OA.`);

const leagueCoverage = {};
for (const player of registry.players || []) {
  const league = String(player.currentLeague || "UNKNOWN");
  leagueCoverage[league] ||= { total:0, nhlStatistics:0, currentLeagueStatistics:0, profileModel:0, minimalProfile:0 };
  const bucket = leagueCoverage[league];
  bucket.total++;
  if (player.ratingEvidence === "nhl_player_statistics") bucket.nhlStatistics++;
  else if (player.ratingEvidence === "league_statistics") bucket.currentLeagueStatistics++;
  else if (player.ratingEvidence === "minimal_player_profile") bucket.minimalProfile++;
  else bucket.profileModel++;
}
registry.ratingsMetadata = {
  ...(registry.ratingsMetadata || {}), schemaVersion:3, attributes:RATING_ATTRIBUTES.slice(),
  method:"cross-league statistics and source-labelled player-profile estimates; potential stored separately",
  counts:{ ...counts, total:registry.players.length, freeAgents:freeAgents.players.length }, leagueCoverage
};
registry.description = "Every registry player has the exact 16-attribute card. Source-backed statistical model estimates and low-confidence profile estimates are labelled separately; none are presented as verified scouting grades, and potential is stored independently.";
await writeFile("data/players/registry.json", JSON.stringify(registry, null, 2) + "\n", "utf8");
await writeFile("data/ratings.json", JSON.stringify(ratings) + "\n", "utf8");
await writeFile("data/free-agents/2026-2027.json", JSON.stringify(freeAgents, null, 2) + "\n", "utf8");
console.log(`Player ratings completed: ${registry.players.length} registry records (${counts.nhlStats} NHL-stat, ${counts.leagueStats} league-stat, ${counts.profileModel} profile estimates, ${counts.minimalProfile} minimal-profile estimates) and ${freeAgents.players.length} free agents.`);
