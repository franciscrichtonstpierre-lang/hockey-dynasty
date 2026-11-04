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
async function save(league, skaters, goalies, source, target) {
  if (skaters.length < 50) throw new Error(`${league}: incomplete skater feed (${skaters.length})`);
  if (goalies.length < 8) throw new Error(`${league}: incomplete goalie feed (${goalies.length})`);
  const unique = rows => [...new Map(rows.map(row => [String(row.player_id), row])).values()];
  const payload = {
    schemaVersion:1, league, season, source, syncedAt:new Date().toISOString(),
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
  "LIIGA", normalizeLiigaSkaters(liigaSkaterRaw), normalizeLiigaGoalies(liigaGoalieRaw),
  "Official Liiga API v2 regular-season player statistics",
  "data/europe/player-stats-liiga-2026-2027.json"
);

const shlBase = "https://www.shl.se/api/statistics-v2/stats-info";
const [shlSkaterRaw, shlGoalieRaw] = await Promise.all([
  get(`${shlBase}/players_summary?count=1000&season=2027&gameType=regular`),
  get(`${shlBase}/goalies_summary?count=1000&season=2027&gameType=regular`)
]);
await save(
  "SHL", normalizeShlSkaters(shlSkaterRaw), normalizeShlGoalies(shlGoalieRaw),
  "Official SHL statistics-v2 regular-season player statistics",
  "data/europe/player-stats-shl-2026-2027.json"
);
