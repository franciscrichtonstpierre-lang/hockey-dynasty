// Récupère les dates de naissance et équipes actuelles des ligues juniors HockeyTech.
import { readFile, writeFile, mkdir } from "node:fs/promises";
const configs=[
 {code:"OHL",client:"ohl",key:"f1aa699db3d81487",leagueId:"1",siteId:"1",seasonId:"83",base:"https://lscluster.hockeytech.com/feed/index.php"},
 {code:"WHL",client:"whl",key:"f1aa699db3d81487",leagueId:"7",siteId:"0",seasonId:"289",base:"https://lscluster.hockeytech.com/feed/index.php"},
 {code:"QMJHL",client:"lhjmq",key:"f322673b6bcae299",leagueId:"6",siteId:"0",seasonId:"211",base:"https://cluster.leaguestat.com/feed/index.php"},
 {code:"USHL",client:"ushl",key:"e828f89b243dc43f",leagueId:"1",siteId:"0",seasonId:null,base:"https://lscluster.hockeytech.com/feed/index.php"}
];
const first=(...v)=>v.find(x=>x!=null&&String(x).trim()!=="");
const nameKey=v=>String(v||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
function parseBody(body){
 const start=body.indexOf("("),end=body.lastIndexOf(")");
 const raw=start>=0&&end>start?body.slice(start+1,end):body;
 return JSON.parse(raw.replace(/^\uFEFF/,""));
}
function walk(v,out=[]){
 if(Array.isArray(v)){for(const x of v)walk(x,out);return out;}
 if(v&&typeof v==="object"){out.push(v);for(const x of Object.values(v))if(x&&typeof x==="object")walk(x,out);}
 return out;
}
function dateOnly(v){
 if(v==null)return null;
 const s=String(v).trim();
 if(/^\d{4}-\d{2}-\d{2}$/.test(s))return s;
 const m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
 return m?m[3]+"-"+m[1].padStart(2,"0")+"-"+m[2].padStart(2,"0"):null;
}
async function request(config,params){
 const url=new URL(config.base);
 for(const [k,v] of Object.entries(params))if(v!=null)url.searchParams.set(k,String(v));
 const res=await fetch(url,{headers:{"User-Agent":"Hockey-Dynasty-data-sync/1.0","Accept":"application/json, text/javascript"},signal:AbortSignal.timeout(20000)});
 if(!res.ok)throw new Error(config.code+" HTTP "+res.status);
 return parseBody(await res.text());
}
async function seasonIdFor(config){
 if(config.seasonId)return config.seasonId;
 const raw=await request(config,{feed:"modulekit",view:"seasons",key:config.key,client_code:config.client,lang:"en",fmt:"json"});
 const seasons=walk(raw);
 const found=seasons.find(x=>String(first(x.season_name,x.seasonName,x.name,"")).match(/2026\s*[-/]\s*27|2026\s*[-/]\s*2027|20262027/i));
 return found?String(first(found.season_id,found.seasonId,found.id)):null;
}
const all=[];
const errors=[];
for(const cfg of configs){
 try{
  const seasonId=await seasonIdFor(cfg);
  if(!seasonId){errors.push({league:cfg.code,error:"2026-27 season id not found"});continue;}
  const leagueRows=[];
  for(const position of ["skaters","goalies"]){
   try{
    const raw=await request(cfg,{feed:"statviewfeed",view:"players",season:seasonId,team:"all",position,rookies:"0",statsType:"standard",rosterstatus:"undefined",site_id:cfg.siteId,league_id:cfg.leagueId,lang:"en",key:cfg.key,client_code:cfg.client,limit:"500",sort:"points"});
    for(const row of walk(raw)){
     const name=first(row.name,row.full_name,row.display_name,row.player_name,row.playerName);
     const id=first(row.player_id,row.playerId,row.person_id,row.id);
     const birthDate=dateOnly(first(row.birthdate,row.birthDate,row.rawbirthdate,row.birth_date,row.dob));
     if(!name||!birthDate)continue;
     leagueRows.push({league:cfg.code,playerId:String(id||""),name:String(name).trim(),nameKey:nameKey(name),birthDate,currentTeam:String(first(row.team_name,row.teamName,row.team_label,row.team,"")||""),position:String(first(row.position,row.positionCode,"")||""),sourceUrl:cfg.base+"?feed=statviewfeed&view=players&season="+seasonId+"&team=all&position="+position+"&client_code="+cfg.client});
    }
   }catch(error){errors.push({league:cfg.code,position,error:String(error.message||error)});}
  }
  const seen=new Map();
  for(const p of leagueRows){
   if(!seen.has(p.nameKey))seen.set(p.nameKey,[]);
   seen.get(p.nameKey).push(p);
  }
  for(const [key,items] of seen){
   const unique=[...new Map(items.map(p=>[p.birthDate+"|"+p.currentTeam,p])).values()];
   if(unique.length===1)all.push(unique[0]);
   else errors.push({league:cfg.code,name:items[0].name,error:"ambiguous duplicate source rows"});
  }
  console.log(cfg.code+": "+leagueRows.length+" lignes avec DOB; "+seen.size+" noms.");
 }catch(error){errors.push({league:cfg.code,error:String(error.message||error)});}
}
await mkdir("data/players",{recursive:true});
const output={season:"2026-2027",generatedAt:new Date().toISOString(),source:"Official HockeyTech / LeagueStat player statistics feeds",players:all,errors};
await writeFile("data/players/junior-bio-enrichment.json",JSON.stringify(output,null,2)+"\n","utf8");
console.log("Junior bio source: "+all.length+" joueurs uniques avec date de naissance; "+errors.length+" avertissements.");
