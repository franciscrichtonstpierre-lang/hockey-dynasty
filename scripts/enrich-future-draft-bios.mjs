// Enrichit les dates de naissance des futurs espoirs via les profils Elite Prospects.
import { readFile, writeFile, mkdir } from "node:fs/promises";
const years=[2027,2028,2029];
const headers={"User-Agent":"Hockey-Dynasty-data-sync/1.0","Accept":"text/html,application/xhtml+xml"};
const norm=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
function decode(s){return String(s||"").replace(/<[^>]*>/g," ").replace(/&nbsp;|&#160;/gi," ").replace(/&amp;/gi,"&").replace(/&quot;/gi,'"').replace(/&#39;|&apos;/gi,"'").replace(/&rsquo;/gi,"’").replace(/&ndash;/gi,"–").replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n))).replace(/&#x([0-9a-f]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16))).replace(/\s+/g," ").trim();}
function dateOnly(s){const d=new Date(s);return Number.isNaN(d.getTime())?null:d.toISOString().slice(0,10);}
async function get(url){const r=await fetch(url,{headers,signal:AbortSignal.timeout(20000)});if(!r.ok)throw new Error("HTTP "+r.status+" "+url);return await r.text();}
const profiles=new Map(),errors=[];
for(const year of years){
 const url="https://www.eliteprospects.com/draft-center/"+year;
 try{
  const html=await get(url);
  const hrefs=[...html.matchAll(/href=["']([^"']*\/player\/\d+\/[^"']+)["']/gi)].map(m=>new URL(m[1],url).toString());
  for(const profileUrl of hrefs)profiles.set(profileUrl,year);
  console.log("Elite Prospects draft "+year+": "+hrefs.length+" profils trouvés.");
 }catch(error){errors.push({url,error:String(error.message||error)});}
}
const urls=[...profiles.keys()];
let cursor=0,updated=0,withoutDob=0;
const players=[];
async function worker(){
 while(true){
  const i=cursor++;
  if(i>=urls.length)return;
  const url=urls[i],year=profiles.get(url);
  try{
   const html=await get(url);
   const title=decode((html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)||[])[1]||"");
   const name=title.replace(/\s*-\s*Stats.*$/i,"").trim();
   const plain=decode(html);
   const m=plain.match(/Date of Birth\s+([A-Za-zÀ-ÿ]{3,12}\s+\d{1,2},\s+\d{4})/i);
   const birthDate=m?dateOnly(m[1]):null;
   if(!birthDate){withoutDob++;continue;}
   players.push({name,nameKey:norm(name),birthDate,draftYear:year,sourceUrl:url});
   updated++;
  }catch(error){errors.push({url,error:String(error.message||error)});}
 }
}
await Promise.all(Array.from({length:6},()=>worker()));
await mkdir("data/players",{recursive:true});
const output={generatedAt:new Date().toISOString(),source:"Elite Prospects draft center and player profiles",years,profilesFound:urls.length,players,withoutDob,errors};
await writeFile("data/players/future-draft-bio-enrichment.json",JSON.stringify(output,null,2)+"\n","utf8");
console.log("Future draft bio source: "+updated+" profils avec DOB; "+withoutDob+" sans DOB; "+errors.length+" erreurs.");
