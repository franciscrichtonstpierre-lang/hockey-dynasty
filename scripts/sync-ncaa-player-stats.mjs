// Synchronize official NCAA Division I men's hockey individual scoring statistics.
import { mkdir, writeFile } from "node:fs/promises";
import { parseNCAAPlayerStats } from "./lib/ncaa-stat-feed.mjs";

async function fetchSeason(season, source, target, minimum = 100) {
  const response = await fetch(source, {
    headers: { "User-Agent": "Hockey-Dynasty-data-sync/1.0", "Accept": "text/html" },
    signal: AbortSignal.timeout(25000)
  });
  if (!response.ok) throw new Error(`NCAA statistics HTTP ${response.status}: ${source}`);
  const html = await response.text();
  const skaters = parseNCAAPlayerStats(html);
  if (skaters.length < minimum) throw new Error(`NCAA stats feed incomplete for ${season}: ${skaters.length} skaters`);
  const payload = {
    schemaVersion: 1, league: "NCAA", season, source, syncedAt: new Date().toISOString(),
    counts: { skaters: skaters.length, goalies: 0 }, skaters, goalies: [],
    notes: [
      "Official College Hockey Inc. national individual scoring leaders.",
      "Skater statistics only; NCAA goalie ratings remain profile estimates until a complete goalie feed is added.",
      "Historical statistics are used only when no current-season player row exists; statistics inform model estimates and are not scouting grades."
    ]
  };
  await mkdir("data/ncaa", { recursive: true });
  await writeFile(target, JSON.stringify(payload, null, 2) + "\n", "utf8");
  console.log(`NCAA ${season} player statistics saved: ${skaters.length} skaters.`);
}

await fetchSeason("2026-2027", "https://www.collegehockeyinc.com/conferences/national/natplayer27.php", "data/ncaa/player-stats-2026-2027.json");
try {
  await fetchSeason("2025-2026", "https://www.collegehockeyinc.com/conferences/national/natplayer26.php", "data/ncaa/player-stats-2025-2026.json");
} catch (error) {
  console.warn(`NCAA 2025-26 fallback unavailable: ${error.message}`);
}
