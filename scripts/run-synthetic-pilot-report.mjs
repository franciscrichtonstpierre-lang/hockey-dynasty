// Synthetic-only pilot diagnostics for advanced player rating candidates.
// Refuses non-synthetic inputs and writes a local review report only.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { evaluateAdvancedGoalie, evaluateAdvancedSkater, classifyAdvancedProfile } from "./lib/advanced-player-rating-model.mjs";

const input = process.argv[2] || "data/advanced-input/synthetic-pilot.json";
const output = process.argv[3] || "data/advanced-evidence/synthetic-pilot-report.json";
const doc = JSON.parse(await readFile(resolve(input), "utf8"));
if (doc.synthetic !== true || doc.datasetType !== "synthetic") {
  throw new Error("Refusing pilot: input must explicitly declare synthetic=true and datasetType=synthetic");
}
if (!Array.isArray(doc.players) || doc.players.length === 0) throw new Error("Synthetic pilot has no players[]");
if (doc.players.some(row => !String(row.playerId || "").startsWith("SYN-"))) {
  throw new Error("Refusing pilot: every synthetic playerId must start with SYN-");
}
if (doc.players.some(row => Array.isArray(row.sourceObservations) && row.sourceObservations.length)) {
  throw new Error("Refusing pilot: synthetic dataset must not contain provider source observations");
}
const candidates = doc.players.map(row => {
  const evidence = { ...row, ...(row.metrics || {}) };
  const result = row.position === "G"
    ? evaluateAdvancedGoalie({ playerId: row.playerId, position: "G" }, evidence)
    : evaluateAdvancedSkater({ playerId: row.playerId, position: row.position }, evidence);
  return { playerId: row.playerId, position: row.position, league: row.league, season: row.season,
    usageCohort: row.usageCohort || "unspecified", result, profile: classifyAdvancedProfile(result) };
});
const quantile = (values, p) => {
  if (!values.length) return null;
  const sorted = [...values].sort((a,b) => a-b);
  return Number(sorted[Math.round((sorted.length - 1) * p)].toFixed(2));
};
const summarize = rows => {
  const rated = rows.filter(row => Number.isFinite(row.result.overall));
  const overall = rated.map(row => row.result.overall);
  const coverage = rows.map(row => row.result.metadata?.availableWeightCoverage ?? 0);
  const keys = [...new Set(rows.flatMap(row => Object.keys(row.result.attributes || row.result.metrics || {})))].sort();
  const attributeCoverage = Object.fromEntries(keys.map(key => [key,
    Number((rows.filter(row => Number.isFinite((row.result.attributes || row.result.metrics || {})[key])).length / rows.length).toFixed(3))
  ]));
  return {
    players: rows.length, rated: rated.length, insufficient: rows.length - rated.length,
    overall: { min: overall.length ? Math.min(...overall) : null, median: quantile(overall, .5), max: overall.length ? Math.max(...overall) : null },
    weightCoverage: { min: Number(Math.min(...coverage).toFixed(3)), mean: Number((coverage.reduce((a,b)=>a+b,0)/coverage.length).toFixed(3)), max: Number(Math.max(...coverage).toFixed(3)) },
    attributeCoverage
  };
};
const positions = Object.fromEntries(["F","D","G"].map(position => [position, summarize(candidates.filter(row => row.position === position))]));
const cohorts = {};
for (const row of candidates) {
  const key = [row.league || "unknown", row.season || "unknown", row.position, row.usageCohort].join("|");
  cohorts[key] = (cohorts[key] || 0) + 1;
}
const smallCohorts = Object.entries(cohorts).filter(([, count]) => count < 5).map(([cohort, count]) => ({ cohort, count }));
const report = {
  schemaVersion: 1, generatedAt: new Date().toISOString(), datasetType: "synthetic", synthetic: true,
  candidateCount: candidates.length, ratedCount: candidates.filter(row => row.result.overall !== null).length,
  insufficientEvidenceCount: candidates.filter(row => row.result.overall === null).length,
  positions, cohorts, smallCohorts,
  guardrails: {
    productionWrite: false, sourceDataUsed: false, providerDataUsed: false,
    realPlayerClaims: false, warning: "Synthetic diagnostics only; not a calibration against real NHL players or licensed data."
  },
  candidates
};
await mkdir(dirname(resolve(output)), { recursive: true });
await writeFile(resolve(output), JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify({ output, candidateCount: report.candidateCount, ratedCount: report.ratedCount,
  insufficientEvidenceCount: report.insufficientEvidenceCount, smallCohortCount: smallCohorts.length,
  productionWrite: false }));
