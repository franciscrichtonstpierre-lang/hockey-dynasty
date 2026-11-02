import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { estimatePlayerPotential, estimatePlayerRatings } from "./lib/cross-league-rating-model.mjs";

const sourcePath = "data/players/registry.json";
const outputDir = "data/players/registry-index";
const chunkSize = 500;

const registry = JSON.parse(await readFile(sourcePath, "utf8"));
const players = Array.isArray(registry.players) ? registry.players : [];
if (!players.length) throw new Error("Registry is empty or has no players array.");

const compact = players.map(p => ({
  id: p.id ?? null,
  nhlPlayerId: p.nhlPlayerId ?? null,
  name: p.name ?? null,
  birthDate: p.birthDate ?? null,
  position: p.position ?? null,
  currentLeague: p.currentLeague ?? null,
  currentTeam: p.currentTeam ?? null,
  nhlRightsTeam: p.nhlRightsTeam ?? null,
  draftYear: p.draftYear ?? null,
  overall: p.overall ?? null,
  attributes: p.attributes ?? null,
  ratingSource: p.ratingSource ?? null,
  ratingConfidence: p.ratingConfidence ?? null,
  ratingSampleConfidence: p.ratingSampleConfidence ?? null,
  ratingSampleSize: p.ratingSampleSize ?? null,
  ratedAttributes: p.ratedAttributes ?? [],
  ratingMethod: p.ratingMethod ?? null,
  ratingEvidence: p.ratingEvidence ?? null,
  ratingModeledAttributes: p.ratingModeledAttributes ?? [],
  potential: p.potential ?? null,
  ratingStatus: p.ratingStatus ?? null,
  potentialStatus: p.potentialStatus ?? null,
  age: p.age ?? null,
  nationality: p.nationality ?? null,
  shootsCatches: p.shootsCatches ?? null,
  source: p.source ?? null
}));
const normalizeName = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const nameOf = player => player.fullName || player.full_name || player.name || player.display_name ||
  [player.firstName?.default || player.firstName || player.first_name || "", player.lastName?.default || player.lastName || player.last_name || ""].join(" ").trim();
