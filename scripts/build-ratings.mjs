// Build league-wide game attributes from NHL Stats REST player-level reports.
import {writeFile,mkdir} from "node:fs/promises";
const codes=["ANA","BOS","BUF","CGY","CAR","CHI","COL","CBJ","DAL","DET","EDM","FLA","LAK","MIN","MTL","NSH","NJD","NYI","NYR","OTT","PHI","PIT","SJS","SEA","STL","TBL","TOR","UTA","VAN","VGK","WSH","WPG"];
const season=process.env.NHL_RATING_SEASON||"20252026";
const clamp=(n,a=0,b=99)=>Math.max(a,Math.min(b,Math.round(Number.isFinite(n)?n:a)));
const n=(p,...keys)=>{for(const k of keys){const v=p?.[k];if(v!==null&&v!==undefined&&v!==""&&Number.isFinite(Number(v)))return Number(v)}return 0};
async function get(url){const r=await fetch(url,{headers:{"User-Agent":"Hockey-Dynasty/1.0"}});if(!r.ok)throw Error("NHL API "+r.status+" "+url);return r.json()}
const exp=encodeURIComponent("seasonId="+season+" and gameTypeId=2");
const [skaterRes,goalieRes,faceoffRes]=await Promise.all([
 get("https://api.nhle.com/stats/rest/en/skater/summary?isAggregate=true&isGame=false&cayenneExp="+exp+"&limit=-1"),
 get("https://api.nhle.com/stats/rest/en/goalie/summary?isAggregate=true&isGame=false&cayenneExp="+exp+"&limit=-1"),
 get("https://api.nhle.com/stats/rest/en/skater/faceoffpercentages?isAggregate=true&isGame=false&cayenneExp="+exp+"&limit=-1").catch(()=>({data:[]}))
]);
const skaters=skaterRes.data||[],goalies=goalieRes.data||[];
if(skaters.length<400||goalies.length<40)throw Error("Incomplete player stats; refusing to replace ratings: "+skaters.length+" skaters / "+goalies.length+" goalies");
const biosRes=await get("https://api.nhle.com/stats/rest/en/skater/bios?isAggregate=true&isGame=false&cayenneExp="+exp+"&limit=-1");
const bios=new Map((biosRes.data||[]).map(p=>[String(p.playerId),p]));
const faceoffs=new Map((faceoffRes.data||[]).map(p=>[String(p.playerId),p]));
const goalieBiosRes=await get("https://api.nhle.com/stats/rest/en/goalie/bios?isAggregate=true&isGame=false&cayenneExp="+exp+"&limit=-1").catch(()=>({data:[]}));
const goalieBios=new Map((goalieBiosRes.data||[]).map(p=>[String(p.playerId),p]));
const pct=(values,v)=>{const a=values.filter(Number.isFinite).sort((x,y)=>x-y);if(!a.length)return .5;let lo=0,hi=a.length;while(lo<hi){const m=(lo+hi)>>1;if(a[m]<=v)lo=m+1;else hi=m}return lo/a.length};
const games=p=>Math.max(1,n(p,"gamesPlayed"));
const toiSeconds=p=>{const v=p?.timeOnIcePerGame??p?.avgToi??p?.timeOnIce; if(typeof v==="string"&&v.includes(":")){const a=v.split(":").map(Number);return a.length===2?a[0]*60+a[1]:a[0]*3600+a[1]*60+a[2]}return n(p,"timeOnIcePerGame","avgToi","timeOnIce")};
// Small NHL samples should not rate above established stars based on a hot streak.
const stabilized=(total,g,prior=24)=>total/(g+prior);
const ppg=p=>stabilized(n(p,"points"),games(p)), gpg=p=>stabilized(n(p,"goals"),games(p)), apg=p=>stabilized(n(p,"assists"),games(p));
const sample=p=>Math.min(1,Math.sqrt(games(p)/55));
const centered=(v,w)=>.5+(v-.5)*w;
const rates={ppg:skaters.map(ppg),gpg:skaters.map(gpg),apg:skaters.map(apg),toi:skaters.map(toiSeconds),shots:skaters.map(p=>n(p,"shots")/games(p)),plus:skaters.map(p=>n(p,"plusMinus")/Math.sqrt(games(p))),save:goalies.map(p=>n(p,"savePctg","savePercentage")),gaa:goalies.map(p=>n(p,"goalsAgainstAverage","gaa"))};
const players={};
for(const p of skaters){
 const id=String(p.playerId||"");if(!id)continue;
 const bio=bios.get(id)||{};
 const pos=String(bio.positionCode||bio.position||p.positionCode||"F").toUpperCase();
 const d=pos==="D"||pos==="DEFENSE";
 const w=sample(p);
 const point=centered(pct(rates.ppg,ppg(p)),w),goal=centered(pct(rates.gpg,gpg(p)),w),assist=centered(pct(rates.apg,apg(p)),w);
 const toi=centered(pct(rates.toi,toiSeconds(p)),w),shot=centered(pct(rates.shots,stabilized(n(p,"shots"),games(p))),w);
 const plus=centered(pct(rates.plus,n(p,"plusMinus")/Math.sqrt(games(p))),w);
 // Overall reflects role and sustained NHL contribution; +/- is only a minor proxy.
 const off=clamp(39+point*37+goal*9+shot*5);
 const def=clamp(46+toi*21+plus*7+(d?7:0));
 const oa=clamp(d?off*.38+def*.62:off*.68+def*.32);
 players[id]={FI:clamp(38+point*35+assist*13),SH:clamp(32+goal*53+shot*12),PL:clamp(38+point*35+assist*15),ST:clamp(40+toi*30+(d?7:0)),CH:clamp(40+toi*20+plus*15),PO:clamp(38+point*24+shot*18+goal*8),HI:clamp(43+toi*12+(d?12:0)),SK:clamp(47+toi*20+point*12),EN:clamp(42+toi*31),PE:clamp(40+plus*20+toi*12),FA:pos==="C"?clamp(42+pct((faceoffRes.data||[]).map(x=>n(x,"faceoffWinPct","faceoffWinPctg")),n(faceoffs.get(id),"faceoffWinPct","faceoffWinPctg"))*35):50,LE:clamp(40+toi*18+plus*12),SR:clamp(38+point*26+toi*16+plus*8),OFF:off,DEF:def,OA:oa};
}
for(const p of goalies){
 const id=String(p.playerId||"");if(!id)continue;
 const sv=n(p,"savePctg","savePercentage"),gaa=n(p,"goalsAgainstAverage","gaa"),wins=n(p,"wins");
 const w=Math.min(1,Math.sqrt(games(p)/35));
 const svp=centered(pct(rates.save,sv),w),gaap=centered(1-pct(rates.gaa,gaa),w),winp=centered(pct(goalies.map(x=>n(x,"wins")),wins),w);
 const ov=clamp(48+svp*25+gaap*13+winp*8);
 players[id]={FI:20,SH:15,PL:25,ST:clamp(ov+2),CH:ov,PO:clamp(ov+4),HI:clamp(ov-8),SK:clamp(ov-3),EN:ov,PE:ov,FA:20,LE:ov,SR:ov,OFF:20,DEF:ov,OA:ov};
}
if(Object.keys(players).length<450)throw Error("Too few ratings generated: "+Object.keys(players).length);
await mkdir("data",{recursive:true});
const out={generatedAt:new Date().toISOString(),season,source:"NHL Stats REST regular season; sample-adjusted estimates, not scouting grades",playerCount:Object.keys(players).length,skaterCount:skaters.length,goalieCount:goalies.length,players};
await writeFile("data/ratings.json",JSON.stringify(out));
console.log("Wrote",out.playerCount,"player ratings for season",season);
