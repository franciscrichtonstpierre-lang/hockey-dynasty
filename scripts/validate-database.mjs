// Audit non destructif des bases UHM avant publication.
import { access, readFile } from "node:fs/promises";

const teams = ["ANA","BOS","BUF","CGY","CAR","CHI","COL","CBJ","DAL","DET","EDM","FLA","LAK","MIN","MTL","NSH","NJD","NYI","NYR","OTT","PHI","PIT","SJS","SEA","STL","TBL","TOR","UTA","VAN","VGK","WSH","WPG"];
const draftYears = [2027, 2028, 2029];
const draftRounds = [1, 2, 3, 4, 5, 6, 7];
async function json(path) {
  try { await access(path); return JSON.parse(await readFile(path, "utf8")); }
  catch { return null; }
}
const report = {
  nhl:{files:0,players:0,missing:[]}, ahl:{files:0,players:0,missing:[]},
  prospects:{files:0,players:0,missing:[],lowCoverage:[]}, registry:{players:0,exists:false,unknown:0,duplicates:0},
  contracts:{players:0,matched:0,coveragePercent:0,salaryRows:0,missingSalary:0,exists:false},
  coaches:{teams:0,coaches:0,exists:false,missingHead:[],missingAssistants:[],ahlStaffExists:false},
  draftPicks:{exists:false,records:0,verified:0,baseSlots:0,expectedBaseSlots:teams.length*draftYears.length*draftRounds.length,missingSlots:0,invalid:0,years:[],unresolvedOwner:0,complete:false}
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
  if (Array.isArray(list) && list.length) { report.prospects.files++; report.prospects.players += list.length; if (list.length < 10) report.prospects.lowCoverage.push(`${code} (${list.length})`); } else report.prospects.missing.push(code);
}
const registry=await json("data/players/registry.json");
if (registry && Array.isArray(registry.players)) {
  report.registry.exists=true; report.registry.players=registry.players.length;
  const ids = new Set();
  for (const p of registry.players) {
    const league = String(p.currentLeague || p.league || "UNKNOWN").toUpperCase();
    if (league === "UNKNOWN" || !p.currentLeague) report.registry.unknown++;
    const id = p.playerId || p.nhlPlayerId || p.id;
    if (id != null) { const key = String(id); if (ids.has(key)) report.registry.duplicates++; else ids.add(key); }
  }
}
const contracts=await json("data/contracts/2026-2027.json");
if (contracts && Array.isArray(contracts.players)) {
  report.contracts.exists=true; report.contracts.players=contracts.players.length;
  report.contracts.matched=contracts.matchedContracts||contracts.players.filter(p=>p.contractStatus==="MATCHED").length;
  report.contracts.coveragePercent=contracts.coveragePercent||0;
  report.contracts.salaryRows=contracts.salaryRows||contracts.players.filter(p=>p.season && p.season.capHitUsd != null).length;
  report.contracts.missingSalary=Math.max(0,report.nhl.players-report.contracts.salaryRows);
}
const coaches=await json("data/coaches/2026-2027.json");
if (coaches && Array.isArray(coaches.coaches)) {
  report.coaches.exists=true; report.coaches.teams=coaches.teamCount||0; report.coaches.coaches=coaches.coaches.length;
  for (const code of teams) {
    const staff=coaches.coaches.filter(x=>x.teamCode===code && x.league==="NHL" && x.employmentStatus==="employed");
    if (!staff.some(x=>x.role==="head_coach")) report.coaches.missingHead.push(code);
    if (staff.filter(x=>x.role==="assistant_coach").length < 2) report.coaches.missingAssistants.push(code);
  }
}
report.coaches.ahlStaffExists = !!(await json("data/coaches/ahl-2026-2027.json"));

