// Supplemental previous-season AHL/ECHL statistics for players without a 2026-27 sample.
import { mkdir, writeFile } from "node:fs/promises";
import { findPlayerRows, parseJsonp, validatePlayerRows } from "./lib/ahl-stat-feed.mjs";

const base = "https://lscluster.hockeytech.com/feed/index.php";
const configs = [
  { league:"AHL", seasonId:"93", key:"ccb91f29d6744675", client:"ahl", leagueId:"4", siteId:"3", folder:"ahl" },
  { league:"ECHL", seasonId:"77", key:"2c2b89ea7345cae8", client:"echl", leagueId:"1", siteId:"0", folder:"echl" }
];
async function get(url) {
  const response = await fetch(url, {
    headers:{ "User-Agent":"Hockey-Dynasty-data-sync/1.0", "Accept":"application/json, text/javascript" },
    signal:AbortSignal.timeout(25000)
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${url}`);
  return parseJsonp(await response.text());
}
for (const config of configs) {
  const endpoint = extra => {
    const url = new URL(base);
    const params = {
      feed:"statviewfeed", key:config.key, client_code:config.client,
      league_id:config.leagueId, site_id:config.siteId, lang:"en",
      view:"players", season:config.seasonId, team:"all", limit:1000, ...extra
    };
    for (const [key,value] of Object.entries(params)) url.searchParams.set(key,String(value));
    return url.toString();
  };
  const skaterUrl = endpoint({});
  const goalieUrl = endpoint({ position:"goalies" });
  const [skaterRaw, goalieRaw] = await Promise.all([get(skaterUrl),get(goalieUrl)]);
  const skaters = validatePlayerRows(findPlayerRows(skaterRaw), { minimum:100, kind:`${config.league} prior-season skater` });
  const goalies = validatePlayerRows(findPlayerRows(goalieRaw), { minimum:15, kind:`${config.league} prior-season goalie` });
  const payload = {
    schemaVersion:1, league:config.league, season:"2025-2026", seasonId:config.seasonId,
    source:`Official ${config.league} HockeyTech / LeagueStat public player statistics feed (2025-26)`,
    syncedAt:new Date().toISOString(), endpoints:{skaters:skaterUrl,goalies:goalieUrl},
    counts:{skaters:skaters.length,goalies:goalies.length}, skaters, goalies,
    notes:["Previous-season statistics are used only when no current-season player row exists.", "Historical statistical estimates are labelled with their source season; they are not scouting grades."]
  };
  await mkdir(`data/${config.folder}`,{recursive:true});
  await writeFile(`data/${config.folder}/player-stats-2025-2026.json`,JSON.stringify(payload,null,2)+"\n","utf8");
  console.log(`${config.league} prior-season stats: ${skaters.length} skaters, ${goalies.length} goalies.`);
}
