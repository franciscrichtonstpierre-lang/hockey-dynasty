// Synchronise les statistiques individuelles officielles LAH via le flux HockeyTech.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { findPlayerRows, parseJsonp as parseFeedJsonp, validatePlayerRows } from "./lib/ahl-stat-feed.mjs";

const seasonId = process.env.UHM_AHL_SEASON_ID || "94"; // 2026-2027
const base = "https://lscluster.hockeytech.com/feed/index.php";
const common = { feed:"statviewfeed", key:"ccb91f29d6744675", client_code:"ahl", league_id:"4", site_id:"3", lang:"en" };
function endpoint(extra={}) {
  const u = new URL(base);
  for (const [k,v] of Object.entries({...common, view:"players", season:seasonId, team:"all", limit:1000, ...extra})) u.searchParams.set(k,String(v));
  return u.toString();
}
function parseJsonp(text) {
  return parseFeedJsonp(text);
}
async function get(url) {
  const res=await fetch(url,{headers:{"User-Agent":"Hockey-Dynasty-data-sync/1.0","Accept":"application/json, text/javascript"},signal:AbortSignal.timeout(20000)});
  if(!res.ok)throw new Error(`HTTP ${res.status}: ${url}`);
  return parseJsonp(await res.text());
}
const skaterUrl=endpoint();
const goalieUrl=endpoint({position:"goalies"});
const [skaterPayload,goaliePayload]=await Promise.all([get(skaterUrl),get(goalieUrl)]);
const skaters=findPlayerRows(skaterPayload);
const goalies=findPlayerRows(goaliePayload);
const skaterRows=validatePlayerRows(skaters,{minimum:50,kind:"skater"});
const goalieRows=validatePlayerRows(goalies,{minimum:10,kind:"goalie"});
const teams=JSON.parse(await readFile("data/ahl/teams.json","utf8")).teams||[];
const payload={
  schemaVersion:1,league:"AHL",season:"2026-2027",seasonId,
  source:"Official AHL HockeyTech public player statistics feed",
  syncedAt:new Date().toISOString(),
  endpoints:{skaters:skaterUrl,goalies:goalieUrl},
  counts:{skaters:skaterRows.length,goalies:goalieRows.length},
  teams:teams.map(t=>({nhlCode:t.nhlCode,ahlName:t.ahlName})),
  skaters:skaterRows,goalies:goalieRows,
  notes:[
    "Raw league-wide season statistics; not scouting grades.",
    "HockeyTech player IDs are distinct from NHL API player IDs.",
    "AHL does not publish every EHM-style attribute; physical and mental traits require separate scouting estimates and confidence labels."
  ]
};
await mkdir("data/ahl",{recursive:true});
await writeFile("data/ahl/player-stats-2026-2027.json",JSON.stringify(payload,null,2)+"\n","utf8");
console.log(`AHL player stats saved: ${skaterRows.length} skaters, ${goalieRows.length} goalies (season ID ${seasonId}).`);
