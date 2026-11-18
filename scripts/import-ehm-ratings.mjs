// Import authorized EHM 2026-27 ratings into the canonical registry without changing roster placement.
// Input is a rights-cleared JSON export; this script never downloads Workshop files.
import { readFile, writeFile } from "node:fs/promises";

const [inputPath, manifestPath] = process.argv.slice(2);
if (!inputPath || !manifestPath) {
  throw new Error("Usage: node scripts/import-ehm-ratings.mjs <export.json> <rights-manifest.json> [output.json]");
}
const json = async path => JSON.parse(await readFile(path, "utf8"));
const [source, manifest, registry, ratings] = await Promise.all([
  json(inputPath), json(manifestPath), json("data/players/registry.json"), json("data/ratings.json")
]);

const approval = manifest.permission || {};
const required = [
  ["commercialUseAllowed", approval.commercialUseAllowed === true],
  ["redistributionAllowed", approval.redistributionAllowed === true],
  ["thirdPartyRightsVerified", approval.thirdPartyRightsVerified === true],
  ["writtenPermissionReference", typeof approval.writtenPermissionReference === "string" && approval.writtenPermissionReference.trim().length > 0],
  ["author", typeof approval.author === "string" && approval.author.trim().length > 0]
];
const missing = required.filter(([, ok]) => !ok).map(([key]) => key);
if (missing.length) {
  throw new Error("EHM import blocked: rights manifest incomplete (" + missing.join(", ") + "). No production data was changed.");
}
if (!Array.isArray(source.players) || !Array.isArray(registry.players)) {
  throw new Error("Expected source.players and registry.players arrays.");
}
if (String(source.season) !== "2026-2027" || String(manifest.season) !== "2026-2027") {
  throw new Error("Only an explicitly identified 2026-2027 EHM export is accepted.");
}
const scale = Number(manifest.attributeScale);
if (![20, 99, 100].includes(scale)) throw new Error("manifest.attributeScale must be 20, 99 or 100.");
const overallScale = Number(manifest.overallScale);
if (![99, 100].includes(overallScale)) throw new Error("manifest.overallScale must be 99 or 100; map the source's actual EHM overall field explicitly.");
const overallField = manifest.overallField || "OA";
const caScale = Number(manifest.abilityScale);
if (caScale !== 200) throw new Error("manifest.abilityScale must be 200 (EHM CA/PA scale).");

const keys = ["SH","PL","ST","CH","PO","HI","SK","EN","PE","FA","LE","SR"];
const norm = s => String(s ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
const byId = new Map();
const byName = new Map();
for (const p of source.players) {
  const id = p.nhlPlayerId == null ? "" : String(p.nhlPlayerId);
  if (id) {
    if (byId.has(id)) throw new Error("Duplicate source NHL ID: " + id);
    byId.set(id,p);
  }
  const n = norm(p.name);
  if (n) {
    if (!byName.has(n)) byName.set(n,[]);
    byName.get(n).push(p);
  }
}
const convert = value => {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 1 || n > scale) throw new Error("Invalid EHM attribute value (expected 1-" + scale + "): " + value);
  return Math.round((n - 1) / (scale - 1) * 99);
};
const ability = value => {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 1 || n > 200) throw new Error("Invalid EHM CA/PA value: " + value);
  return Math.round((n - 1) / 199 * 99);
};

