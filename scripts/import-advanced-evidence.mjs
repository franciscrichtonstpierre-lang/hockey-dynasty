// Build normalized, provenance-aware advanced evidence from locally supplied source exports.
// No network scraping, credentials, paywall bypass, or production writes.
// Input is JSON: { source:{name,url,checkedAt,licenseStatus,season,permissions:{commercialGameUse,derivedOutputs,displayInGame,retentionAllowed},attributionRequired,attributionSatisfied,shareAlikeRequired,shareAlikeCompliant}, rows:[...] }.
// Each row has playerId, position, league, season, gamesPlayed, usageCohort and metrics.
// Metrics use the canonical keys consumed by advanced-player-rating-model.mjs.

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { assertCommercialExportAllowed } from "./lib/data-rights-gate.mjs";

const INPUT = process.argv[2];
const OUTPUT = process.argv[3] || "data/advanced-evidence/normalized-evidence.json";
if (!INPUT) throw new Error("Usage: node scripts/import-advanced-evidence.mjs <authorized-export.json> [output.json]");

const sourceDoc = JSON.parse(await readFile(resolve(INPUT), "utf8"));
const registryPath = resolve(dirname(fileURLToPath(import.meta.url)), "../data/data-source-rights-registry.json");
const rightsRegistry = JSON.parse(await readFile(registryPath, "utf8"));
const source = sourceDoc.source || {};
if (!source.name || !source.url || !source.checkedAt || !source.season || !source.datasetId) {
  throw new Error("Source provenance requires name, url, checkedAt, season and datasetId.");
}
const registryRecord = rightsRegistry.datasets?.[source.datasetId];
if (!registryRecord) throw new Error("Refusing import: datasetId is not present in the central rights registry.");
if (registryRecord.testOnly === true && process.env.HD_ALLOW_TEST_FIXTURE !== "1") {
  throw new Error("Refusing import: test-only dataset cannot be used outside explicit test mode.");
}
if (registryRecord.testOnly !== true && registryRecord.status !== "commercial-free-confirmed") {
  const reason = registryRecord.status === "prohibited"
    ? "this dataset is explicitly prohibited for the intended use"
    : "this dataset is pending rights review; it is not classified as prohibited";
  throw new Error("Refusing import: " + reason + ". Registry status: " + registryRecord.status + ".");
}
// Keep the legal decision distinct: explicitly prohibited sources are rejected;
// incomplete evidence is reported as pending review. Neither may enter production.
if (source.licenseStatus !== "approved") {
  throw new Error("Refusing import: commercial use requires licenseStatus=approved.");
}
if (!source.licenseId || typeof source.licenseId !== "string") {
  throw new Error("Refusing import: record the exact policy/license identifier (URL plus version/date is acceptable).");
}
if (!source.licenseVerifiedAt || Number.isNaN(Date.parse(source.licenseVerifiedAt))) {
  throw new Error("Refusing import: licenseVerifiedAt must be a valid date-time.");
}
if (source.licenseExpiresAt && Date.parse(source.licenseExpiresAt) <= Date.now()) {
  throw new Error("Refusing import: license has expired.");
}
assertCommercialExportAllowed({
  commercialUseAllowed: source.permissions?.commercialGameUse,
  derivedUseAllowed: source.permissions?.derivedOutputs,
  displayApproved: source.permissions?.displayInGame,
  retentionAllowed: source.permissions?.retentionAllowed,
  thirdPartyRightsVerified: source.thirdPartyRightsVerified,
  attributionRequired: source.attributionRequired,
  attributionSatisfied: source.attributionSatisfied,
  shareAlikeRequired: source.shareAlikeRequired,
  shareAlikeCompliant: source.shareAlikeCompliant,
  paid: source.paid === true || source.requiresPayment === true
}, "advanced evidence import");
if (!Array.isArray(sourceDoc.rows) || !sourceDoc.rows.length) throw new Error("No source rows supplied.");

const validPositions = new Set(["F","C","LW","RW","D","G"]);
const metricKeys = new Set([
  "ixgPer60","goalsAboveExpectedPer60","primaryPointsPer60","shotGenerationPer60",
  "xgaSuppression","expectedGoalDifferential","shotAttemptSuppression",
  "ixgPerShot","goalsAboveExpected","shotVolumePer60","primaryAssistsPer60",
  "chanceCreation","controlledEntries","controlledExits","topSpeed","speedBursts",
  "highIntensityDistance","faceoffWin","availability","sustainedWorkload",
  "penaltyDifferential","fightingSkill","ST","CH","PO","HI","LE","SR",
  "goalsSavedAboveExpected","shotQualityAdjustedSave","highDangerSave",
  "reboundControl","workload","seasonStability"
]);
const rows = sourceDoc.rows.map((row, index) => {
  if (!row.playerId || !validPositions.has(String(row.position).toUpperCase()) || !row.league || !row.season) {
    throw new Error("Row "+index+" missing playerId, supported position, league or season.");
  }
  const metrics = row.metrics || {};
  for (const [key, value] of Object.entries(metrics)) {
    if (!metricKeys.has(key)) throw new Error("Unknown canonical metric '"+key+"' in row "+index);
    if (value !== null && (!Number.isFinite(value))) throw new Error("Non-numeric metric '"+key+"' in row "+index);
  }
  return { ...row, position:String(row.position).toUpperCase(), metrics };
});

