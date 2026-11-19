// Reconcile source-verified league corrections after the full ratings pass.
// This catches prospect records incorrectly labelled NHL only because their rights team is shown.
import { readFile, writeFile } from "node:fs/promises";

const read = async path => JSON.parse(await readFile(path, "utf8"));
const registry = await read("data/players/registry.json");
const corrections = await read("data/players/manual-league-corrections.json");
const normalize = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const position = value => {
  const raw = String(value || "").toUpperCase();
  if (["G","GOALIE","GOALTENDER"].includes(raw)) return "G";
  if (["D","DEFENSE","DEFENSEMAN","DEFENCEMAN"].includes(raw)) return "D";
  if (["F","C","LW","RW","L","R","W","FORWARD"].includes(raw)) return "F";
  return null;
};
let applied = 0, protectedRoster = 0, ambiguous = 0, missing = 0;
const unresolvedNames = [];
for (const correction of corrections.players || []) {
  if (!correction.currentLeague || !correction.source || !/^https?:\/\//.test(correction.source)) continue;
  const names = new Set([correction.name, ...(correction.aliases || [])].map(normalize));
  const exactIdMatches = correction.playerId
    ? (registry.players || []).filter(player => String(player.id) === String(correction.playerId))
    : [];
  let matches = exactIdMatches.length ? exactIdMatches :
    (registry.players || []).filter(player => names.has(normalize(player.name)));
  if (correction.birthDate && matches.length > 1) {
    const exact = matches.filter(player => player.birthDate === correction.birthDate);
    if (exact.length) matches = exact;
  }
  const wantedPosition = position(correction.position);
  if (wantedPosition && matches.length > 1) {
    const exact = matches.filter(player => position(player.position) === wantedPosition);
    if (exact.length) matches = exact;
  }
  if (matches.length === 0) { missing++; continue; }
  if (matches.length !== 1) { ambiguous++; continue; }
  const player = matches[0];
  // A verified NHL/AHL/ECHL roster feed outranks a manual prospect correction.
  const verifiedRosterForCurrentLeague =
    (player.currentLeague === "NHL" && player.nhlRosterVerified) ||
    (player.currentLeague === "AHL" && player.ahlRosterVerified) ||
    (player.currentLeague === "ECHL" && player.echlRosterVerified);
  if (verifiedRosterForCurrentLeague) {
    protectedRoster++;
    continue;
  }
  const changed = player.currentLeague !== correction.currentLeague ||
    (Object.prototype.hasOwnProperty.call(correction, "currentTeam") && player.currentTeam !== correction.currentTeam) ||
    player.leagueResolution !== "manual_source_verified";
  player.currentLeague = correction.currentLeague;
  if (Object.prototype.hasOwnProperty.call(correction, "currentTeam")) player.currentTeam = correction.currentTeam;
  if (correction.nhlRightsTeam) player.nhlRightsTeam = correction.nhlRightsTeam;
  if (correction.position && !player.position) player.position = position(correction.position) || correction.position;
  player.leagueResolution = "manual_source_verified";
  player.currentLeagueSource = correction.source;
  player.currentTeamSource = correction.source;
  player.manualCorrectionSource = correction.source;
  player.sourceUpdatedAt = correction.sourceUpdatedAt || corrections.verifiedAt || player.sourceUpdatedAt || null;
  if (changed) applied++;
}
const players = registry.players || [];
const unknown = players.filter(player => player.currentLeague === "UNKNOWN" || !player.currentLeague);
const unresolvedWithExactCorrection = unknown.filter(player =>
  (corrections.players || []).some(correction =>
    correction.playerId && String(correction.playerId) === String(player.id) &&
    correction.currentLeague && /^https?:\/\//.test(correction.source || "")
  )
);
for (const player of unknown) {
  player.currentTeam = null;
  player.leagueResolution ||= "unresolved_no_verified_current_roster_source";
  unresolvedNames.push({
    id: player.id, name: player.name, position: player.position || null,
    birthDate: player.birthDate || null, age: player.age ?? null,
    rightsTeam: player.nhlRightsTeam || null, source: player.source || null,
    reason: player.leagueResolution
  });
}
const potential = {
  total: players.length,
  sourceReviewed: players.filter(p => p.potentialStatus === "scouting_source_reviewed_estimate").length,
  provisional: players.filter(p => p.potentialStatus === "provisional_model_estimate").length,
  reviewRequired: players.filter(p => p.potentialReviewRequired === true).length,
  sourceReferences: players.reduce((sum, p) => sum + (Number(p.potentialEvidenceSourceCount) || 0), 0),
  methods: {},
  confidence: {},
  evidence: {}
};
for (const player of players) {
  const method = player.potentialEstimateMethod || "missing";
  const confidence = player.potentialConfidence || "not_recorded";
  const evidence = player.potentialEvidence || player.potentialRationale ? (player.potentialEvidence || "source_reviewed_rationale") : "not_recorded";
  potential.methods[method] = (potential.methods[method] || 0) + 1;
  potential.confidence[confidence] = (potential.confidence[confidence] || 0) + 1;
  potential.evidence[evidence] = (potential.evidence[evidence] || 0) + 1;
}
const byLeague = {};
for (const player of players) {
  const league = player.currentLeague || "UNKNOWN";
  byLeague[league] = (byLeague[league] || 0) + 1;
}
registry.counts = byLeague;
registry.leagues = [...new Set([...(registry.leagues || []), ...Object.keys(byLeague)])].sort();
await writeFile("data/players/registry.json", JSON.stringify(registry, null, 2) + "\n", "utf8");
const audit = {
  schemaVersion: 1,
  season: registry.season || "2026-2027",
  generatedAt: new Date().toISOString(),
  playerCount: players.length,
  leagueCorrections: { applied, protectedRoster, ambiguous, missing, unresolved: unknown.length, unresolvedWithExactCorrection: unresolvedWithExactCorrection.length },
  unresolvedLeaguePlayers: unresolvedNames,
  potentialCoverage: potential,
  playersByLeague: byLeague,
  policy: "Only source-backed corrections are applied. Verified roster memberships are protected. Unresolved players remain UNKNOWN; provisional potential remains clearly distinguished from source-reviewed scouting estimates."
};
await writeFile("data/players/registry-quality-audit.json", JSON.stringify(audit, null, 2) + "\n", "utf8");
console.log("POST-RATINGS SOURCE RECONCILIATION: " + JSON.stringify(audit.leagueCorrections));
if (unresolvedWithExactCorrection.length) {
  throw new Error("Source-backed manual league corrections were left unresolved: " + unresolvedWithExactCorrection.map(p => p.name).join(", "));
}
console.log("POTENTIAL COVERAGE AUDIT: " + JSON.stringify(audit.potentialCoverage));
console.log("LEAGUE COUNTS: " + JSON.stringify(byLeague));
if (potential.provisional + potential.sourceReviewed !== players.length) {
  throw new Error("Potential coverage does not equal registry size.");
}
if (players.some(player => !Number.isInteger(player.potential) || player.potential < 0 || player.potential > 99 || Number(player.potential) < Number(player.overall))) {
  throw new Error("Potential validation failed: every potential must be an integer 0-99 and at least OA.");
}
