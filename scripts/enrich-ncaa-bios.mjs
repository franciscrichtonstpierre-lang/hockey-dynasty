// Récupère les dates de naissance des effectifs NCAA 2026-27 depuis College Hockey News.
import { readFile, writeFile, mkdir } from "node:fs/promises";
const indexUrl="https://www.collegehockeynews.com/reports/roster/RPI/48";
const headers={"User-Agent":"Hockey-Dynasty-data-sync/1.0","Accept":"text/html,application/xhtml+xml"};
const norm=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
function decode(s){
 return String(s||"").replace(/<[^>]*>/g," ").replace(/&nbsp;|&#160;/gi," ").replace(/&amp;/gi,"&").replace(/&quot;/gi,'"').replace(/&#39;|&apos;/gi,"'").replace(/&rsquo;/gi,"’").replace(/&ndash;/gi,"–").replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n))).replace(/&#x([0-9a-f]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16))).replace(/\s+/g," ").trim();
}
function dateOnly(s){
 const v=String(s||"").trim();
 if(/^\d{4}-\d{2}-\d{2}$/.test(v))return v;
 const m=v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
 return m?m[3]+"-"+m[1].padStart(2,"0")+"-"+m[2].padStart(2,"0"):null;
}
async function get(url){
 const r=await fetch(url,{headers,signal:AbortSignal.timeout(20000)});
 if(!r.ok)throw new Error("HTTP "+r.status+" "+url);
 return await r.text();
}
const indexHtml=await get(indexUrl);
const links=[...indexHtml.matchAll(/href=["']([^"']*\/reports\/roster\/[^"']+)["']/gi)].map(m=>new URL(m[1],indexUrl).toString());
const rosterUrls=[...new Set(links)].filter(url=>/\/reports\/roster\/[^/]+\/\d+\/?$/i.test(new URL(url).pathname));
if(!rosterUrls.length)throw new Error("No NCAA roster links found on College Hockey News index page");
let cursor=0;
const pages=[],errors=[];
async function worker(){
 while(true){
  const i=cursor++;
  if(i>=rosterUrls.length)return;
  const url=rosterUrls[i];
  try{
   const html=await get(url);
   const title=decode((html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)||[])[1]||"");
   const teamName=title.replace(/\s+2026[‑-]27\s+Roster.*/i,"").trim()||decode(url.split("/").slice(-2,-1)[0].replace(/-/g," "));
   const found=[];
   const tables=[...html.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/gi)].map(m=>m[1]).filter(table=>/DOB/i.test(table)&&/Name/i.test(table));
   for(let tableIndex=0;tableIndex<tables.length;tableIndex++){
    const recordType=tableIndex===0?"roster":"recruit";
    const trs=[...tables[tableIndex].matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)];
    for(const tr of trs){
     const cells=[...tr[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(m=>decode(m[1]));
     if(cells.length<3)continue;
     const dob=cells.map(dateOnly).find(Boolean);
     if(!dob)continue;
     let rawName=cells.find(x=>/,/.test(x)&&x.length>3);
     if(!rawName)rawName=cells[1]||cells[0];
     if(!rawName||/^(name|player)$/i.test(rawName))continue;
     let fullName=rawName;
     if(rawName.includes(",")){
      const [last,...rest]=rawName.split(",");
      fullName=rest.join(",").trim()+" "+last.trim();
     }
     fullName=fullName.replace(/\s+/g," ").trim();
     if(!fullName||fullName.length<4)continue;
     found.push({league:"NCAA",recordType,name:fullName,nameKey:norm(fullName),birthDate:dob,currentTeam:recordType==="roster"?teamName:null,committedTeam:recordType==="recruit"?teamName:null,sourceUrl:url});
    }
   }
   pages.push({url,teamName,players:found});
   console.log(teamName+": "+found.length+" dates de naissance.");
  }catch(error){errors.push({url,error:String(error.message||error)});}
 }
}
await Promise.all(Array.from({length:8},()=>worker()));
const byName=new Map();
for(const page of pages)for(const p of page.players){
 if(!byName.has(p.nameKey))byName.set(p.nameKey,[]);
 byName.get(p.nameKey).push(p);
}
const players=[],ambiguous=[];
for(const [key,items] of byName){
 const roster=items.filter(p=>p.recordType==="roster");
 const recruits=items.filter(p=>p.recordType==="recruit");
 if(roster.length===1)players.push(roster[0]);
 else if(roster.length===0&&recruits.length===1)players.push(recruits[0]);
 else ambiguous.push({name:items[0].name,teams:[...new Set(items.map(x=>x.currentTeam||x.committedTeam).filter(Boolean))]});
}
await mkdir("data/players",{recursive:true});
const output={season:"2026-2027",generatedAt:new Date().toISOString(),source:"College Hockey News 2026-27 team rosters",teams:pages.length,players,ambiguous,errors};
await writeFile("data/players/ncaa-bio-enrichment.json",JSON.stringify(output,null,2)+"\n","utf8");
console.log("NCAA bio source: "+players.length+" joueurs uniques avec DOB; "+ambiguous.length+" noms ambigus; "+errors.length+" erreurs de pages.");
