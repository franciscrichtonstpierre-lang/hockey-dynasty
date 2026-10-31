// Audit non destructif des fichiers de données UHM avant publication.
import { access, readFile } from "node:fs/promises";

const teams = ["ANA","BOS","BUF","CGY","CAR","CHI","COL","CBJ","DAL","DET","EDM","FLA","LAK","MIN","MTL","NSH","NJD","NYI","NYR","OTT","PHI","PIT","SJS","SEA","STL","TBL","TOR","UTA","VAN","VGK","WSH","WPG"];
async function json(path) {
  try { await access(path); return JSON.parse(await readFile(path, "utf8")); }
  catch { return null; }
}
const report = {
  nhl:{files:0,players:0,missing:[]}, ahl:{files:0,players:0,missing:[]},
  prospects:{files:0,players:0,missing:[]}, registry:{players:0,exists:false},
  contracts:{players:0,matched:0,coveragePercent:0,exists:false},
  coaches:{teams:0,coaches:0,exists:false}, draftPicks:{exists:false,years:[]}
};
for (const code of teams) {
  const nhl = await json(`data/nhl/${code}.json`);
  const nhlCount = nhl ? ["forwards","defensemen","goalies"].reduce((n,k)=>n+(Array.isArray(nhl[k])?nhl[k].length:0),0) : 0;
  if (nhlCount >= 15) { report.nhl.files++; report.nhl.players += nhlCount; } else report.nhl.missing.push(code);

  const ahl = await json(`data/ahl/${code}.json`);
  const ahlCount = ahl && Array.isArray(ahl.players) ? ahl.players.length : 0;
  if (ahlCount >= 10) { report.ahl.files++; report.ahl.players += ahlCount; } else report.ahl.missing.push(code);

  const prospectData = await json(`data/prospects/${code}.json`);
  const list = Array.isArray(prospectData) ? prospectData : prospectData?.prospects || prospectData?.players || prospectData?.data;
  if (Array.isArray(list) && list.length) { report.prospects.files++; report.prospects.players += list.length; } else report.prospects.missing.push(code);
}
const registry=await json("data/players/registry.json");
if (registry && Array.isArray(registry.players)) { report.registry.exists=true; report.registry.players=registry.players.length; }
const contracts=await json("data/contracts/2026-2027.json");
if (contracts && Array.isArray(contracts.players)) {
  report.contracts.exists=true; report.contracts.players=contracts.players.length;
  report.contracts.matched=contracts.matchedContracts||contracts.players.filter(p=>p.contractStatus==="MATCHED").length;
  report.contracts.coveragePercent=contracts.coveragePercent||0;
}
const coaches=await json("data/coaches/2026-2027.json");
if (coaches && Array.isArray(coaches.coaches)) { report.coaches.exists=true; report.coaches.teams=coaches.teamCount||0; report.coaches.coaches=coaches.coaches.length; }
const picks=await json("data/draft-picks/2027-2029.json");
if (picks && Array.isArray(picks.picks)) { report.draftPicks.exists=true; report.draftPicks.years=[...new Set(picks.picks.map(p=>p.year))].sort(); }

console.log("UHM database audit");
console.log(`NHL: ${report.nhl.files}/32 fichiers valides, ${report.nhl.players} joueurs; manquants: ${report.nhl.missing.join(", ") || "aucun"}`);
console.log(`AHL: ${report.ahl.files}/32 fichiers valides, ${report.ahl.players} joueurs; manquants: ${report.ahl.missing.join(", ") || "aucun"}`);
console.log(`PROSPECTS: ${report.prospects.files}/32 fichiers non vides, ${report.prospects.players} joueurs; manquants: ${report.prospects.missing.join(", ") || "aucun"}`);
console.log(`REGISTRE CENTRAL: ${report.registry.exists ? report.registry.players+" fiches" : "ABSENT"}`);
console.log(`CONTRATS 2026-27: ${report.contracts.exists ? report.contracts.matched+"/"+report.contracts.players+" joueurs appariés ("+report.contracts.coveragePercent+"%)" : "ABSENTS"}`);
console.log(`ENTRAÎNEURS: ${report.coaches.exists ? report.coaches.teams+"/32 équipes, "+report.coaches.coaches+" fiches" : "BASE ABSENTE"}`);
console.log(`CHOIX DE REPÊCHAGE: ${report.draftPicks.exists ? "années "+report.draftPicks.years.join(", ") : "BASE D’ACTIFS ABSENTE"}`);
console.log("NOTE: la présence des fiches ne garantit pas que les droits, contrats, cotes ou transactions conditionnelles soient tous vérifiés.");
if (report.nhl.files !== 32 || report.ahl.files !== 32 || report.prospects.files !== 32 || !report.registry.exists || !report.contracts.exists || !report.coaches.exists || !report.draftPicks.exists) process.exitCode = 1;