// Percentiles are calculated within the same season, league, position and usage cohort.
// A missing metric remains missing; there is no cross-league prestige multiplier.
const groups = new Map();
for (const row of rows) {
  const key = [row.season,row.league,row.position,row.usageCohort || "all"].join("|");
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(row);
}
const percentile = (values, value) => {
  const sorted = values.filter(Number.isFinite).sort((a,b)=>a-b);
  if (!sorted.length || !Number.isFinite(value)) return null;
  let lo=0,hi=sorted.length;
  while(lo<hi){const mid=(lo+hi)>>1;if(sorted[mid]<=value)lo=mid+1;else hi=mid;}
  return sorted.length === 1 ? 0.5 : (lo-1)/(sorted.length-1);
};
const metricMap = {
  ixgPer60:"ixgPer60Percentile",
  goalsAboveExpectedPer60:"goalsAboveExpectedPer60Percentile",
  primaryPointsPer60:"primaryPointsPer60Percentile",
  shotGenerationPer60:"shotGenerationPer60Percentile",
  xgaSuppression:"xgaSuppressionPercentile",
  expectedGoalDifferential:"expectedGoalDifferentialPercentile",
  shotAttemptSuppression:"shotAttemptSuppressionPercentile",
  ixgPerShot:"ixgPerShotPercentile",
  goalsAboveExpected:"goalsAboveExpectedPercentile",
  shotVolumePer60:"shotVolumePer60Percentile",
  primaryAssistsPer60:"primaryAssistsPer60Percentile",
  chanceCreation:"chanceCreationPercentile",
  controlledEntries:"controlledEntriesPercentile",
  controlledExits:"controlledExitsPercentile",
  topSpeed:"topSpeedPercentile",
  speedBursts:"speedBurstsPercentile",
  highIntensityDistance:"highIntensityDistancePercentile",
  faceoffWin:"faceoffWinPercentile",
  availability:"availabilityPercentile",
  sustainedWorkload:"sustainedWorkloadPercentile",
  penaltyDifferential:"penaltyDifferentialPercentile",
  fightingSkill:"fightingSkillPercentile",
  ST:"STPercentile",CH:"CHPercentile",PO:"POPercentile",HI:"HIPercentile",LE:"LEPercentile",SR:"SRPercentile",
  goalsSavedAboveExpected:"goalsSavedAboveExpectedPercentile",
  shotQualityAdjustedSave:"shotQualityAdjustedSavePercentile",
  highDangerSave:"highDangerSavePercentile",
  reboundControl:"reboundControlPercentile",
  workload:"workloadPercentile",
  seasonStability:"seasonStabilityPercentile"
};
const normalized = [];
for (const [cohort, cohortRows] of groups) {
  for (const row of cohortRows) {
    const evidence = {
      playerId:String(row.playerId), position:row.position, league:row.league, season:row.season,
      usageCohort:row.usageCohort || "all", gamesPlayed:Number.isFinite(row.gamesPlayed)?row.gamesPlayed:null,
      sources:[source.name],
      sourceObservations:[{sourceName:source.name,sourceUrl:source.url,checkedAt:source.checkedAt,season:String(row.season),licenseStatus:source.licenseStatus,licenseId:source.licenseId,commercialGameUse:source.permissions.commercialGameUse,derivedOutputs:source.permissions.derivedOutputs,licenseVerifiedAt:source.licenseVerifiedAt,licenseExpiresAt:source.licenseExpiresAt||null,displayInGame:source.permissions?.displayInGame===true,retentionAllowed:source.permissions?.retentionAllowed===true,thirdPartyRightsVerified:source.thirdPartyRightsVerified===true,attributionRequired:source.attributionRequired,attributionSatisfied:source.attributionSatisfied===true,shareAlikeRequired:source.shareAlikeRequired,shareAlikeCompliant:source.shareAlikeCompliant===true,paid:source.paid===true||source.requiresPayment===true}],
      sourceMetricCount:0
    };
    for (const [rawKey, percentileKey] of Object.entries(metricMap)) {
      const raw = row.metrics[rawKey];
      if (Number.isFinite(raw)) {
        const cohortValues = cohortRows.map(item=>item.metrics?.[rawKey]).filter(Number.isFinite);
        evidence[percentileKey] = percentile(cohortValues, raw);
        evidence.sourceMetricCount++;
      }
    }
    normalized.push(evidence);
  }
}
const out = {
  schemaVersion:1, generatedAt:new Date().toISOString(),
  source:{name:source.name,url:source.url,checkedAt:source.checkedAt,season:source.season,licenseStatus:source.licenseStatus,licenseId:source.licenseId,permissions:source.permissions,licenseVerifiedAt:source.licenseVerifiedAt,licenseExpiresAt:source.licenseExpiresAt||null,thirdPartyRightsVerified:source.thirdPartyRightsVerified===true,paid:source.paid===true||source.requiresPayment===true},
  inputRowCount:rows.length, cohortCount:groups.size, normalizedRowCount:normalized.length,
  method:"within_league_season_position_usage_empirical_percentile_v1",
  warnings:[
    "Percentiles are only as reliable as the source export and player identity matching.",
    "Do not combine this output with production ratings until coverage, permissions and player-ID mapping are reviewed.",
    "Small cohorts require manual review; this importer does not adjust for league strength."
  ],
  players:normalized
};
await mkdir(dirname(resolve(OUTPUT)),{recursive:true});
await writeFile(resolve(OUTPUT),JSON.stringify(out,null,2)+"\n");
console.log(JSON.stringify({output:OUTPUT,rows:out.normalizedRowCount,cohorts:out.cohortCount,source:source.name}));