const picks=await json("data/draft-picks/2027-2029.json");
if (picks && Array.isArray(picks.picks)) {
  report.draftPicks.exists=true;
  report.draftPicks.records=picks.picks.length;
  report.draftPicks.years=[...new Set(picks.picks.map(p=>p.year))].sort();
  const seen = new Set();
  for (const p of picks.picks) {
    const validYear = draftYears.includes(Number(p.year));
    const validRound = draftRounds.includes(Number(p.round));
    const validOriginal = teams.includes(p.originalTeam);
    const key = `${p.year}-${p.round}-${p.originalTeam}`;
    if (!validYear || !validRound || !validOriginal || !p.pickId || seen.has(key)) {
      report.draftPicks.invalid++;
      continue;
    }
    seen.add(key);
    const forfeited = p.status === "forfeited";
    const verifiedOwner = p.verified === true && !!p.source &&
      ((forfeited && p.currentOwner == null) || (!forfeited && p.status === "active" && teams.includes(p.currentOwner)));
    if (verifiedOwner) {
      report.draftPicks.verified++;
    } else if (p.status === "unverified" && p.verified === false && p.currentOwner == null) {
      report.draftPicks.unresolvedOwner++;
    } else {
      report.draftPicks.invalid++;
    }
  }
  report.draftPicks.baseSlots=seen.size;
  report.draftPicks.missingSlots=0;
  const expectedKeys = new Set();
  for (const year of draftYears) for (const round of draftRounds) for (const team of teams) expectedKeys.add(`${year}-${round}-${team}`);
  for (const key of expectedKeys) if (!seen.has(key)) report.draftPicks.missingSlots++;
  report.draftPicks.complete =
    picks.status === "complete" &&
    report.draftPicks.baseSlots === report.draftPicks.expectedBaseSlots &&
    report.draftPicks.missingSlots === 0 &&
    report.draftPicks.invalid === 0 &&
    report.draftPicks.unresolvedOwner === 0 &&
    report.draftPicks.verified === report.draftPicks.expectedBaseSlots &&
    draftYears.every(y=>report.draftPicks.years.includes(y));
}

console.log("UHM database audit");
console.log(`NHL: ${report.nhl.files}/32 fichiers valides, ${report.nhl.players} joueurs; manquants: ${report.nhl.missing.join(", ") || "aucun"}`);
console.log(`AHL: ${report.ahl.files}/32 fichiers valides, ${report.ahl.players} joueurs; manquants: ${report.ahl.missing.join(", ") || "aucun"}`);
console.log(`PROSPECTS: ${report.prospects.files}/32 fichiers non vides, ${report.prospects.players} joueurs; fichiers vides: ${report.prospects.missing.join(", ") || "aucun"}; couverture faible (<10): ${report.prospects.lowCoverage.join(", ") || "aucun"}`);
console.log(`REGISTRE CENTRAL: ${report.registry.exists ? report.registry.players+" fiches; ligue inconnue: "+report.registry.unknown+"; identifiants dupliqués: "+report.registry.duplicates : "ABSENT"}`);
console.log(`CONTRATS 2026-27: ${report.contracts.exists ? report.contracts.matched+"/"+report.contracts.players+" contrats appariés; salaires/plafond disponibles: "+report.contracts.salaryRows+"/"+report.nhl.players+"; manquants: "+report.contracts.missingSalary : "ABSENTS"}`);
console.log(`ENTRAÎNEURS LNH: ${report.coaches.exists ? report.coaches.teams+"/32 équipes, "+report.coaches.coaches+" fiches; chefs manquants: "+report.coaches.missingHead.join(", ")+"; équipes avec moins de 2 adjoints: "+report.coaches.missingAssistants.join(", ") : "BASE ABSENTE"}`);
console.log(`ENTRAÎNEURS LAH: ${report.coaches.ahlStaffExists ? "base présente" : "BASE ABSENTE"}`);
console.log(`CHOIX 2027-2029: ${report.draftPicks.records} fiches; ${report.draftPicks.verified} propriétaires vérifiés; ${report.draftPicks.unresolvedOwner} propriétaires non résolus; ${report.draftPicks.baseSlots}/${report.draftPicks.expectedBaseSlots} emplacements de base; ${report.draftPicks.missingSlots} emplacements manquants; ${report.draftPicks.invalid} erreurs structurelles; statut ${report.draftPicks.complete ? "COMPLET" : "INCOMPLET"}`);
console.log("NOTE: la présence des fiches ne garantit pas que les droits, contrats, cotes ou transactions conditionnelles soient tous vérifiés.");
if (
  report.nhl.files !== 32 || report.ahl.files !== 32 ||
  report.prospects.files !== 32 || report.prospects.lowCoverage.length > 0 ||
  !report.registry.exists || report.registry.unknown > 0 || report.registry.duplicates > 0 ||
  !report.contracts.exists || report.contracts.missingSalary > 0 ||
  !report.coaches.exists || report.coaches.missingHead.length > 0 ||
  report.coaches.missingAssistants.length > 0 || !report.coaches.ahlStaffExists ||
  !report.draftPicks.complete
) process.exitCode = 1;
