// GM Connected-inspired evidence model (independent implementation).
// Consumes normalized percentile evidence from authorized public data feeds.
// It deliberately does not fetch data, infer unavailable traits, or modify production ratings.

const clamp = (value, min = 0, max = 99) => Math.max(min, Math.min(max, value));
const finite = value => typeof value === "number" && Number.isFinite(value);
const score = percentile => finite(percentile) && percentile >= 0 && percentile <= 1
  ? clamp(Math.round(10 + percentile * 89)) : null;

function familyScore(evidence, keys) {
  const values = keys.map(key => evidence?.[key]).filter(value => finite(value) && value >= 0 && value <= 1);
  if (!values.length) return null;
  return score(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function sampleConfidence(games) {
  if (!finite(games) || games <= 0) return "very_low";
  if (games >= 50) return "high";
  if (games >= 25) return "medium";
  return "low";
}

const SKATER_FAMILIES = Object.freeze({
  OFF: ["ixgPer60Percentile", "goalsAboveExpectedPer60Percentile", "primaryPointsPer60Percentile", "shotGenerationPer60Percentile"],
  DEF: ["xgaSuppressionPercentile", "expectedGoalDifferentialPercentile", "shotAttemptSuppressionPercentile"],
  SH: ["ixgPerShotPercentile", "goalsAboveExpectedPercentile", "shotVolumePer60Percentile"],
  PL: ["primaryAssistsPer60Percentile", "chanceCreationPercentile", "controlledEntriesPercentile", "controlledExitsPercentile"],
  SK: ["topSpeedPercentile", "speedBurstsPercentile", "highIntensityDistancePercentile"],
  FA: ["faceoffWinPercentile"],
  EN: ["availabilityPercentile", "sustainedWorkloadPercentile"],
  PE: ["penaltyDifferentialPercentile"]
});

const OA_WEIGHTS = Object.freeze({
  F: { OFF:0.20, DEF:0.10, SH:0.12, PL:0.12, SK:0.10, FA:0.06, EN:0.07, PE:0.05, ST:0.04, CH:0.04, PO:0.04, HI:0.02, LE:0.02, SR:0.02 },
  D: { OFF:0.10, DEF:0.20, SH:0.06, PL:0.08, SK:0.10, FA:0.02, EN:0.07, PE:0.05, ST:0.05, CH:0.08, PO:0.09, HI:0.04, LE:0.02, SR:0.04 }
});

function calculateWeightedOverall(attributes, position) {
  const weights = OA_WEIGHTS[position];
  if (!weights) return null;
  let total = 0, weightTotal = 0;
  const possibleWeight = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
  for (const [key, weight] of Object.entries(weights)) {
    const value = attributes[key];
    if (!finite(value)) continue;
    total += value * weight;
    weightTotal += weight;
  }
  // Do not let one or two available metrics masquerade as a complete Overall.
  if (!weightTotal || weightTotal / possibleWeight < 0.5) return null;
  return clamp(Math.round(total / weightTotal));
}

export function evaluateAdvancedSkater(player, evidence = {}) {
  const rawPosition = String(player?.position || player?.positionCode || "").toUpperCase();
  const position = rawPosition === "D" || rawPosition.includes("DEF") ? "D"
    : ["F","C","LW","RW","L","R","W","FORWARD","CENTER","CENTRE"].includes(rawPosition) ? "F" : null;
  if (!position) return { status:"unsupported_position", attributes:{}, overall:null, metadata:{ confidence:"very_low", method:"hd_advanced_evidence_v1" } };

  const attributes = {};
  for (const [attribute, keys] of Object.entries(SKATER_FAMILIES)) {
    attributes[attribute] = familyScore(evidence, keys);
  }
  // These traits are intentionally not guessed from points, body size or draft rank.
  for (const attribute of ["ST","CH","PO","HI","LE","SR"]) {
    const key = attribute + "Percentile";
    attributes[attribute] = score(evidence[key]);
  }
  attributes.FI = score(evidence.fightingSkillPercentile);
  attributes.OFF = attributes.OFF;
  attributes.DEF = attributes.DEF;
  const overall = calculateWeightedOverall(attributes, position);
  const availableFamilies = Object.values(attributes).filter(finite).length;
  const games = evidence.gamesPlayed;
  const confidence = sampleConfidence(games);
  const sourceNames = Array.isArray(evidence.sources)
    ? [...new Set(evidence.sources.filter(value => typeof value === "string" && value.trim()))] : [];
  return {
    status: overall == null ? "insufficient_advanced_evidence" : "advanced_evidence_estimate",
    position,
    attributes,
    overall,
    metadata: {
      method:"hd_advanced_evidence_v1",
      evidence:"normalized_public_advanced_metrics_and_tracking",
      confidence: confidence === "high" && availableFamilies >= 7 ? "medium" : confidence === "very_low" ? "very_low" : "low",
      sampleConfidence:confidence,
      sampleSize:finite(games) ? games : null,
      availableAttributeFamilies:availableFamilies,
      sources:sourceNames,
      notes:"Percentiles must be computed within comparable position, league, season and usage cohorts. Unobserved traits remain null; FI is excluded from OA."
    }
  };
}

export function evaluateAdvancedGoalie(player, evidence = {}) {
  const metrics = {
    GSAx:score(evidence.goalsSavedAboveExpectedPercentile),
    SV:score(evidence.shotQualityAdjustedSavePercentile),
    HD:score(evidence.highDangerSavePercentile),
    REB:score(evidence.reboundControlPercentile),
    WORK:score(evidence.workloadPercentile),
    CONS:score(evidence.seasonStabilityPercentile)
  };
  const weights = { GSAx:0.30, SV:0.25, HD:0.20, REB:0.10, WORK:0.05, CONS:0.10 };
  let total = 0, weightTotal = 0;
  const possibleWeight = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
  for (const [key, weight] of Object.entries(weights)) {
    if (metrics[key] == null) continue;
    total += metrics[key] * weight;
    weightTotal += weight;
  }
  const hasSufficientCoverage = weightTotal / possibleWeight >= 0.5;
  const games = evidence.gamesPlayed;
  return {
    status:hasSufficientCoverage ? "advanced_goalie_evidence_estimate" : "insufficient_advanced_evidence",
    position:"G",
    metrics,
    overall:hasSufficientCoverage ? clamp(Math.round(total / weightTotal)) : null,
    metadata:{
      method:"hd_advanced_goalie_evidence_v1",
      evidence:"goals_saved_above_expected_and_shot_quality_metrics",
      confidence:sampleConfidence(games) === "high" && weightTotal >= 0.75 ? "medium" : sampleConfidence(games),
      sampleConfidence:sampleConfidence(games),
      sampleSize:finite(games) ? games : null,
      availableWeightCoverage:Number((weightTotal / possibleWeight).toFixed(3)),
      league:evidence.league || null,
      season:evidence.season || null,
      sourceObservations:Array.isArray(evidence.sourceObservations) ? evidence.sourceObservations.filter(item =>
        item && typeof item.sourceName === "string" && typeof item.sourceUrl === "string" &&
        typeof item.checkedAt === "string" && typeof item.season === "string"
      ) : [],
      sources:Array.isArray(evidence.sources) ? [...new Set(evidence.sources.filter(value => typeof value === "string" && value.trim()))] : [],
      notes:"Goalie evaluation is independent of skater attribute weights; wins and raw GAA are not primary ability measures."
    }
  };
}

export const ADVANCED_SKATER_FAMILIES = SKATER_FAMILIES;
export const ADVANCED_OA_WEIGHTS = OA_WEIGHTS;
