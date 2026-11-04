// Synchronize official NCAA Division I men's hockey individual scoring statistics.
import { mkdir, writeFile } from "node:fs/promises";
import { parseNCAAPlayerStats } from "./lib/ncaa-stat-feed.mjs";

const season = "2026-2027";
const source = "https://www.collegehockeyinc.com/conferences/national/natplayer27.php";
const response = await fetch(source, {
  headers: { "User-Agent": "Hockey-Dynasty-data-sync/1.0", "Accept": "text/html" },
  signal: AbortSignal.timeout(25000)
});
if (!response.ok) throw new Error(`NCAA statistics HTTP ${response.status}`);
const html = await response.text();
const skaters = parseNCAAPlayerStats(html);
if (skaters.length < 100) throw new Error(`NCAA stats feed incomplete: ${skaters.length} skaters`);
const payload = {
  schemaVersion: 1,
  league: "NCAA",
  season,
  source,
  syncedAt: new Date().toISOString(),
  counts: { skaters: skaters.length, goalies: 0 },
  skaters,
  goalies: [],
  notes: [
    "Official College Hockey Inc. national individual scoring leaders.",
    "Skater statistics only; NCAA goalie ratings remain profile estimates until a complete goalie feed is added.",
    "Statistics inform model estimates and are not scouting grades."
  ]
};
await mkdir("data/ncaa", { recursive: true });
await writeFile("data/ncaa/player-stats-2026-2027.json", JSON.stringify(payload, null, 2) + "\n", "utf8");
console.log(`NCAA player statistics saved: ${skaters.length} skaters (${season}).`);
