// Synchronise les statistiques individuelles officielles LAH via le flux HockeyTech.
import { mkdir, readFile, writeFile } from "node:fs/promises";

const seasonId = process.env.UHM_AHL_SEASON_ID || "94"; // 2026-2027
const base = "https://lscluster.hockeytech.com/feed/index.php";
const common = { feed:"statviewfeed", key:"ccb91f29d6744675", client_code:"ahl", league_id:"4", site_id:"3", lang:"en" };
function endpoint(extra={}) {
  const u = new URL(base);
  for (const [k,v] of Object.entries({...common, view:"players", season:seasonId, team:"all", ...extra})) u.searchParams.set(k,String(v));
  return u.toString();
}
function parseJsonp(text) {
  const start=text.indexOf("("), end=text.lastIndexOf(")");
  const raw=start>=0&&end>start?text.slice(start+1,end):text;
  return JSON.parse(raw.replace(/^\uFEFF/,""));
}
async function get(url) {
  const res=await fetch(url,{headers:{"User-Agent":"Hockey-Dynasty-data-sync/1.0","Accept":"application/json, text/javascript"},signal:AbortSignal.timeout(20000)});
  if(!res.ok)throw new Error(`HTTP ${res.status}: ${url}`);
  return parseJsonp(await res.text());
}
function findPlayerRows(value) {
  if(Array.isArray(value)) {
    if(value.length && value.some(p=>p&&typeof p==="object"&&(p.player_id!=null||p.playerId!=null)&&(p.games_played!=null||p.gamesPlayed!=null||p.GP!=null||p.goals!=null||p.G!=null))) return value;
    for(const item of value){const found=findPlayerRows(item);if(found.length)return found;}
  } else if(value&&typeof value==="object") {
    for(const [key,child] of Object.entries(value)){
      if(["Players","players","playerStats","player_stats","data","rows"].includes(key)&&Array.isArray(child)){
        const found=findPlayerRows(child);if(found.length)return found;
      }
    }
    for(const child of Object.values(value)){if(child&&typeof child==="object"){const found=findPlayerRows(child);if(found.length)return found;}}
  }
  return [];
}
const skaterUrl=endpoint();
const goalieUrl=endpoint({position:"goalies"});
const [skaterPayload,goaliePayload]=await Promise.all([get(skaterUrl),get(goalieUrl)]);
const skaters=findPlayerRows(skaterPayload);
const goalies=findPlayerRows(goaliePayload);
const unique=(rows)=>[...new Map(rows.map(p=>[String(p.player_id??p.playerId??p.person_id??p.id),p]).filter(([id])=>id&&id!=="undefined")).values()];
const skaterRows=unique(skaters),goalieRows=unique(goalies);
if(skaterRows.length<50||goalieRows.length<10) {
  throw new Error(`LAH stats response incomplete/schema changed: ${skaterRows.length} skaters, ${goalieRows.length} goalies; refusing to replace existing snapshot.`);
}
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
