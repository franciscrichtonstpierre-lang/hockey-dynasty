// Enrichit les joueurs sans date de naissance à partir de l'API officielle NHL.
import { readFile, writeFile } from "node:fs/promises";
const registryPath="data/players/registry.json";
const cachePath="data/players/nhl-player-bios.json";
const auditPath="data/players/nhl-player-bio-audit.json";
const registry=JSON.parse(await readFile(registryPath,"utf8"));
let cache={};try{cache=JSON.parse(await readFile(cachePath,"utf8"));}catch{}
const players=registry.players||[];
const candidates=[];
for(const p of players){
 if(p.birthDate)continue;
 const match=String(p.id||p.playerId||"").match(/(?:NHL-|REG-nhl-)(\d{6,})$/);
 const rawId=p.nhlPlayerId||p.nhl_player_id||(match?match[1]:null);
 const id=Number(rawId);
 if(Number.isFinite(id)&&id>0)candidates.push({registryId:String(p.id||p.playerId||""),name:String(p.name||""),nhlPlayerId:id,player:p});
}
const unique=[...new Map(candidates.map(x=>[x.nhlPlayerId,x])).values()];
let cursor=0,requests=0,failed=0,notFound=0,updated=0;
const errors=[];
const sourceRows=[];
async function fetchBio(id){
 const url="https://api-web.nhle.com/v1/player/"+id+"/landing";
 const response=await fetch(url,{headers:{"Accept":"application/json","User-Agent":"Hockey-Dynasty-data-sync/1.0"},signal:AbortSignal.timeout(15000)});
 if(response.status===404)return {birthDate:null,sourceUrl:url,notFound:true};
 if(!response.ok)throw new Error("HTTP "+response.status);
 const data=await response.json();
 const birthDate=String(data.birthDate||data.birthdate||"").slice(0,10);
 return {birthDate:/^\d{4}-\d{2}-\d{2}$/.test(birthDate)?birthDate:null,sourceUrl:url,firstName:data.firstName?.default||data.firstName||null,lastName:data.lastName?.default||data.lastName||null};
}
async function worker(){
 while(true){
  const i=cursor++;
  if(i>=unique.length)return;
  const item=unique[i],id=String(item.nhlPlayerId);
  let record=cache[id];
  if(!record){
   requests++;
   try{record=await fetchBio(item.nhlPlayerId);cache[id]=record;}
   catch(error){failed++;errors.push({nhlPlayerId:item.nhlPlayerId,name:item.name,error:String(error.message||error)});continue;}
  }
  if(record.notFound)notFound++;
  if(!record.birthDate)continue;
  for(const candidate of candidates.filter(x=>x.nhlPlayerId===item.nhlPlayerId)){
   if(!candidate.player.birthDate){
    candidate.player.birthDate=record.birthDate;
    candidate.player.birthDateSource=record.sourceUrl;
    candidate.player.bioSourceUrl=record.sourceUrl;
    candidate.player.nhlPlayerId=item.nhlPlayerId;
    updated++;
    sourceRows.push({registryId:candidate.registryId,name:candidate.name,nhlPlayerId:item.nhlPlayerId,birthDate:record.birthDate,sourceUrl:record.sourceUrl});
   }
  }
 }
}
await Promise.all(Array.from({length:8},()=>worker()));
await writeFile(registryPath,JSON.stringify(registry,null,2)+"\n","utf8");
await writeFile(cachePath,JSON.stringify(cache,null,2)+"\n","utf8");
const stillMissing=candidates.filter(x=>!x.player.birthDate).map(x=>({registryId:x.registryId,name:x.name,nhlPlayerId:x.nhlPlayerId}));
const audit={source:"Official NHL API player landing",season:"2026-2027",candidates:unique.length,requests,updated,notFound,failed,stillMissing,errors,updatedAt:new Date().toISOString()};
await writeFile(auditPath,JSON.stringify(audit,null,2)+"\n","utf8");
console.log("NHL bio enrichment: "+updated+" dates ajoutées sur "+unique.length+" IDs NHL; "+stillMissing.length+" sans date dans la source; "+failed+" erreurs API.");
