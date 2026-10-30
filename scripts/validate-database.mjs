// Audit non destructive des fichiers de données UHM avant publication.
import { access, readFile } from "node:fs/promises";

const teams = ["ANA","BOS","BUF","CGY","CAR","CHI","COL","CBJ","DAL","DET","EDM","FLA","LAK","MIN","MTL","NSH","NJD","NYI","NYR","OTT","PHI","PIT","SJS","SEA","STL","TBL","TOR","UTA","VAN","VGK","WSH","WPG"];
async function json(path) {
  try { await access(path); return JSON.parse(await readFile(path, "utf8")); }
  catch { return null; }
}
const report = { nhl:{files:0,players:0,missing:[]}, ahl:{files:0,players:0,missing:[]}, prospects:{files:0,players:0,missing:[]} };
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
console.log("UHM database audit");
for (const [name, data] of Object.entries(report)) {
  console.log(`${name.toUpperCase()}: ${data.files}/32 fichiers valides, ${data.players} joueurs; manquants: ${data.missing.join(", ") || "aucun"}`);
}
console.log("NOTE: cet audit vérifie la présence et la taille minimale, pas la justesse des droits, contrats, cotes ou choix de repêchage.");
if (report.nhl.files !== 32 || report.ahl.files !== 32 || report.prospects.files !== 32) process.exitCode = 1;
