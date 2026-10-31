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
  prospects:{files:0,players:0,missing:[],lowCoverage:[]}, registry:{players:0,exists:false,unknown:0,duplicates:0,duplicateIdentities:0,withOverall:0,missingOverall:0,completeAttributeSets:0,missingAttributeSets:0,invalidRatings:0,potentialAvailable:0,potentialEstimated:0,potentialMissing:0},
  contracts:{players:0,matched:0,coveragePercent:0,salaryRows:0,estimatedAavRows:0,missingSalary:0,exists:false},
  coaches:{teams:0,coaches:0,exists:false,missingHead:[],missingAssistants:[],ahlStaffExists:false,ahlTeams:0,ahlCoaches:0,ahlMissingHead:[],ahlMissingAssistants:[],ratingsComplete:0,ratingsMissing:0,ahlRatingsComplete:0,ahlRatingsMissing:0},
  draftPicks:{exists:false,records:0,verified:0,excludedConditional:0,playableSlots:0,baseSlots:0,expectedBaseSlots:teams.length*draftYears.length*draftRounds.length,missingSlots:0,invalid:0,years:[],unresolvedOwner:0,unverifiedConditions:0,complete:false}
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
  const identities = new Set();
  const ratingFields = ["FI","SH","PL","ST","CH","PO","HI","SK","EN","PE","FA","LE","SR","OFF","DEF","OA"];
  for (const p of registry.players) {
    const league = String(p.currentLeague || p.league || "UNKNOWN").toUpperCase();
    if (league === "UNKNOWN" || !p.currentLeague) report.registry.unknown++;
    const id = p.playerId || p.nhlPlayerId || p.id;
    if (id != null) { const key = String(id); if (ids.has(key)) report.registry.duplicates++; else ids.add(key); }
    if (p.potential != null && Number.isFinite(Number(p.potential)) && Number(p.potential) >= 0 && Number(p.potential) <= 99) {
      report.registry.potentialAvailable++;
    } else if (p.potentialEstimate != null && Number.isFinite(Number(p.potentialEstimate)) && Number(p.potentialEstimate) >= 0 && Number(p.potentialEstimate) <= 99 && p.potentialStatus === "provisional_model_estimate") {
      report.registry.potentialEstimated++;
    } else {
      report.registry.potentialMissing++;
    }
    const overall = Number(p.overall ?? p.attributes?.OA);
    if (Number.isFinite(overall) && overall >= 0 && overall <= 99) report.registry.withOverall++; else report.registry.missingOverall++;
    const attrs = p.attributes && typeof p.attributes === "object" ? p.attributes : {};
    const validAttrs = ratingFields.every(k => attrs[k] != null && attrs[k] !== "" && Number.isFinite(Number(attrs[k])) && Number(attrs[k]) >= 0 && Number(attrs[k]) <= 99);
    if (validAttrs) report.registry.completeAttributeSets++; else report.registry.missingAttributeSets++;
    if (Object.values(attrs).some(v => v != null && v !== "" && (!Number.isFinite(Number(v)) || Number(v) < 0 || Number(v) > 99))) report.registry.invalidRatings++;
    if (p.birthDate && p.name) { const identity = `${String(p.name).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim()}|${p.birthDate}`; if (identities.has(identity)) report.registry.duplicateIdentities++; else identities.add(identity); }
  }
}
const contracts=await json("data/contracts/2026-2027.json");
if (contracts && Array.isArray(contracts.players)) {
  report.contracts.exists=true; report.contracts.players=contracts.players.length;
  report.contracts.matched=contracts.matchedContracts||contracts.players.filter(p=>p.contractStatus==="MATCHED").length;
  report.contracts.coveragePercent=contracts.coveragePercent||0;
  report.contracts.salaryRows=contracts.salaryRows||contracts.players.filter(p=>p.season && p.season.capHitUsd != null).length;
  report.contracts.estimatedAavRows=contracts.estimatedAavRows||contracts.players.filter(p=>p.contract?.estimatedAavUsd!=null).length;
  report.contracts.missingSalary=Math.max(0,report.nhl.players-report.contracts.salaryRows);
}
const coaches=await json("data/coaches/2026-2027.json");
if (coaches && Array.isArray(coaches.coaches)) {
  report.coaches.exists=true; report.coaches.teams=coaches.teamCount||0; report.coaches.coaches=coaches.coaches.length;
  const coachRatingFields=["offensive","defensive","playerDevelopment","playerManagement","physicalStyle","powerPlayImpact","penaltyKillImpact","youngPlayerUsage"];
  for(const c of coaches.coaches){if(coachRatingFields.every(k=>c[k]!=null&&Number.isFinite(Number(c[k]))&&Number(c[k])>=0&&Number(c[k])<=99))report.coaches.ratingsComplete++;else report.coaches.ratingsMissing++;}
  for (const code of teams) {
    const staff=coaches.coaches.filter(x=>x.teamCode===code && x.league==="NHL" && x.employmentStatus==="employed");
    if (!staff.some(x=>x.role==="head_coach")) report.coaches.missingHead.push(code);
    if (staff.filter(x=>x.role==="assistant_coach").length < 2) report.coaches.missingAssistants.push(code);
  }
}
const ahlCoaches=await json("data/coaches/ahl-2026-2027.json");
report.coaches.ahlStaffExists = !!(ahlCoaches && Array.isArray(ahlCoaches.coaches));
if (report.coaches.ahlStaffExists) {
  report.coaches.ahlTeams=ahlCoaches.teamCount||0;
  report.coaches.ahlCoaches=ahlCoaches.coaches.length;
  const ahlRatingFields=["offensive","defensive","playerDevelopment","playerManagement","physicalStyle","powerPlayImpact","penaltyKillImpact","youngPlayerUsage"];
  for(const c of ahlCoaches.coaches){if(ahlRatingFields.every(k=>c[k]!=null&&Number.isFinite(Number(c[k]))&&Number(c[k])>=0&&Number(c[k])<=99))report.coaches.ahlRatingsComplete++;else report.coaches.ahlRatingsMissing++;}
  for (const code of teams) {
    const staff=ahlCoaches.coaches.filter(x=>x.teamCode===code && x.league==="AHL" && x.employmentStatus==="employed");
    if (!staff.some(x=>x.role==="head_coach")) report.coaches.ahlMissingHead.push(code);
    if (staff.filter(x=>x.role==="assistant_coach").length < 1) report.coaches.ahlMissingAssistants.push(code);
  }
}

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
      ((forfeited && p.currentOwner == null) || (!forfeited && ["active","conditional"].includes(p.status) && teams.includes(p.currentOwner)));
    if (verifiedOwner) {
      report.draftPicks.verified++;
      if (p.status === "conditional" && p.conditionsVerified !== true) report.draftPicks.unverifiedConditions++;
    } else if (p.status === "excluded_conditional" && p.verified === false && p.currentOwner == null) {
      report.draftPicks.excludedConditional++;
    } else if (p.status === "unverified" && p.verified === false && p.currentOwner == null) {
      report.draftPicks.unresolvedOwner++;
    } else {
      report.draftPicks.invalid++;
    }
  }
  report.draftPicks.baseSlots=seen.size;
  report.draftPicks.playableSlots=report.draftPicks.expectedBaseSlots-report.draftPicks.excludedConditional;
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
    report.draftPicks.unverifiedConditions === 0 &&
    report.draftPicks.verified === report.draftPicks.playableSlots &&
    draftYears.every(y=>report.draftPicks.years.includes(y));
}

