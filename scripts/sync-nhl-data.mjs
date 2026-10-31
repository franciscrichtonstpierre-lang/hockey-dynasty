// Synchronise les effectifs officiels LNH et les listes publiques d'espoirs.
// Source: NHL Web API. N'écrase jamais un fichier avec une réponse vide/invalide.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

const season = process.env.UHM_SEASON || "20262027";
const teams = ["ANA","BOS","BUF","CGY","CAR","CHI","COL","CBJ","DAL","DET","EDM","FLA","LAK","MIN","MTL","NSH","NJD","NYI","NYR","OTT","PHI","PIT","SJS","SEA","STL","TBL","TOR","UTA","VAN","VGK","WSH","WPG"];
const headers = { "User-Agent": "Ultimate-Hockey-Manager-data-sync/1.0", "Accept": "application/json" };
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

async function fetchJson(url) {
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
  return response.json();
}
async function writeValidated(path, data, validate) {
  if (!validate(data)) throw new Error(`Validation failed: ${path}`);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(data, null, 2) + "\n", "utf8");
}
async function syncRoster(code) {
  const path = `data/nhl/${code}.json`;
  const url = `https://api-web.nhle.com/v1/roster/${code}/${season}`;
  try {
    const data = await fetchJson(url);
    const valid = ["forwards","defensemen","goalies"].every(k => Array.isArray(data[k])) &&
      data.forwards.length + data.defensemen.length + data.goalies.length >= 15;
    if (!valid) throw new Error("Missing roster groups or implausibly small roster");
    data._sourceSeason = season;
    data._sourceUrl = url;
    data._syncedAt = new Date().toISOString();
    await writeValidated(path, data, d => d.forwards.length + d.defensemen.length + d.goalies.length >= 15);
    console.log(`OK roster ${code}: ${data.forwards.length + data.defensemen.length + data.goalies.length}`);
  } catch (error) {
    console.error(`ERROR roster ${code}: ${error.message}`);
    process.exitCode = 1;
  }
}
const prospectName = p => String(p.fullName || p.name || [
  p.firstName?.default || p.firstName || p.first_name || "",
  p.lastName?.default || p.lastName || p.last_name || ""
].filter(Boolean).join(" ")).trim();
const prospectKey = p => prospectName(p).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();

async function syncProspects(code) {
  const path = `data/prospects/${code}.json`;
  const url = `https://api-web.nhle.com/v1/prospects/${code}`;
  try {
    const data = await fetchJson(url);
    let list;
    if (Array.isArray(data)) {
      list = data;
    } else if (Array.isArray(data.prospects) || Array.isArray(data.players) || Array.isArray(data.data)) {
      list = data.prospects || data.players || data.data;
    } else if (["forwards", "defensemen", "goalies"].some(k => Array.isArray(data[k]))) {
      // NHL Web API may return position groups rather than a single prospects array.
      list = ["forwards", "defensemen", "goalies"].flatMap(group =>
        (Array.isArray(data[group]) ? data[group] : []).map(player => ({ ...player, positionGroup: group }))
      );
    } else {
      throw new Error("Unrecognised prospects response schema");
    }
    if (!Array.isArray(list) || list.length === 0) throw new Error("Empty prospects response");
    let supplemental = [];
    try {
      const supplementalDb = JSON.parse(await readFile("data/prospects-supplemental/2026-2027.json", "utf8"));
      supplemental = supplementalDb.teams?.[code]?.prospects || [];
    } catch { /* Optional supplemental snapshot is absent. */ }
    const names = new Set(list.map(prospectKey).filter(Boolean));
    const extras = supplemental.filter(p => {
      const key = prospectKey(p);
      if (!key || names.has(key)) return false;
      names.add(key);
      return true;
    });
    const merged = [...list, ...extras];
    const payload = {
      teamCode: code,
      source: url,
      sourceType: extras.length ? "NHL Web API + source-labelled supplemental pipeline" : "NHL Web API",
      syncedUTC: new Date().toISOString(),
      count: merged.length,
      prospects: merged,
      dataNotes: [
        "NHL API rows are retained as the primary source.",
        "Supplemental pipeline rows carry their own source and snapshot date and may be stale; verify current league and NHL rights before final release.",
        "Game ratings and potential are not inferred from age, draft slot or external prospect rank."
      ]
    };
    await writeValidated(path, payload, d => Array.isArray(d.prospects) && d.prospects.length > 0);
    console.log(`OK prospects ${code}: API ${list.length} + supplemental ${extras.length} = ${merged.length}`);
  } catch (error) {
    // Certaines équipes n'ont pas de liste exposée par l'API NHL.
    // Si une liste locale valide existe déjà, la conserver sans faire échouer
    // la synchronisation pour une réponse vide de l'API.
    if (error.message === "Empty prospects response") {
      try {
        const existing = JSON.parse(await readFile(path, "utf8"));
        const existingList = Array.isArray(existing)
          ? existing
          : existing?.prospects || existing?.players || existing?.data;
        if (Array.isArray(existingList) && existingList.length > 0) {
          console.warn(`WARN prospects ${code}: API vide; conservation de la liste locale existante (${existingList.length} entrées)`);
          return;
        }
      } catch {
        // Aucun fichier local lisible : l'erreur doit rester visible ci-dessous.
      }
    }
    console.error(`ERROR prospects ${code}: ${error.message}`);
    process.exitCode = 1;
  }
}
for (const code of teams) {
  await syncRoster(code);
  await pause(180);
  await syncProspects(code);
  await pause(180);
}