const outputPlayers = [];
const unmatched = [];
const ambiguous = [];
const seenSource = new Set();
for (const player of registry.players) {
  // EHM roster import is intentionally limited to NHL players; prospects and other leagues stay untouched.
  if (player.currentLeague !== "NHL") continue;
  let row = player.nhlPlayerId == null ? null : byId.get(String(player.nhlPlayerId));
  if (!row) {
    const candidates = byName.get(norm(player.name)) || [];
    if (candidates.length === 1) row = candidates[0];
    else if (candidates.length > 1) ambiguous.push({ registryId:player.id, name:player.name });
  }
  if (!row) { unmatched.push({ registryId:player.id, nhlPlayerId:player.nhlPlayerId ?? null, name:player.name }); continue; }
  seenSource.add(row);
  if (!row.attributes || typeof row.attributes !== "object") throw new Error("Missing attributes for " + row.name);
  const raw = {};
  for (const key of keys) {
    const sourceKey = manifest.attributeMap?.[key] || key;
    if (row.attributes[sourceKey] == null) throw new Error("Missing mapped EHM attribute " + sourceKey + " for " + row.name);
    raw[key] = convert(row.attributes[sourceKey]);
  }
  const OFF = Math.round((raw.SH + raw.PL + raw.ST) / 3);
  const DEF = Math.round((raw.CH + raw.PO + raw.HI) / 3);
  const FI = row.attributes[manifest.attributeMap?.FI || "FI"] == null
    ? 10 : convert(row.attributes[manifest.attributeMap?.FI || "FI"]);
  const oaRaw = row[overallField] ?? row.overall;
  if (oaRaw == null) throw new Error("Missing source EHM overall field '" + overallField + "' for " + row.name);
  const oaNumber = Number(oaRaw);
  const oaMin = overallScale === 100 ? 1 : 0;
  if (!Number.isFinite(oaNumber) || oaNumber < oaMin || oaNumber > overallScale) {
    throw new Error("Invalid EHM overall for " + row.name + ": expected " + oaMin + "-" + overallScale + ", received " + oaRaw);
  }
  const sourceOverall = overallScale === 100 ? Math.round((oaNumber - 1) / 99 * 99) : Math.round(oaNumber);
  const oaKeys = [...keys, "OFF", "DEF"];
  const OA = Math.round(oaKeys.reduce((sum, key) => sum + (key === "OFF" ? OFF : key === "DEF" ? DEF : raw[key]), 0) / oaKeys.length);
  const paRaw = row.PA ?? row.pa ?? row.potentialAbility;
  const caRaw = row.CA ?? row.ca ?? row.currentAbility;
  if (paRaw == null || caRaw == null) throw new Error("Missing EHM CA/PA for " + row.name);
  outputPlayers.push({
    ...player,
    attributes:{ FI, ...raw, OFF, DEF, OA },
    overall:OA,
    ehmSourceOverall:sourceOverall,
    ehmOverall:OA,
    ehmCA:Number(caRaw),
    ehmPA:Number(paRaw),
    potential:ability(paRaw),
    potentialEstimate:ability(paRaw),
    potentialStatus:"scouting_source_reviewed_estimate",
    potentialEstimateMethod:"ehm_2026_2027_pa_normalized_to_0_99",
    potentialSource:manifest.datasetUrl,
    potentialConfidence:"high",
    potentialRationale:"EHM 2026-2027 Potential Ability (PA), normalized from the documented 1-200 scale.",
    ehmReference:{
      dataset:manifest.dataset,
      season:"2026-2027",
      sourcePlayerName:row.name,
      rawCA:Number(caRaw),
      rawPA:Number(paRaw),
      rawOA:oaRaw,
      rawAttributes:row.attributes,
      attributeScale:scale,
      abilityScale:200
    },
    ratingSource:manifest.datasetUrl,
    ratingStatus:"source_verified_ehm_reference",
    ratingConfidence:"source_verified",
    ratingMethod:"ehm_2026_2027_source_overall_and_attributes",
    ratingEvidence:"ehm_community_roster_authorized_import",
    ratedAttributes:["FI",...keys,"OFF","DEF","OA"]
  });
}
if (seenSource.size !== outputPlayers.length) throw new Error("Internal source-match accounting error.");
const result = {
  schemaVersion:1,
  mode:"production_registry_import",
  createdAt:new Date().toISOString(),
  season:"2026-2027",
  source:{ dataset:manifest.dataset, datasetUrl:manifest.datasetUrl, author:approval.author, writtenPermissionReference:approval.writtenPermissionReference },
  rules:{
    rosterPlacementChanged:false,
    teamAndPositionFieldsCopiedUnchanged:true,
    attributeScale:scale,
    abilityScale:200,
    potential:"PA normalized from 1-200 to 0-99",
    oa:"mean of the 14 non-FI fields (12 mapped attributes plus OFF and DEF)",
    overallField,
    overallScale
  },
  summary:{
    registryPlayers:registry.players.length,
    nhlPlayersInRegistry:registry.players.filter(p=>p.currentLeague==="NHL").length,
    nonNhlPlayersLeftUntouched:registry.players.filter(p=>p.currentLeague!=="NHL").length,
    matched:outputPlayers.length,
    unmatched:unmatched.length,
    ambiguous:ambiguous.length,
    sourceRowsUnused:source.players.length-seenSource.size
  },
  unmatched,
  ambiguous,
  players:outputPlayers
};
if (!outputPlayers.length) throw new Error("No registry players matched the EHM export; nothing was changed.");
const matchedById = new Map(outputPlayers.map(p => [p.id, p]));
registry.players = registry.players.map(p => matchedById.get(p.id) || p);
registry.generatedAt = new Date().toISOString();
registry.ratingImport = { dataset:manifest.dataset, season:"2026-2027", importedAt:registry.generatedAt, matched:outputPlayers.length, unmatched:unmatched.length, author:approval.author };
ratings.players = ratings.players || {};
ratings.playerMetadata = ratings.playerMetadata || {};
for (const player of outputPlayers) {
  if (player.nhlPlayerId == null) continue;
  const id = String(player.nhlPlayerId);
  ratings.players[id] = player.attributes;
  ratings.playerMetadata[id] = { source:manifest.datasetUrl, status:"source_verified_ehm_reference", confidence:"source_verified", sampleConfidence:"source_verified", ratedAttributes:player.ratedAttributes, method:"ehm_2026_2027_source_attributes_recomputed_oa", evidence:"ehm_community_roster_authorized_import", season:"2026-2027", position:player.detailedPosition || player.position || null };
}
await writeFile("data/players/registry.json", JSON.stringify(registry,null,2)+"\n");
await writeFile("data/ratings.json", JSON.stringify(ratings,null,2)+"\n");
console.log(JSON.stringify(result.summary,null,2));
console.log("Applied authorized EHM ratings to the canonical registry and NHL-ID ratings lookup. Unmatched records were left unchanged; run export-registry-index.mjs and the full validation suite next.");
