// Build league-wide game attributes from NHL Stats REST player-level reports.
import {writeFile,mkdir} from "node:fs/promises";
const codes=["ANA","BOS","BUF","CGY","CAR","CHI","COL","CBJ","DAL","DET","EDM","FLA","LAK","MIN","MTL","NSH","NJD","NYI","NYR","OTT","PHI","PIT","SJS","SEA","STL","TBL","TOR","UTA","VAN","VGK","WSH","WPG"];
// Start from the live 2026-27 season. The explicit environment override remains
// available for reproducible historical builds; never silently label old data as current.
const season=process.env.NHL_RATING_SEASON||"20262027";
if (!/^\d{8}$/.test(season)) throw new Error("NHL_RATING_SEASON must use YYYY YYYY format (for example 20262027).");
const clamp=(n,a=0,b=99)=>Math.max(a,Math.min(b,Math.round(Number.isFinite(n)?n:a)));
const n=(p,...keys)=>{for(const k of keys){const v=p?.[k];if(v!==null&&v!==undefined&&v!==""&&Number.isFinite(Number(v)))return Number(v)}return 0};
async function get(url){const r=await fetch(url,{headers:{"User-Agent":"Hockey-Dynasty/1.0"},signal:AbortSignal.timeout(45000)});if(!r.ok)throw Error("NHL API "+r.status+" "+url);return r.json()}
const exp=encodeURIComponent("seasonId="+season+" and gameTypeId=2");
const previousSeason=String(Number(season.slice(0,4))-1)+String(Number(season.slice(4))-1);
const previousExp=encodeURIComponent("seasonId="+previousSeason+" and gameTypeId=2");
const [skaterRes,goalieRes,faceoffRes,previousSkaterRes,previousGoalieRes,previousFaceoffRes]=await Promise.all([
 get("https://api.nhle.com/stats/rest/en/skater/summary?isAggregate=true&isGame=false&cayenneExp="+exp+"&limit=-1"),
 get("https://api.nhle.com/stats/rest/en/goalie/summary?isAggregate=true&isGame=false&cayenneExp="+exp+"&limit=-1"),
 get("https://api.nhle.com/stats/rest/en/skater/faceoffpercentages?isAggregate=true&isGame=false&cayenneExp="+exp+"&limit=-1").catch(()=>({data:[]})),
 get("https://api.nhle.com/stats/rest/en/skater/summary?isAggregate=true&isGame=false&cayenneExp="+previousExp+"&limit=-1").catch(()=>({data:[]})),
 get("https://api.nhle.com/stats/rest/en/goalie/summary?isAggregate=true&isGame=false&cayenneExp="+previousExp+"&limit=-1").catch(()=>({data:[]})),
 get("https://api.nhle.com/stats/rest/en/skater/faceoffpercentages?isAggregate=true&isGame=false&cayenneExp="+previousExp+"&limit=-1").catch(()=>({data:[]}))
]);
const currentSkaters=skaterRes.data||[],currentGoalies=goalieRes.data||[];
const previousSkaters=previousSkaterRes.data||[],previousGoalies=previousGoalieRes.data||[];
if(currentSkaters.length<400||currentGoalies.length<40)throw Error("Incomplete current-season player stats; refusing to replace ratings: "+currentSkaters.length+" skaters / "+currentGoalies.length+" goalies");
const blendRows=(currentRows,previousRows,fields)=>{
 const currentById=new Map(currentRows.map(p=>[String(p.playerId||""),p]));
 const previousById=new Map(previousRows.map(p=>[String(p.playerId||""),p]));
 const ids=new Set([...currentById.keys(),...previousById.keys()]);
 return [...ids].filter(Boolean).map(id=>{
  const cur=currentById.get(id)||{},prev=previousById.get(id)||{};
  const cg=Math.max(0,n(cur,"gamesPlayed")),pg=Math.max(0,n(prev,"gamesPlayed"));
  const currentWeight=cg>0?0.60:0,previousWeight=pg>0?(cg>0?0.40:1):0,totalWeight=currentWeight+previousWeight||1;
  const rate=(row,field,games)=>games>0?n(row,field)/games:0;
  const blended={...prev,...cur,playerId:id,gamesPlayed:100,_currentGames:cg,_previousGames:pg};
  for(const field of fields){
   const value=(rate(cur,field,cg)*currentWeight+rate(prev,field,pg)*previousWeight)/totalWeight;
   blended[field]=value*100;
  }
  const plusRate=(row,games)=>games>0?n(row,"plusMinus")/Math.sqrt(games):0;
  blended.plusMinus=((plusRate(cur,cg)*currentWeight+plusRate(prev,pg)*previousWeight)/totalWeight)*10;
  const toiRate=(row,games)=>{const value=row?.timeOnIcePerGame??row?.avgToi??row?.timeOnIce;if(games<=0)return 0;if(typeof value==="string"&&value.includes(":")){const parts=value.split(":").map(Number);return parts.length===2?parts[0]*60+parts[1]:parts[0]*3600+parts[1]*60+parts[2]}return n(row,"timeOnIcePerGame","avgToi","timeOnIce")};
  blended.timeOnIcePerGame=(toiRate(cur,cg)*currentWeight+toiRate(prev,pg)*previousWeight)/totalWeight;
  blended.fightingMajors=n(cur,"fightingMajors","fightingMajorCount","fightMajors","fights")+n(prev,"fightingMajors","fightingMajorCount","fightMajors","fights");
  blended._evidenceGames=cg+Math.min(pg,82)*0.5;
  return blended;
 });
};
const skaters=blendRows(currentSkaters,previousSkaters,["goals","assists","points","shots","hits","blockedShots","takeaways","giveaways","penaltyMinutes","powerPlayPoints","shPoints"]);
const goalies=blendRows(currentGoalies,previousGoalies,["wins","saves","shotsAgainst","goalsAgainst","shutouts"]);
const blendFaceoffs=(currentRows,previousRows)=>{
 const byId=new Map();
 for(const row of currentRows||[])byId.set(String(row.playerId||""),{cur:row});
 for(const row of previousRows||[]){const id=String(row.playerId||"");const v=byId.get(id)||{};v.prev=row;byId.set(id,v)}
 return new Map([...byId].map(([id,v])=>{
  const cg=Math.max(0,n(currentByIdValue(v),"gamesPlayed")),pg=Math.max(0,n(v.prev,"gamesPlayed"));
  const cp=n(v.cur,"faceoffWinPct","faceoffWinPctg"),pp=n(v.prev,"faceoffWinPct","faceoffWinPctg");
  const value=cg>0&&pg>0?cp*.6+pp*.4:cg>0?cp:pp;
  return [id,{faceoffWinPct:value}];
 }));
};
function currentByIdValue(v){return v.cur||{}}
const faceoffs=blendFaceoffs(faceoffRes.data||[],previousFaceoffRes.data||[]);

