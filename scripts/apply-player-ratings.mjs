// Completes the shared 16-rating card for every registry and free-agent player.
import { readFile, writeFile } from "node:fs/promises";
import { createLeagueStatIndex, estimatePlayerPotential, estimatePlayerRatings, matchStatIndex, statNameKey } from "./lib/cross-league-rating-model.mjs";
import { RATING_ATTRIBUTES } from "./lib/player-ratings.mjs";

async function readJson(path, fallback = null) {
  try { return JSON.parse(await readFile(path, "utf8")); }
  catch (error) { if (error.code === "ENOENT" && fallback != null) return fallback; throw error; }
}
const registry = await readJson("data/players/registry.json");
const ratings = await readJson("data/ratings.json");
const statsFiles = [
  "data/ahl/player-stats-2026-2027.json",
  "data/echl/player-stats-2026-2027.json",
  "data/junior/player-stats-ohl-2026-2027.json",
  "data/junior/player-stats-whl-2026-2027.json",
  "data/junior/player-stats-qmjhl-2026-2027.json",
  "data/junior/player-stats-ushl-2026-2027.json"
];
const statsIndexes = new Map();
for (const path of statsFiles) {
  const data = await readJson(path, null);
  if (data) statsIndexes.set(data.league, createLeagueStatIndex(data));
}
const directSourceRatings = ratings.players || {};
const directMetadata = ratings.playerMetadata || {};
const counts = { nhlStats:0, leagueStats:0, profileModel:0, minimalProfile:0 };
const exact = values => RATING_ATTRIBUTES.every(key => Number.isInteger(values?.[key]) && values[key] >= 0 && values[key] <= 99);

for (const player of registry.players || []) {
  const playerId = player.nhlPlayerId == null ? null : String(player.nhlPlayerId);
  const direct = playerId ? directSourceRatings[playerId] : null;
  const directMeta = playerId ? directMetadata[playerId] : null;
  const match = matchStatIndex(player, statsIndexes);
  const statRow = match.row;
  const statIndex = match.index;
  // Prefer a player's current-league season over an older NHL season. Never
  // treat values produced by an earlier model run as source ratings.
  const useCurrentLeagueStats = Boolean(statRow && String(player.currentLeague || player.league).toUpperCase() !== "NHL");
  const hasNhlStatistics = directMeta?.evidence === "nhl_player_statistics" || /NHL Stats REST/i.test(directMeta?.source || "");
  const useNhlStats = Boolean(direct && !useCurrentLeagueStats && hasNhlStatistics);
  const directMissing = direct ? RATING_ATTRIBUTES.filter(key => direct[key] == null) : [];
  const modelPlayer = useNhlStats ? player : { ...player, overall:null, attributes:null };
  const result = estimatePlayerRatings(modelPlayer, useCurrentLeagueStats ? statRow : null, useCurrentLeagueStats ? statIndex : null, useNhlStats ? direct : null);
  player.attributes = result.attributes;
  player.overall = result.overall;
  if (!(["source_verified", "verified"].includes(player.potentialStatus))) {
    const potential = estimatePlayerPotential(player, player.overall);
    player.potential = potential.value;
    player.potentialEstimate = potential.value;
    player.potentialStatus = potential.status;
    player.potentialEstimateMethod = potential.method;
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

// Publish current NHL ratings to the NHL-ID lookup used by live NHL rosters.
// Keep historical NHL-stat rows intact for players currently assigned abroad.
for (const player of registry.players || []) {
  if (player.nhlPlayerId == null || player.currentLeague !== "NHL") continue;
  const id = String(player.nhlPlayerId);
  directSourceRatings[id] = player.attributes;
  directMetadata[id] = {
    source:player.ratingSource, status:player.ratingStatus, confidence:player.ratingConfidence,
    sampleConfidence:player.ratingSampleConfidence || null, sampleSize:player.ratingSampleSize ?? null,
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
