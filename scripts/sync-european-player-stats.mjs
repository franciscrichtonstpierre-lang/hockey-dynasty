// Synchronize public SHL and Liiga regular-season player statistics for 2026-27.
import { mkdir, writeFile } from "node:fs/promises";
import { normalizeLiigaGoalies, normalizeLiigaSkaters, normalizeShlGoalies, normalizeShlSkaters } from "./lib/european-stat-feed.mjs";

const season = "2026-2027";
async function get(url) {
  const response = await fetch(url, {
    headers:{ "User-Agent":"Hockey-Dynasty-data-sync/1.0", "Accept":"application/json" },
    signal:AbortSignal.timeout(25000)
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${url}`);
  return response.json();
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
if (!shlSeason) {
  console.warn("SHL: public stats endpoint unavailable from this runner; retaining profile estimates for SHL players.");
} else {
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
}
