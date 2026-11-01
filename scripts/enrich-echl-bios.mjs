// Enrichir les fiches ECHL avec les biographies officielles HockeyTech / LeagueStat.
import { readFile, writeFile } from "node:fs/promises";

const seasonId = process.env.UHM_ECHL_SEASON_ID || "78";
const base = "https://lscluster.hockeytech.com/feed/index.php";
const common = { feed:"statviewfeed", key:"2c2b89ea7345cae8", client_code:"echl", league_id:"1", site_id:"0", lang:"en" };
const endpoint = (playerId) => {
  const url = new URL(base);
  for (const [key,value] of Object.entries({ ...common, view:"player", player_id:playerId, season_id:seasonId, statsType:"bio" })) url.searchParams.set(key,String(value));
  return url.toString();
};
function parseJsonp(text) {
  const start=text.indexOf("("), end=text.lastIndexOf(")");
  const raw=start>=0&&end>start?text.slice(start+1,end):text;
  return JSON.parse(raw.replace(/^\\uFEFF/,""));
}
function walk(value,out=[]) {
  if(Array.isArray(value)){for(const item of value)walk(item,out);return out;}
  if(value&&typeof value==="object"){out.push(value);for(const item of Object.values(value))if(item&&typeof item==="object")walk(item,out);}
  return out;
}
function first(...values) {
  return values.find(value=>value!=null&&String(value).trim()!=="");
}
function dateOnly(value) {
  if(value==null)return null;
  const raw=String(value).trim();
  if(/^\\d{4}-\\d{2}-\\d{2}$/.test(raw))return raw;
  const us=raw.match(/^(\\d{1,2})\\/(\\d{1,2})\\/(\\d{4})$/);
  if(us)return `${us[3]}-${us[1].padStart(2,"0")}-${us[2].padStart(2,"0")}`;
  return null;
}
async function fetchBio(playerId) {
  const url=endpoint(playerId);
  const response=await fetch(url,{headers:{"User-Agent":"Hockey-Dynasty-data-sync/1.0","Accept":"application/json, text/javascript"},signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw new Error(`HTTP ${response.status}`);
  const raw=parseJsonp(await response.text());
  const nodes=walk(raw);
  const siteKit=nodes.find(node=>node.SiteKit&&typeof node.SiteKit==="object")?.SiteKit;
  const info=siteKit?.info || nodes.find(node=>node.info&&typeof node.info==="object")?.info || null;
  if(!info)return {url,info:null};
  return {url,info};
}
const index=JSON.parse(await readFile("data/echl/teams.json","utf8"));
const cachePath="data/echl/player-bios.json";
let cache={};
try{cache=JSON.parse(await readFile(cachePath,"utf8"));}catch{}
const files=[];
for(const team of index.teams||[]){
  const path=`data/echl/${team.file}`;
  const data=JSON.parse(await readFile(path,"utf8"));
  files.push({path,data});
}
const entries=[];
for(const file of files)for(const player of file.data.players||[]){
  const id=String(player.player_id??player.person_id??"");
  if(id)entries.push({id,player});
}
let cursor=0,active=0,enriched=0,fromCache=0,failed=0;
const errors=[];
async function worker(){
  while(true){
    const i=cursor++;
    if(i>=entries.length)return;
    const {id,player}=entries[i];
    let record=cache[id];
    if(!record){
      try{
        const result=await fetchBio(id);
        const info=result.info;
        record=info?{info,sourceUrl:result.url}:null;
        if(record)cache[id]=record;
      }catch(error){failed++;errors.push({playerId:id,name:player.name,error:String(error.message||error)});continue;}
    }else fromCache++;
    if(!record?.info)continue;
    const info=record.info;
    const dob=dateOnly(first(info.birthdate,info.birthDate,info.birth_date,info.rawbirthdate,info.dob));
    if(dob){player.birthdate=dob;player.bioSourceUrl=record.sourceUrl;enriched++;}
    const birthplace=first(info.birthplace,info.birthtown,info.birthTown,info.birth_city,info.birthCity);
    if(birthplace&&!player.birthplace)player.birthplace=String(birthplace);
    const height=first(info.height,info.h);
    if(height&&!player.h)player.h=String(height);
    const weight=first(info.weight,info.w);
    if(weight&&!player.w)player.w=String(weight);
    const shoots=first(info.shoots,info.catches);
    if(shoots&&!player.shoots&&!player.catches)player.shoots=String(shoots);
  }
}
await Promise.all(Array.from({length:6},()=>worker()));
for(const file of files)await writeFile(file.path,JSON.stringify(file.data,null,2)+"\\n","utf8");
await writeFile(cachePath,JSON.stringify(cache,null,2)+"\\n","utf8");
const missing=entries.filter(({player})=>!player.birthdate).map(({id,player})=>({playerId:id,name:player.name,team:player.team_name||null}));
const audit={season:"2026-2027",seasonId,source:"ECHL HockeyTech / LeagueStat player profile bio",players:entries.length,enrichedBirthDates:enriched,cachedProfiles:fromCache,missingBirthDates:missing.length,failedRequests:failed,missing,errors,updatedAt:new Date().toISOString()};
await writeFile("data/echl/player-bio-audit.json",JSON.stringify(audit,null,2)+"\\n","utf8");
console.log(`ECHL bios: ${enriched} dates de naissance ajoutées; ${fromCache} profils en cache; ${missing.length} dates encore absentes; ${failed} erreurs API.`);
