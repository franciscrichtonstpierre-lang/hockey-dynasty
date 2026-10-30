// Build consistent, stats-informed 0–99 ratings for NHL roster players.
// Uses NHL club stats for the most recently completed regular season; these are game ratings,
// not official NHL attributes. Players without usable stats remain on the app's provisional fallback.
const codes=["ANA","BOS","BUF","CGY","CAR","CHI","COL","CBJ","DAL","DET","EDM","FLA","LAK","MIN","MTL","NSH","NJD","NYI","NYR","OTT","PHI","PIT","SJS","SEA","STL","TBL","TOR","UTA","VAN","VGK","WSH","WPG"];
const season=process.env.NHL_RATING_SEASON||"20252026";
const clamp=(n,a=0,b=99)=>Math.max(a,Math.min(b,Math.round(n)));
const num=(o,...keys)=>{for(const k of keys){const n=Number(o?.[k]);if(Number.isFinite(n)&&o?.[k]!==null&&o?.[k]!==undefined)return n;}return 0};
async function get(url){const r=await fetch(url,{headers:{"User-Agent":"Hockey-Dynasty/1.0"}});if(!r.ok)throw Error(r.status+" "+url);return r.json()}
const rows=[];
for(const code of codes){
  try{
    const d=await get(`https://api-web.nhle.com/v1/club-stats/${code}/${season}/2`);
    for(const p of d.skaters||[]) rows.push({...p,_team:code,_kind:"S"});
    for(const p of d.goalies||[]) rows.push({...p,_team:code,_kind:"G"});
    console.log(code,(d.skaters||[]).length,"skaters",(d.goalies||[]).length,"goalies");
  }catch(e){console.warn("Stats unavailable",code,String(e))}
}
if(rows.length<400) throw Error(`Too few NHL stat rows (${rows.length}); refusing to overwrite ratings file`);
const pct=(arr,v)=>{const vals=arr.filter(Number.isFinite).sort((a,b)=>a-b);if(!vals.length)return 0.5;let lo=0,hi=vals.length;while(lo<hi){const m=(lo+hi)>>1;if(vals[m]<=v)lo=m+1;else hi=m;}return lo/vals.length};
const sk=rows.filter(p=>p._kind==="S");
const rates={
 ppg:sk.map(p=>num(p,"points")/Math.max(1,num(p,"gamesPlayed","games"))),
 gpg:sk.map(p=>num(p,"goals")/Math.max(1,num(p,"gamesPlayed","games"))),
 toi:sk.map(p=>num(p,"avgToi","timeOnIcePerGame")),
 shots:sk.map(p=>num(p,"shots")/Math.max(1,num(p,"gamesPlayed","games"))),
 plus:sk.map(p=>num(p,"plusMinus")),
 face:sk.map(p=>num(p,"faceoffWinPct","faceoffWinPercentage")),
 goalies:rows.filter(p=>p._kind==="G")
};
const players={};
for(const p of rows){
 const id=String(p.playerId??p.id??"");if(!id)continue;
 const games=Math.max(1,num(p,"gamesPlayed","games"));
 if(p._kind==="G"){
   const sv=num(p,"savePct","savePercentage","savePctg");
   const gaa=num(p,"gaa","goalsAgainstAverage");
   const wins=num(p,"wins");
   const savePct=sv>1?sv/100:sv;
   const goalieBase=clamp(48+(savePct-0.900)*500+(3.0-gaa)*5+pct(rates.goalies.map(x=>num(x,"wins")),wins)*10);
   players[id]={FI:25,SH:20,PL:30,ST:clamp(goalieBase+2),CH:clamp(goalieBase),PO:clamp(goalieBase+4),HI:clamp(goalieBase-8),SK:clamp(goalieBase-2),EN:clamp(goalieBase),PE:clamp(goalieBase),FA:25,LE:clamp(goalieBase),SR:clamp(goalieBase),OFF:25,DEF:goalieBase,OA:goalieBase};
   continue;
 }
 const ppg=num(p,"points")/games,gpg=num(p,"goals")/games,apg=num(p,"assists")/games;
 const point=pct(rates.ppg,ppg),goal=pct(rates.gpg,gpg),toi=pct(rates.toi,num(p,"avgToi","timeOnIcePerGame")),shot=pct(rates.shots,num(p,"shots")/games),plus=pct(rates.plus,num(p,"plusMinus"));
 const pos=String(p.position||p.positionCode||"F").toUpperCase();
 const isD=pos==="D"||pos==="DEFENSE";
 const off=clamp(42+point*43+goal*12+shot*5);
 const def=clamp(43+toi*17+plus*20+(isD?12:0));
 const base=clamp(off*.53+def*.47);
 const fi=clamp(42+point*35+pct(rates.ppg,apg)*10);
 const sh=clamp(35+goal*54+shot*10);
 const pl=clamp(40+point*40+pct(rates.ppg,apg)*12);
 const st=clamp(43+toi*28+(isD?8:0));
 const ch=clamp(42+toi*22+plus*13);
 const po=clamp(40+point*27+shot*16+goal*8);
 const hi=clamp(45+toi*12+(isD?12:0));
 const sk=clamp(48+toi*20+point*12);
 const en=clamp(44+toi*30);
 const pe=clamp(42+plus*18+toi*12);
 const fa=pos==="C"?clamp(45+pct(rates.face,num(p,"faceoffWinPct","faceoffWinPercentage"))*40):50;
 const le=clamp(42+toi*18+plus*12);
 const sr=clamp(40+point*25+toi*15+plus*8);
 players[id]={FI:fi,SH:sh,PL:pl,ST:st,CH:ch,PO:po,HI:hi,SK:sk,EN:en,PE:pe,FA:fa,LE:le,SR:sr,OFF:off,DEF:def,OA:base};
}
const output={generatedAt:new Date().toISOString(),season,source:"NHL Web API club stats, regular season",playerCount:Object.keys(players).length,players};
await (await import("node:fs/promises")).writeFile("data/ratings.json",JSON.stringify(output));
console.log("Wrote ratings for",output.playerCount,"players");
