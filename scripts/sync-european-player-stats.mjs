// Synchronize public SHL and Liiga regular-season player statistics for 2026-27.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { normalizeLiigaGoalies, normalizeLiigaSkaters, normalizeShlGoalies, normalizeShlSkaters, normalizeShlHtmlSkaters, normalizeShlHtmlGoalies, normalizeEliteProspectsShlGoalies, normalizeEliteProspectsShlSkaters, normalizeAllsvenskanGoalies, normalizeAllsvenskanSkaters } from "./lib/european-stat-feed.mjs";

const season = "2026-2027";
async function get(url) {
  const response = await fetch(url, {
    headers:{
      "User-Agent":"Mozilla/5.0 (compatible; Hockey-Dynasty-data-sync/1.0; +https://github.com/franciscrichtonstpierre-lang/hockey-dynasty)",
      "Accept":"application/json, text/plain, */*",
      "Accept-Language":"sv-SE,sv;q=0.9,en;q=0.8",
      "Origin":"https://www.shl.se",
      "Referer":"https://www.shl.se/game-stats/players"
    },
    signal:AbortSignal.timeout(25000)
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${url}`);
  const body = await response.text();
  if (!body.trim()) throw new Error(`empty response body: ${url}`);
  try { return JSON.parse(body); }
  catch { throw new Error(`non-JSON response (${body.slice(0,120)}): ${url}`); }
}
async function save(league, seasonLabel, skaters, goalies, source, target, minimumGoalies = 8) {
  if (skaters.length < 50) throw new Error(`${league}: incomplete skater feed (${skaters.length})`);
  if (goalies.length < minimumGoalies) throw new Error(`${league}: incomplete goalie feed (${goalies.length})`);
  const unique = rows => [...new Map(rows.map(row => [String(row.player_id), row])).values()];
  const payload = {
    schemaVersion:1, league, season:seasonLabel, source, syncedAt:new Date().toISOString(),
    counts:{ skaters:unique(skaters).length, goalies:unique(goalies).length },
    skaters:unique(skaters), goalies:unique(goalies),
    notes:["Official league regular-season statistics; not scouting grades.", "Statistics support clearly labelled model estimates and do not directly measure every EHM-style attribute."]
  };
  await mkdir("data/europe", { recursive:true });
  await writeFile(target, JSON.stringify(payload, null, 2) + "\n", "utf8");
  console.log(`${league}: ${payload.counts.skaters} skaters, ${payload.counts.goalies} goalies.`);
}

const liigaBase = "https://liiga.fi/api/v2/players/stats/summed/2027/2027/runkosarja/true";
const [liigaSkaterRaw, liigaGoalieRaw] = await Promise.all([
  get(`${liigaBase}?dataType=basicStats`),
  get(`${liigaBase}?dataType=basicStatsGk`)
]);
await save(
  "LIIGA", season, normalizeLiigaSkaters(liigaSkaterRaw), normalizeLiigaGoalies(liigaGoalieRaw),
  "Official Liiga API v2 regular-season player statistics",
  "data/europe/player-stats-liiga-2026-2027.json"
);

const allsvenskanSeasonEndYear = 2027;
const allsvenskanBaseBody = {
  league:"HA", phase:"HA", season:"2026", team_side:"all", team:"all",
  against_team:"all", all_results:"all", game_status:"played", decided_in:"all",
  categories:"summary", page:1, page_size:1000
};
const postAllsvenskan = async (path, body) => {
  const response = await fetch("https://hockeyallsvenskan.se/api/" + path, {
    method:"POST",
    headers:{
      "User-Agent":"fastRhockey",
      "Accept":"application/json",
      "Content-Type":"application/json"
    },
    body:JSON.stringify(body),
    signal:AbortSignal.timeout(25000)
  });
  if (!response.ok) throw new Error("HockeyAllsvenskan HTTP " + response.status + " (" + path + ")");
  const raw = await response.text();
  if (!raw.trim()) throw new Error("HockeyAllsvenskan empty response (" + path + ")");
  try { return JSON.parse(raw); }
  catch { throw new Error("HockeyAllsvenskan non-JSON response (" + path + ")"); }
};
try {
  const [haSkaterRaw, haGoalieRaw] = await Promise.all([
    postAllsvenskan("all-time-skaters-stats", {...allsvenskanBaseBody, position:"all", ages:"all"}),
    postAllsvenskan("all-time-goalkeepers-stats", allsvenskanBaseBody)
  ]);
  const haSkaters = normalizeAllsvenskanSkaters(haSkaterRaw);
  const haGoalies = normalizeAllsvenskanGoalies(haGoalieRaw);
  await save(
    "ALLSVENSKAN", "2026-2027", haSkaters, haGoalies,
    "Official HockeyAllsvenskan public statistics API; regular season 2026-27 (end-year 2027, site start-year 2026)",
    "data/europe/player-stats-allsvenskan-2026-2027.json"
  );
} catch (error) {
  console.warn("HockeyAllsvenskan official stats unavailable; retaining existing data if present: " + error.message);
}

const priorLiigaBase = "https://liiga.fi/api/v2/players/stats/summed/2026/2026/runkosarja/true";
try {
  const [priorSkaterRaw, priorGoalieRaw] = await Promise.all([
    get(`${priorLiigaBase}?dataType=basicStats`),
    get(`${priorLiigaBase}?dataType=basicStatsGk`)
  ]);
  const priorSkaters = normalizeLiigaSkaters(priorSkaterRaw);
  const priorGoalies = normalizeLiigaGoalies(priorGoalieRaw);
  if (priorSkaters.length >= 50 && priorGoalies.length >= 8) {
    await save(
      "LIIGA", "2025-2026", priorSkaters, priorGoalies,
      "Official Liiga API v2 previous-season regular-season statistics",
      "data/europe/player-stats-liiga-2025-2026.json"
    );
  } else {
    console.warn("Liiga 2025-26: previous-season feed incomplete; no fallback file written.");
  }
} catch (error) {
  console.warn(`Liiga 2025-26 previous-season feed unavailable: ${error.message}`);
}

const shlBase = "https://www.shl.se/api/statistics-v2/stats-info";
let shlSeason = null, shlSkaters = [], shlGoalies = [];
for (const candidate of [2027, 2026]) {
  try {
    const raw = await get(`${shlBase}/players_summary?count=1000&season=${candidate}&gameType=regular`);
    const rows = normalizeShlSkaters(raw);
    if (rows.length >= 50) { shlSeason = candidate; shlSkaters = rows; break; }
  } catch (error) {
    console.warn(`SHL skater feed unavailable for season ${candidate}: ${error.message}`);
  }
}
if (shlSeason) {
  for (const module of ["goalies_summary", "goalies"]) {
    try {
      const raw = await get(`${shlBase}/${module}?count=1000&season=${shlSeason}&gameType=regular`);
      const rows = normalizeShlGoalies(raw);
      if (rows.length >= 8) { shlGoalies = rows; break; }
    } catch (error) {
      console.warn(`SHL goalie module ${module} unavailable: ${error.message}`);
    }
  }
  const shlSeasonLabel = shlSeason === 2027 ? "2026-2027" : "2025-2026";
  await save(
    "SHL", shlSeasonLabel, shlSkaters, shlGoalies,
    `Official SHL statistics-v2 regular-season player statistics (season ${shlSeason})`,
    `data/europe/player-stats-shl-${shlSeasonLabel}.json`, 0
  );
} else {
  console.warn("SHL official API empty from GitHub runner; trying the official SHL public statistics pages.");
  async function getShlPage(url) {
    const response = await fetch(url, {
      headers:{
        "User-Agent":"Mozilla/5.0 (compatible; Hockey-Dynasty-data-sync/1.0; +https://github.com/franciscrichtonstpierre-lang/hockey-dynasty)",
        "Accept":"text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language":"sv-SE,sv;q=0.9,en;q=0.8",
        "Referer":"https://www.shl.se/game-stats/players"
      },
      signal:AbortSignal.timeout(25000)
    });
    if (!response.ok) throw new Error("HTTP " + response.status);
    const html = await response.text();
    if (!html.trim()) throw new Error("empty HTML response");
    return html;
  }
  let pageSkaters = [];
  for (const url of [
    "https://www.shl.se/game-stats/players/summary?count=1000&moduleType=summary&state=active",
    "https://www.shl.se/game-stats/players?count=1000"
  ]) {
    try {
      pageSkaters = normalizeShlHtmlSkaters(await getShlPage(url));
      console.log("Official SHL skater page parsed: " + pageSkaters.length + " rows.");
      if (pageSkaters.length >= 50) break;
    } catch (error) {
      console.warn("Official SHL skater page unavailable: " + error.message);
    }
  }
  let pageGoalies = [];
  for (const url of [
    "https://www.shl.se/game-stats/goalkeepers/summary?count=1000&moduleType=summary&state=active",
    "https://www.shl.se/game-stats/goalkeepers?count=1000"
  ]) {
    try {
      pageGoalies = normalizeShlHtmlGoalies(await getShlPage(url));
      console.log("Official SHL goalie page parsed: " + pageGoalies.length + " rows.");
      if (pageGoalies.length >= 8) break;
    } catch (error) {
      console.warn("Official SHL goalie page unavailable: " + error.message);
    }
  }
  if (pageSkaters.length >= 50 && pageGoalies.length >= 8) {
    await save(
      "SHL", "2026-2027", pageSkaters, pageGoalies,
      "Official SHL 2026-27 public player and goalkeeper statistics pages (HTML table fallback)",
      "data/europe/player-stats-shl-2026-2027.json", 8
    );
  } else {
    console.warn("Official SHL pages incomplete (" + pageSkaters.length + " skaters, " + pageGoalies.length + " goalies); trying Elite Prospects public season tables.");
    const epBase = "https://www.eliteprospects.com/league/shl/stats/2026-2027";
  const epSkaters = [];
  for (let page = 1; page <= 5; page++) {
    const url = page === 1 ? epBase : epBase + "?page=" + page;
    try {
      const response = await fetch(url, {
        headers:{ "User-Agent":"Mozilla/5.0 (compatible; Hockey-Dynasty-data-sync/1.0)", "Accept":"text/html,application/xhtml+xml" },
        signal:AbortSignal.timeout(25000)
      });
      if (!response.ok) throw new Error("HTTP " + response.status);
      const html = await response.text();
      const rows = normalizeEliteProspectsShlSkaters(html);
      if (!rows.length) throw new Error("no player rows parsed");
      epSkaters.push(...rows);
      console.log("Elite Prospects SHL skaters page " + page + ": " + rows.length + " rows.");
      if (rows.length < 100) break;
    } catch (error) {
      console.warn("Elite Prospects SHL skaters page " + page + " unavailable: " + error.message);
      break;
    }
  }
  let epGoalies = [];
  try {
    const response = await fetch(epBase + "?tab=goalies", {
      headers:{ "User-Agent":"Mozilla/5.0 (compatible; Hockey-Dynasty-data-sync/1.0)", "Accept":"text/html,application/xhtml+xml" },
      signal:AbortSignal.timeout(25000)
    });
    if (!response.ok) throw new Error("HTTP " + response.status);
    epGoalies = normalizeEliteProspectsShlGoalies(await response.text());
  } catch (error) {
    console.warn("Elite Prospects SHL goalies unavailable: " + error.message);
  }
  if (epSkaters.length >= 50 && epGoalies.length >= 8) {
    await save(
      "SHL", "2026-2027", epSkaters, epGoalies,
      "Elite Prospects 2026-27 SHL regular-season statistics (secondary public source; official SHL API unavailable from runner)",
      "data/europe/player-stats-shl-2026-2027.json", 8
    );
  } else {
    let retained = null;
    try {
      retained = JSON.parse(await readFile("data/europe/player-stats-shl-2026-2027.json", "utf8"));
    } catch {}
    const isAuditablePartialSnapshot = retained?.league === "SHL" &&
      retained?.season === "2026-2027" &&
      Array.isArray(retained?.skaters) && retained.skaters.length > 0 &&
      String(retained?.source || "").includes("partial manual snapshot");
    if (isAuditablePartialSnapshot) {
      console.warn(
        "SHL automated sources remain blocked; retaining the auditable partial snapshot (" +
        retained.skaters.length + " skaters, " + (retained.goalies?.length || 0) + " goalies)."
      );
    } else {
      throw new Error("SHL feeds incomplete: " + epSkaters.length + " skaters, " + epGoalies.length + " goalies; no verified fallback snapshot exists.");
    }
    }
  }
}
