// Enrichit les futurs espoirs avec les informations visibles sur les profils RinkCentral.
import { readFile, writeFile, mkdir } from "node:fs/promises";
const source=JSON.parse(await readFile("data/future-draft-prospects/2027-2029.json","utf8"));
const prospects=source.prospects||[];
const norm=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
const decode=s=>String(s||"").replace(/<[^>]*>/g," ").replace(/&nbsp;|&#160;/gi," ").replace(/&amp;/gi,"&").replace(/&quot;/gi,'"').replace(/&#39;|&apos;/gi,"'").replace(/\s+/g," ").trim();
const queue=prospects.filter(p=>p.sourceProfileUrl&&/rinkcentral\.com\/prospects\//i.test(p.sourceProfileUrl));
const results=[],errors=[];
let cursor=0,withoutBirthYear=0;
async function worker(){
 while(true){
  const i=cursor++;
  if(i>=queue.length)return;
  const p=queue[i];
  try{
   const response=await fetch(p.sourceProfileUrl,{headers:{"User-Agent":"Hockey-Dynasty-data-sync/1.0","Accept":"text/html"},signal:AbortSignal.timeout(15000)});
   if(!response.ok)throw new Error("HTTP "+response.status);
   const html=await response.text();
   const plain=decode(html);
   const born=plain.match(/\bBorn\s+((?:19|20)\d{2})(?:\s|$)/i);
   const birthYear=born?Number(born[1]):null;
   if(!birthYear){withoutBirthYear++;continue;}
   results.push({name:p.name,nameKey:norm(p.name),birthYear,draftYear:p.draftYear,currentTeam:p.currentTeam||null,currentLeague:p.currentLeague||null,sourceUrl:p.sourceProfileUrl});
  }catch(error){errors.push({name:p.name,url:p.sourceProfileUrl,error:String(error.message||error)});}
 }
}
await Promise.all(Array.from({length:5},()=>worker()));
await mkdir("data/players",{recursive:true});
const output={generatedAt:new Date().toISOString(),source:"RinkCentral individual draft prospect profiles; year of birth only where published",profilesChecked:queue.length,players:results,withoutBirthYear,errors};
await writeFile("data/players/future-draft-bio-enrichment.json",JSON.stringify(output,null,2)+"\n","utf8");
console.log("RinkCentral draft profiles: "+queue.length+" checked; "+results.length+" birth years; "+withoutBirthYear+" unavailable; "+errors.length+" errors.");
