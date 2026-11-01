// Synchronise les effectifs ECHL depuis le flux public HockeyTech / LeagueStat.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

const seasonId = process.env.UHM_ECHL_SEASON_ID || "78"; // 2026-2027
const base = "https://lscluster.hockeytech.com/feed/index.php";
const common = { feed:"statviewfeed", key:"2c2b89ea7345cae8", client_code:"echl", league_id:"1", site_id:"0", lang:"en" };
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
function endpoint(view, extra={}) {
  const u = new URL(base);
  for (const [k,v] of Object.entries({...common, view, ...extra})) u.searchParams.set(k,String(v));
  return u.toString();
}
function parseJsonp(text) {
  const start=text.indexOf("("), end=text.lastIndexOf(")");
  const raw=start>=0&&end>start?text.slice(start+1,end):text;
  return JSON.parse(raw.replace(/^\\uFEFF/,""));
}
async function get(url) {
  const res=await fetch(url,{headers:{"User-Agent":"Hockey-Dynasty-data-sync/1.0","Accept":"application/json, text/javascript"},signal:AbortSignal.timeout(15000)});
  if(!res.ok)throw new Error(`HTTP ${res.status}: ${url}`);
  return parseJsonp(await res.text());
}
function walk(value,out=[]) {
  if(Array.isArray(value)){for(const x of value)walk(x,out);return out}
  if(value&&typeof value==="object"){out.push(value);for(const x of Object.values(value))if(x&&typeof x==="object")walk(x,out)}
  return out;
}
const norm=s=>String(s||"").normalize("NFD").replace(/[\\u0300-\\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]/g,"");
const bootstrap=await get(endpoint("bootstrap",{season:seasonId,pageName:"roster"}));
const seasonRows=[...(bootstrap.regularSeasons||[]),...(bootstrap.playoffSeasons||[])];
const season=seasonRows.find(s=>String(s.season_name||s.seasonName||s.name||"").replace(/\\s/g,"").includes("2026-2027")||String(s.season_id||s.id||"")===seasonId);
const actualSeasonId=String(season?.season_id||season?.id||seasonId);
const teams=(bootstrap.teamsNoAll||bootstrap.teams||[]).filter(t=>(t.team_id||t.teamId||t.id)&&(t.name||t.team||t.team_name||t.teamName||t.team_nickname||t.teamNickName||t.team_full_name||t.teamFullName));
if(teams.length<25)throw new Error(`ECHL bootstrap returned only ${teams.length} teams; refusing to publish an incomplete league.`);
const slug=s=>norm(s).replace(/[^a-z0-9]/g,"-").replace(/^-|-$/g,"");
let succeeded=0,failed=0;
async function syncTeam(team){
  const name=String(team.name||team.team_full_name||team.teamFullName||team.team_name||team.teamName||team.team||team.team_nickname||team.teamNickName||"").trim();
  const id=String(team.team_id||team.teamId||team.id);
  try{
    const url=endpoint("roster",{team_id:id,season_id:actualSeasonId});
    const raw=await get(url), objects=walk(raw);
    let players=[];
    for(const obj of objects){
      for(const key of ["Roster","roster","players","Players","data"]){
        if(Array.isArray(obj[key])&&obj[key].some(p=>p&&typeof p==="object"&&(p.player_id!=null||p.person_id!=null)&&(p.name||p.display_name||p.first_name||p.last_name))){players=obj[key];break}
      }
      if(players.length)break;
    }
    if(!players.length)players=objects.filter(p=>(p.player_id!=null||p.person_id!=null)&&(p.name||p.display_name||p.first_name||p.last_name));
    // LeagueStat prepends a column-schema descriptor row to some roster arrays.
    // Keep only real player rows; schema cells are objects, not scalar IDs/names.
    players=players.filter(p=>{
      const id=p?.player_id??p?.person_id;
      const name=p?.name??p?.display_name;
      return p && typeof p==="object" &&
        (typeof id==="string"||typeof id==="number") &&
        typeof name==="string" && name.trim().length>1;
    });
    if(players.length<10)throw new Error(`Roster trop petit ou schéma modifié (${players.length})`);
    const payload={teamId:id,teamName:name,season:"2026-2027",seasonId:actualSeasonId,source:"ECHL HockeyTech / LeagueStat public feed",sourceUrl:url,syncedAt:new Date().toISOString(),count:players.length,players};
    const path=`data/echl/${slug(name)}.json`;
    await mkdir(dirname(path),{recursive:true});
    await writeFile(path,JSON.stringify(payload,null,2)+"\n","utf8");
    console.log(`OK ${name}: ${players.length} joueurs`);succeeded++;
  }catch(e){console.error(`ERREUR ${name}: ${e.message}`);failed++}
  await pause(300);
}
let next=0;
await Promise.all(Array.from({length:4},async()=>{while(next<teams.length){const i=next++;await syncTeam(teams[i])}}));
const index={season:"2026-2027",seasonId:actualSeasonId,generatedAt:new Date().toISOString(),source:"ECHL HockeyTech / LeagueStat public feed",teamCount:teams.length,rostersFetched:succeeded,failed,teams:teams.map(t=>({teamId:String(t.team_id||t.teamId||t.id),teamName:String(t.name||t.team_full_name||t.teamFullName||t.team_name||t.teamName||t.team||t.team_nickname||t.teamNickName||"").trim(),file:slug(t.name||t.team_full_name||t.teamFullName||t.team_name||t.teamName||t.team||t.team_nickname||t.teamNickName)+".json"}))};
await writeFile("data/echl/teams.json",JSON.stringify(index,null,2)+"\n","utf8");
console.log(`ECHL sync: ${succeeded}/${teams.length} équipes; ${failed} échecs; saison ${actualSeasonId}`);
if(failed||succeeded!==teams.length)process.exitCode=1;
