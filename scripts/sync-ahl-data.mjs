// Synchronise les effectifs LAH via le flux public HockeyTech utilisé par l'AHL.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

const seasonId = process.env.UHM_AHL_SEASON_ID || "94"; // 2026-2027
const base = "https://lscluster.hockeytech.com/feed/index.php";
const common = { feed:"statviewfeed", key:"ccb91f29d6744675", client_code:"ahl", league_id:"4", site_id:"3", lang:"en" };
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
function endpoint(view, extra={}) {
  const u = new URL(base);
  for (const [k,v] of Object.entries({...common, view, ...extra})) u.searchParams.set(k,String(v));
  return u.toString();
}
function parseJsonp(text) {
  const start=text.indexOf("("), end=text.lastIndexOf(")");
  const raw=start>=0&&end>start?text.slice(start+1,end):text;
  return JSON.parse(raw.replace(/^\uFEFF/,""));
}
async function get(url) {
  const res=await fetch(url,{headers:{"User-Agent":"Ultimate-Hockey-Manager-data-sync/1.0","Accept":"application/json, text/javascript"},signal:AbortSignal.timeout(25000)});
  if(!res.ok)throw new Error(`HTTP ${res.status}: ${url}`);
  return parseJsonp(await res.text());
}
function walk(value, out=[]) {
  if(Array.isArray(value)){for(const x of value)walk(x,out);return out}
  if(value&&typeof value==="object"){out.push(value);for(const x of Object.values(value))if(x&&typeof x==="object")walk(x,out)}
  return out;
}
const norm=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]/g,"");
const teams=JSON.parse(await readFile("data/ahl/teams.json","utf8")).teams;
// The public AHL feed exposes team identifiers reliably through its season standings view.
// Use the end-year season (2026 = 2026-27) for team discovery, then season_id for rosters.
const rawTeams=await get(endpoint("teams",{season:"2026",groupTeamsBy:"league"}));
const candidates=walk(rawTeams).filter(x=>(x.team_id||x.teamId||x.id)&& (x.name||x.team||x.team_name||x.teamName||x.team_nickname||x.teamNickName||x.team_full_name||x.teamFullName));
let succeeded=0, failed=0;
for(const affiliate of teams){
  const target=norm(affiliate.ahlName);
  const match=candidates.find(t=>[t.name,t.team,t.team_name,t.teamName,t.team_nickname,t.teamNickName,t.team_full_name,t.teamFullName,[t.team_city||t.city,t.team_nickname||t.teamNickName||t.nickname].filter(Boolean).join(" ")].some(n=>norm(n)===target || (norm(n).length>4 && (target.includes(norm(n)) || norm(n).includes(target)))));
  if(!match){console.error(`ERROR team id not found for ${affiliate.ahlName}`);failed++;continue}
  const teamId=match.team_id||match.teamId||match.id;
  const url=endpoint("roster",{team_id:teamId,season_id:seasonId});
  try{
    const raw=await get(url);
    const objects=walk(raw);
    let players=[];
    for(const obj of objects){
      for(const key of ["Roster","roster","players","Players","data"]){
        if(Array.isArray(obj[key]) && obj[key].some(p=>p&&typeof p==="object"&&(p.player_id||p.person_id||p.first_name||p.last_name||p.name))){
          players=obj[key];break;
        }
      }
      if(players.length)break;
    }
    if(!players.length)players=objects.filter(p=>(p.player_id||p.person_id)&& (p.first_name||p.last_name||p.name||p.display_name));
    if(players.length<10)throw new Error(`Roster too small or response schema changed (${players.length})`);
    const payload={teamCode:affiliate.nhlCode,ahlName:affiliate.ahlName,teamId:String(teamId),season:"2026-2027",seasonId,source:"AHL HockeyTech public feed",sourceUrl:url,syncedAt:new Date().toISOString(),count:players.length,players};
    const path=`data/ahl/${affiliate.nhlCode}.json`;
    await mkdir(dirname(path),{recursive:true});
    await writeFile(path,JSON.stringify(payload,null,2)+"\n","utf8");
    console.log(`OK ${affiliate.nhlCode} / ${affiliate.ahlName}: ${players.length}`);
    succeeded++;
  }catch(e){console.error(`ERROR ${affiliate.nhlCode}: ${e.message}`);failed++}
  await pause(1100);
}
console.log(`LAH sync complete: ${succeeded}/${teams.length} clubs; ${failed} failures`);
if(failed)process.exitCode=1;