const biosRes=await get("https://api.nhle.com/stats/rest/en/skater/bios?isAggregate=true&isGame=false&cayenneExp="+exp+"&limit=-1");
const bios=new Map((biosRes.data||[]).map(p=>[String(p.playerId),p]));

const goalieBiosRes=await get("https://api.nhle.com/stats/rest/en/goalie/bios?isAggregate=true&isGame=false&cayenneExp="+exp+"&limit=-1").catch(()=>({data:[]}));
const goalieBios=new Map((goalieBiosRes.data||[]).map(p=>[String(p.playerId),p]));
const pct=(values,v)=>{const a=values.filter(Number.isFinite).sort((x,y)=>x-y);if(!a.length)return .5;let lo=0,hi=a.length;while(lo<hi){const m=(lo+hi)>>1;if(a[m]<=v)lo=m+1;else hi=m}return lo/a.length};
const games=p=>Math.max(1,n(p,"gamesPlayed"));
const toiSeconds=p=>{const v=p?.timeOnIcePerGame??p?.avgToi??p?.timeOnIce; if(typeof v==="string"&&v.includes(":")){const a=v.split(":").map(Number);return a.length===2?a[0]*60+a[1]:a[0]*3600+a[1]*60+a[2]}return n(p,"timeOnIcePerGame","avgToi","timeOnIce")};
// Small NHL samples should not rate above established stars based on a hot streak.
const stabilized=(total,g,prior=24)=>total/(g+prior);
const ppg=p=>stabilized(n(p,"points"),games(p)), gpg=p=>stabilized(n(p,"goals"),games(p)), apg=p=>stabilized(n(p,"assists"),games(p));
// Preserve true zero-game samples as null in provenance; never invent a positive sample count.
const sample=p=>Math.min(1,Math.sqrt(Math.max(1,n(p,"_evidenceGames", "gamesPlayed"))/55));
const centered=(v,w)=>.5+(v-.5)*w;
const perGame=(p,...keys)=>stabilized(n(p,...keys),games(p));
const rates={
 ppg:skaters.map(ppg),gpg:skaters.map(gpg),apg:skaters.map(apg),
 toi:skaters.map(toiSeconds),shots:skaters.map(p=>perGame(p,"shots")),
 plus:skaters.map(p=>n(p,"plusMinus")/Math.sqrt(games(p))),
 hits:skaters.map(p=>perGame(p,"hits")),blocks:skaters.map(p=>perGame(p,"blockedShots","blocks")),
 takeaways:skaters.map(p=>perGame(p,"takeaways")),giveaways:skaters.map(p=>perGame(p,"giveaways")),
 pim:skaters.map(p=>perGame(p,"penaltyMinutes","pim")),
 powerPlay:skaters.map(p=>perGame(p,"powerPlayPoints","ppPoints")),
 shortHanded:skaters.map(p=>perGame(p,"shPoints","shortHandedPoints")),
 save:goalies.map(p=>n(p,"savePctg","savePercentage")),gaa:goalies.map(p=>n(p,"goalsAgainstAverage","gaa"))
};
const players={},playerMetadata={};
for(const p of skaters){
 const id=String(p.playerId||"");if(!id)continue;
 const bio=bios.get(id)||{};
 const pos=String(bio.positionCode||bio.position||p.positionCode||"F").toUpperCase();
 const d=pos==="D"||pos==="DEFENSE";
 const w=sample(p);
 const point=centered(pct(rates.ppg,ppg(p)),w),goal=centered(pct(rates.gpg,gpg(p)),w),assist=centered(pct(rates.apg,apg(p)),w);
 const toi=centered(pct(rates.toi,toiSeconds(p)),w),shot=centered(pct(rates.shots,stabilized(n(p,"shots"),games(p))),w);
 const plus=centered(pct(rates.plus,n(p,"plusMinus")/Math.sqrt(games(p))),w);
 const hit=centered(pct(rates.hits,perGame(p,"hits")),w);
 const block=centered(pct(rates.blocks,perGame(p,"blockedShots","blocks")),w);
 const takeaway=centered(pct(rates.takeaways,perGame(p,"takeaways")),w);
 const giveaway=centered(1-pct(rates.giveaways,perGame(p,"giveaways")),w);
 const discipline=centered(1-pct(rates.pim,perGame(p,"penaltyMinutes","pim")),w);
 const powerPlay=centered(pct(rates.powerPlay,perGame(p,"powerPlayPoints","ppPoints")),w);
 const shortHanded=centered(pct(rates.shortHanded,perGame(p,"shPoints","shortHandedPoints")),w);
 // NHL box-score evidence now informs checking, positioning, physicality and special-teams contribution.
 // +/- remains a modest signal; no single counting stat can dominate a grade.
 const off=clamp(39+point*34+goal*10+shot*5+powerPlay*3);
 const def=clamp(42+toi*13+plus*6+takeaway*8+giveaway*5+block*5+(d?5:0));
 const oa=clamp(d?off*.38+def*.62:off*.68+def*.32);
 const fightingMajors=n(p,"fightingMajors","fightingMajorCount","fightMajors","fights");
 players[id]={
  FI:fightingMajors>0?clamp(20+Math.min(79,fightingMajors*12)):10,
  SH:clamp(30+goal*47+shot*12+point*5),
  PL:clamp(34+point*34+assist*14+powerPlay*6+shortHanded*2),
  ST:clamp(35+takeaway*20+giveaway*20+assist*15+point*10), // Stickhandling proxy: puck control, retention and playmaking; not speed, hits or ice time.
  CH:clamp(35+hit*30+takeaway*15+plus*8+(d?4:0)),
  PO:clamp(38+takeaway*22+giveaway*16+block*12+plus*5),
  HI:clamp(35+hit*34+block*20+toi*6),
  SK:clamp(50+toi*15+shot*12+point*8),
  EN:clamp(38+toi*24+sample(p)*12),
  PE:clamp(25+discipline*65),
  FA:pos==="C"?clamp(42+pct([...faceoffs.values()].map(x=>n(x,"faceoffWinPct","faceoffWinPctg")),n(faceoffs.get(id),"faceoffWinPct","faceoffWinPctg"))*35):50,
  LE:clamp(38+toi*17+plus*10+powerPlay*5+shortHanded*3),
  SR:clamp(36+point*22+goal*18+shot*14+powerPlay*4),
  OFF:off,DEF:def,OA:oa
 };
 const a=players[id];
 a.OFF=clamp((a.SH+a.PL+a.ST)/3);
 a.DEF=clamp((a.CH+a.PO+a.HI)/3);
 const oaKeys=["SH","PL","ST","CH","PO","HI","SK","EN","PE","FA","LE","SR","OFF","DEF"];
 a.OA=clamp(oaKeys.reduce((sum,key)=>sum+a[key],0)/oaKeys.length);
 playerMetadata[id]={source:"NHL Stats REST regular-season player statistics; 60% current season + 40% previous season",status:"two_season_weighted_statistical_estimate",confidence:"low",sampleConfidence:n(p,"_evidenceGames")>=55?"high":n(p,"_evidenceGames")>=25?"medium":"low",sampleSize:n(p,"_currentGames")>0?n(p,"_currentGames"):n(p,"_previousGames")>0?n(p,"_previousGames"):null,fightingMajors,ratedAttributes:Object.keys(players[id]).filter(key=>players[id][key]!=null),modeledAttributes:Object.keys(players[id]).filter(key=>players[id][key]==null),method:"nhl_two_season_weighted_percentile_model_v2",evidence:"nhl_player_statistics",position:pos,season:previousSeason+"+"+season};
}
for(const p of goalies){
 const id=String(p.playerId||"");if(!id)continue;
 const sv=n(p,"savePctg","savePercentage"),gaa=n(p,"goalsAgainstAverage","gaa"),wins=n(p,"wins");
 const w=sample(p);
 const svp=centered(pct(rates.save,sv),w),gaap=centered(1-pct(rates.gaa,gaa),w),winp=centered(pct(goalies.map(x=>n(x,"wins")),wins),w);
 const ov=clamp(48+svp*25+gaap*13+winp*8);
 const sh=clamp(ov-8),pl=clamp(ov-5),st=clamp(ov+2),ch=ov,po=clamp(ov+4),hi=clamp(ov-8);
 const off=clamp((sh+pl+st)/3),def=clamp((ch+po+hi)/3);
 const oaKeys=[sh,pl,st,ch,po,hi,clamp(ov-3),ov,ov,clamp(ov-5),ov,ov,off,def];
 const oa=clamp(oaKeys.reduce((sum,value)=>sum+value,0)/oaKeys.length);
 players[id]={FI:10,SH:sh,PL:pl,ST:st,CH:ch,PO:po,HI:hi,SK:clamp(ov-3),EN:ov,PE:58,FA:clamp(ov-5),LE:ov,SR:ov,OFF:off,DEF:def,OA:oa};
 playerMetadata[id]={source:"NHL Stats REST regular-season goalie statistics; 60% current season + 40% previous season",status:"sample_adjusted_statistical_estimate",confidence:"low",sampleConfidence:n(p,"_evidenceGames")>=55?"high":n(p,"_evidenceGames")>=25?"medium":"low",sampleSize:n(p,"_currentGames")>0?n(p,"_currentGames"):n(p,"_previousGames")>0?n(p,"_previousGames"):null,ratedAttributes:Object.keys(players[id]).filter(key=>players[id][key]!=null),modeledAttributes:Object.keys(players[id]).filter(key=>players[id][key]==null),method:"nhl_season_statistics_percentile_model_v1",evidence:"nhl_player_statistics",position:"G",season};
}
// Final canonical pass: every skater and goalie uses identical OFF/DEF/OA
// derivation after all 13 individual attributes have been rounded to integers.
const oaKeys=["SH","PL","ST","CH","PO","HI","SK","EN","PE","FA","LE","SR","OFF","DEF"];
for(const [id,a] of Object.entries(players)){
 a.OFF=clamp((a.SH+a.PL+a.ST)/3);
 a.DEF=clamp((a.CH+a.PO+a.HI)/3);
 a.OA=clamp(oaKeys.reduce((sum,key)=>sum+a[key],0)/oaKeys.length);
 const check=clamp(oaKeys.reduce((sum,key)=>sum+a[key],0)/oaKeys.length);
 if(a.OA!==check)throw Error("OA consistency failure for player "+id);
}
if(Object.keys(players).length<450)throw Error("Too few ratings generated: "+Object.keys(players).length);
await mkdir("data",{recursive:true});
const out={schemaVersion:2,generatedAt:new Date().toISOString(),season:previousSeason+"+"+season,source:"NHL Stats REST regular-season statistics; 60% current season + 40% previous season, sample-adjusted estimates, not scouting grades",playerCount:Object.keys(players).length,skaterCount:skaters.length,goalieCount:goalies.length,currentSeasonSkaterCount:currentSkaters.length,currentSeasonGoalieCount:currentGoalies.length,previousSeasonSkaterCount:previousSkaters.length,previousSeasonGoalieCount:previousGoalies.length,attributes:Object.keys(players[Object.keys(players)[0]]||{}),playerMetadata,players};
await writeFile("data/ratings.json",JSON.stringify(out));
console.log("Wrote",out.playerCount,"player ratings for season",season);