console.log("UHM database audit");
console.log(`NHL: ${report.nhl.files}/32 fichiers valides, ${report.nhl.players} joueurs; manquants: ${report.nhl.missing.join(", ") || "aucun"}`);
console.log(`AHL: ${report.ahl.files}/32 fichiers valides, ${report.ahl.players} joueurs; manquants: ${report.ahl.missing.join(", ") || "aucun"}`);
console.log(`PROSPECTS: ${report.prospects.files}/32 fichiers non vides, ${report.prospects.players} joueurs; fichiers vides: ${report.prospects.missing.join(", ") || "aucun"}; couverture faible (<10): ${report.prospects.lowCoverage.join(", ") || "aucun"}`);
console.log(`REGISTRE CENTRAL: ${report.registry.exists ? report.registry.players+" fiches; ligue inconnue: "+report.registry.unknown+"; identifiants dupliqués: "+report.registry.duplicates+"; identités nom+naissance dupliquées: "+report.registry.duplicateIdentities+"; OA valides: "+report.registry.withOverall+"/"+report.registry.players+"; jeux d’attributs complets: "+report.registry.completeAttributeSets+"/"+report.registry.players+"; cotes invalides: "+report.registry.invalidRatings+"; potentiel source disponible: "+report.registry.potentialAvailable+"/"+report.registry.players+"; estimations provisoires: "+report.registry.potentialEstimated : "ABSENT"}`);
console.log(`CONTRATS 2026-27: ${report.contracts.exists ? report.contracts.matched+"/"+report.contracts.players+" contrats appariés; salaires/plafond disponibles: "+report.contracts.salaryRows+"/"+report.nhl.players+"; estimations AAV étiquetées: "+report.contracts.estimatedAavRows+"; manquants: "+report.contracts.missingSalary : "ABSENTS"}`);
console.log(`ENTRAÎNEURS LNH: ${report.coaches.exists ? report.coaches.teams+"/32 équipes, "+report.coaches.coaches+" fiches; chefs manquants: "+report.coaches.missingHead.join(", ")+"; équipes avec moins de 2 adjoints: "+report.coaches.missingAssistants.join(", ")+"; cotes complètes: "+report.coaches.ratingsComplete+"/"+report.coaches.coaches : "BASE ABSENTE"}`);
console.log(`ENTRAÎNEURS LAH: ${report.coaches.ahlStaffExists ? report.coaches.ahlTeams+"/32 équipes, "+report.coaches.ahlCoaches+" fiches; chefs manquants: "+report.coaches.ahlMissingHead.join(", ")+"; équipes avec moins de 2 adjoints: "+report.coaches.ahlMissingAssistants.join(", ")+"; cotes complètes: "+report.coaches.ahlRatingsComplete+"/"+report.coaches.ahlCoaches : "BASE ABSENTE"}`);
console.log(`CHOIX 2027-2029: ${report.draftPicks.records} fiches; ${report.draftPicks.verified} propriétaires vérifiés; ${report.draftPicks.excludedConditional} choix conditionnels exclus; ${report.draftPicks.unresolvedOwner} propriétaires non résolus; ${report.draftPicks.unverifiedConditions} conditions non vérifiées; ${report.draftPicks.baseSlots}/${report.draftPicks.expectedBaseSlots} emplacements de base; ${report.draftPicks.missingSlots} emplacements manquants; ${report.draftPicks.invalid} erreurs structurelles; statut ${report.draftPicks.complete ? "COMPLET" : "INCOMPLET"}`);
console.log("NOTE: la présence des fiches ne garantit pas que les droits, contrats, cotes ou transactions conditionnelles soient tous vérifiés.");
if (
  report.nhl.files !== 32 || report.ahl.files !== 32 ||
  report.prospects.files !== 32 || report.prospects.lowCoverage.length > 0 ||
  !report.registry.exists || report.registry.unknown > 0 || report.registry.duplicates > 0 || report.registry.duplicateIdentities > 0 || report.registry.missingOverall > 0 || report.registry.missingAttributeSets > 0 || report.registry.invalidRatings > 0 || report.registry.potentialMissing > 0 ||
  !report.contracts.exists || report.contracts.missingSalary > 0 ||
  !report.coaches.exists || report.coaches.missingHead.length > 0 ||
  report.coaches.missingAssistants.length > 0 || report.coaches.ratingsMissing > 0 || !report.coaches.ahlStaffExists || report.coaches.ahlRatingsMissing > 0 || report.coaches.ahlTeams !== 32 || report.coaches.ahlMissingHead.length > 0 || report.coaches.ahlMissingAssistants.length > 0 ||
  !report.draftPicks.complete
) process.exitCode = 1;
