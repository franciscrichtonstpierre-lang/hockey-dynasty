// Enrichit les espoirs 2027 depuis Draft Prospects Hockey et Rink Central.
import { readFile, writeFile, mkdir } from "node:fs/promises";
const hubUrl="https://draftprospectshockey.com/prospects-hub";
const headers={"User-Agent":"Mozilla/5.0 (compatible; HockeyDynastyDataSync/1.0)","Accept":"text/html,application/xhtml+xml"};
const norm=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
function decode(s){return String(s||"").replace(/<[^>]*>/g," ").replace(/&nbsp;|&#160;/gi," ").replace(/&amp;/gi,"&").replace(/&quot;/gi,'"').replace(/&#39;|&apos;/gi,"'").replace(/&rsquo;/gi,"’").replace(/&ndash;/gi,"–").replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n))).replace(/&#x([0-9a-f]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16))).replace(/\s+/g," ").trim();}
async function get(url){const r=await fetch(url,{headers,signal:AbortSignal.timeout(20000)});if(!r.ok)throw new Error("HTTP "+r.status+" "+url);return await r.text();}
const hub=await get(hubUrl);
const entries=[];
const liBlocks=[...hub.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)].map(m=>m[1]);
for(const block of liBlocks){
 const text=decode(block);
 if(!text||!/·/.test(text)||!/(?:\bD\b|\bF\b|\bC\b|\bLW\b|\bRW\b|\bG\b)/.test(text))continue;
 const a=block.match(/<a\b[^>]*href=["']([^"']*rinkcentral\.com\/prospects\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/i);
 let name=a?decode(a[2]):text.replace(/^\s*(?:\d+|-)\s*/,"").split(/\s+(?:D|F|C|LW|RW|G|C\/W|C\/LW|RW\/C)\s*[·]/)[0].trim();
 if(!name||name.length<3)continue;
 const teamPart=text.match(/(?:\bD\b|\bF\b|\bC\b|\bLW\b|\bRW\b|\bG\b|\bC\/W\b|\bC\/LW\b|\bRW\/C)\s*[·]\s*([^·(]+?)(?:\s*\(|\s*·|$)/);
 entries.push({name,nameKey:norm(name),draftYear:2027,hubUrl,profileUrl:a?new URL(a[1],hubUrl).toString():null,currentTeam:teamPart?teamPart[1].trim():null});
}
const unique=[...new Map(entries.map(p=>[p.nameKey,p])).values()];
let cursor=0,profileErrors=0;
const enriched=[];
async function worker(){
 while(true){
  const i=cursor++;
  if(i>=unique.length)return;
  const p=unique[i];
  if(!p.profileUrl){enriched.push(p);continue;}
  try{
   const html=await get(p.profileUrl);
   const plain=decode(html);
   const title=decode((html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)||[])[1]||"");
   const name=title.replace(/\s*-\s*Stats.*$/i,"").trim()||p.name;
   const yearMatch=plain.match(/\bBorn\s+((?:19|20)\d{2})\b/i);
   const clubMatch=plain.match(/Club\s*[·:]\s*2026-27\s+(.+?)(?:\s+League|\s+Draft year|$)/i);
   const leagueMatch=plain.match(/League\s*[·:]\s*2026-27\s+([A-Za-z0-9 -]+)/i);
   const currentTeam=clubMatch?clubMatch[1].trim():p.currentTeam;
   const rawLeague=leagueMatch?leagueMatch[1].trim():null;
   const upper=String(rawLeague||"").toUpperCase();
   const currentLeague=upper.includes("NCAA")?"NCAA":upper.includes("WHL")?"WHL":upper.includes("OHL")?"OHL":upper.includes("QMJHL")?"QMJHL":upper.includes("USHL")?"USHL":upper.includes("LIIGA")?"LIIGA":upper.includes("KHL")?"KHL":upper.includes("SHL")?"SHL":upper.includes("MHL")?"MHL":upper.includes("NTDP")?"USNTDP":upper.includes("AHL")?"AHL":upper.includes("NHL")?"NHL":null;
   enriched.push({...p,name,nameKey:norm(name),birthYear:yearMatch?Number(yearMatch[1]):null,currentTeam,currentLeague,sourceUrl:p.profileUrl});
  }catch(error){profileErrors++;enriched.push(p);console.warn("Rink Central profile skipped "+p.profileUrl+": "+error.message);}
 }
}
await Promise.all(Array.from({length:6},()=>worker()));
await mkdir("data/players",{recursive:true});
const output={generatedAt:new Date().toISOString(),source:"Draft Prospects Hockey 2027 / Rink Central player profiles",draftYear:2027,players:enriched,entriesParsed:unique.length,profilesFetched:unique.filter(p=>p.profileUrl).length,profileErrors};
await writeFile("data/players/future-draft-bio-enrichment.json",JSON.stringify(output,null,2)+"\n","utf8");
console.log("Future draft source: "+enriched.length+" prospects; "+enriched.filter(p=>p.birthYear).length+" birth years; "+enriched.filter(p=>p.currentTeam).length+" current teams; "+profileErrors+" profile errors.");