const prospectFiles = ["ANA","BOS","BUF","CGY","CAR","CHI","COL","CBJ","DAL","DET","EDM","FLA","LAK","MIN","MTL","NSH","NJD","NYI","NYR","OTT","PHI","PIT","SJS","SEA","STL","TBL","TOR","UTA","VAN","VGK","WSH","WPG"];
const lookupPlayers = players.map(p => ({
  id:p.id ?? null, nhlPlayerId:p.nhlPlayerId ?? null, name:p.name ?? null,
  birthDate:p.birthDate ?? null, currentLeague:p.currentLeague ?? null,
  currentTeam:p.currentTeam ?? null, nhlRightsTeam:p.nhlRightsTeam ?? null, position:p.position ?? null,
  overall:p.overall ?? null, attributes:p.attributes ?? null,
  potential:p.potential ?? null, potentialEstimate:p.potentialEstimate ?? null,
  potentialStatus:p.potentialStatus ?? null,
  ratingSource:p.ratingSource ?? null, ratingStatus:p.ratingStatus ?? null,
  ratingConfidence:p.ratingConfidence ?? null, ratingSampleConfidence:p.ratingSampleConfidence ?? null,
  ratingSampleSize:p.ratingSampleSize ?? null, ratedAttributes:p.ratedAttributes ?? [],
  ratingMethod:p.ratingMethod ?? null, ratingEvidence:p.ratingEvidence ?? null
}));
const byNhlId = new Map(lookupPlayers.filter(p => p.nhlPlayerId != null).map(p => [String(p.nhlPlayerId), p]));
const byName = new Map();
for (const player of lookupPlayers) {
  const key = normalizeName(player.name);
  if (!key) continue;
  const group = byName.get(key) || [];
  group.push(player);
  byName.set(key, group);
}
let extraProfiles = 0;
for (const teamCode of prospectFiles) {
  const data = JSON.parse(await readFile(`data/prospects/${teamCode}.json`, "utf8"));
  const list = Array.isArray(data) ? data : (data.prospects || data.players || data.data || []);
  for (const raw of list) {
    const name = nameOf(raw);
    if (!name) continue;
    const sourceId = raw.id ?? raw.playerId ?? raw.player_id ?? raw.nhlPlayerId;
    const direct = sourceId != null ? byNhlId.get(String(sourceId)) : null;
    if (direct) continue;
    const candidates = byName.get(normalizeName(name)) || [];
    if (candidates.length === 1) continue;
    if (candidates.length > 1) {
      let narrowed = candidates;
      const rightsTeam = raw.nhlRightsTeam || raw.rightsTeam || raw.nhlTeamCode || teamCode;
      const byTeam = narrowed.filter(player => player.nhlRightsTeam === rightsTeam);
      if (byTeam.length) narrowed = byTeam;
      const rawPosition = String(raw.positionCode || raw.position || raw.position_code || "").toUpperCase();
      const group = /^(G|GOALIE|GOALTENDER)$/.test(rawPosition) ? "G" : /^(D|DEFENSE|DEFENCEMAN|DEFENSEMAN)$/.test(rawPosition) ? "D" : /^(F|C|L|R|LW|RW|W|FORWARD|CENTRE|CENTER)$/.test(rawPosition) ? "F" : null;
      if (group) {
        const byPosition = narrowed.filter(player => player.position === group);
        if (byPosition.length) narrowed = byPosition;
      }
      if (narrowed.length === 1) continue;
    }

    // Keep every prospect row playable when no stable registry identity can be
    // matched. The profile model uses the supplied league, position and draft
    // rank, and is explicitly marked very low confidence in the UI.
    const position = String(raw.positionCode || raw.position || raw.position_code || "").toUpperCase();
    const group = /^(G|GOALIE|GOALTENDER)$/.test(position) ? "G" : /^(D|DEFENSE|DEFENCEMAN|DEFENSEMAN)$/.test(position) ? "D" : "F";
    const profile = {
      ...raw, name, position:group,
      currentLeague:raw.currentLeague || raw.league || raw.leagueName || raw.league_name || "UNKNOWN",
      nhlRightsTeam:raw.nhlRightsTeam || raw.rightsTeam || raw.nhlTeamCode || teamCode
    };
    const estimate = estimatePlayerRatings(profile, null, null, null);
    const potential = estimatePlayerPotential(profile, estimate.overall);
    const extra = {
      id:`prospect:${teamCode}:${normalizeName(name).replace(/ /g, "-")}`,
      nhlPlayerId:sourceId != null && Number.isFinite(Number(sourceId)) ? Number(sourceId) : null,
      name, birthDate:raw.birthDate || raw.birthdate || null,
      currentLeague:profile.currentLeague, currentTeam:raw.currentTeam || raw.teamName || raw.team_name || null,
      nhlRightsTeam:profile.nhlRightsTeam, position:group,
      overall:estimate.overall, attributes:estimate.attributes,
      potential:potential.value, potentialEstimate:potential.value, potentialStatus:potential.status,
      ratingSource:estimate.metadata.source, ratingStatus:estimate.metadata.status,
      ratingConfidence:"very_low", ratingSampleConfidence:null, ratingSampleSize:null,
      ratedAttributes:estimate.metadata.ratedAttributes, ratingMethod:estimate.metadata.method,
      ratingEvidence:estimate.metadata.evidence, prospectFallback:true
    };
    lookupPlayers.push(extra);
    const key = normalizeName(name);
    const groupByName = byName.get(key) || [];
    groupByName.push(extra);
    byName.set(key, groupByName);
    if (extra.nhlPlayerId != null && !byNhlId.has(String(extra.nhlPlayerId))) byNhlId.set(String(extra.nhlPlayerId), extra);
    extraProfiles++;
  }
}
const ratingsLookup = {
  schemaVersion: 1,
  attributes: registry.ratingsMetadata?.attributes ?? [],
  players: lookupPlayers,
  organizationProspectProfiles:extraProfiles
};

await mkdir(outputDir, { recursive: true });
const oldFiles = await readdir(outputDir).catch(() => []);
for (const name of oldFiles) {
  if (name.endsWith(".json")) await rm(`${outputDir}/${name}`);
}

const chunkCount = Math.ceil(compact.length / chunkSize);
for (let i = 0; i < chunkCount; i++) {
  const part = compact.slice(i * chunkSize, (i + 1) * chunkSize);
  const name = `registry-${String(i + 1).padStart(3, "0")}.json`;
  await writeFile(`${outputDir}/${name}`, JSON.stringify({
    schemaVersion: 1,
    chunk: i + 1,
    chunkCount,
    players: part
  }, null, 2) + "\n", "utf8");
}

const manifest = {
  schemaVersion: 1,
  sourcePath,
  sourceGeneratedAt: registry.generatedAt ?? null,
  playerCount: compact.length,
  ratingsLookupFile: "ratings-lookup.json",
  chunkSize,
  chunkCount,
  generatedAt: new Date().toISOString(),
  fields: ["id", "name", "birthDate", "position", "currentLeague", "currentTeam", "nhlRightsTeam", "draftYear", "overall", "attributes", "ratingSource", "ratingConfidence", "ratingSampleConfidence", "ratingSampleSize", "ratedAttributes", "ratingMethod", "ratingEvidence", "ratingModeledAttributes", "potential", "ratingStatus", "potentialStatus", "age", "nationality", "shootsCatches", "source"]
};
await writeFile(`${outputDir}/manifest.json`, JSON.stringify(manifest, null, 2) + "\n", "utf8");
await writeFile(`${outputDir}/ratings-lookup.json`, JSON.stringify(ratingsLookup) + "\n", "utf8");
console.log(`Exported ${compact.length} registry identities into ${chunkCount} chunks and ${extraProfiles} unmatched organization prospect profiles.`);
