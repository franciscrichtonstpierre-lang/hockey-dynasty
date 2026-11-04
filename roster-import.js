/* Hockey Dynasty roster import normalization. Preserves source observations; never fabricates ratings. */
(function(root){
 "use strict";
 const text=v=>String(v??"").trim();
 const id=v=>text(v).toLowerCase();
 const mapPosition=v=>{
  const p=id(v);
  if(["g","goalie","goaltender"].includes(p))return "G";
  if(["d","ld","rd","defense","defence","defenseman"].includes(p))return "D";
  if(["c","lw","rw","f","forward","centre","center","left wing","right wing"].includes(p))return p==="c"||p==="centre"||p==="center"?"C":"F";
  return null;
 };
 const clamp=v=>Number.isFinite(Number(v))?Math.max(0,Math.min(99,Math.round(Number(v)))):null;
 function normalizePlayer(row,source){
  const name=text(row.name??row.fullName);
  if(!name)throw new Error("Player row is missing a name");
  const pos=mapPosition(row.positionCode??row.position??row.positionType);
  const birth=row.birthDate?text(row.birthDate).slice(0,10):null;
  const ratings={};
  for(const key of ["FI","SH","PL","ST","CH","PO","HI","SK","EN","PE","FA","LE","SR","OFF","DEF"]){
   const raw=row[key]??row.attributes?.[key]??row.ratings?.[key];
   if(raw!==undefined&&raw!==null&&raw!=="")ratings[key]=clamp(raw);
  }
  const complete=Object.keys(ratings).length===15;
  return {
   externalIdentity:{sourceName:source.name,sourceUrl:source.url??null,sourceEdition:source.edition??null,sourceCheckedAt:source.checkedAt??new Date().toISOString(),externalId:row.externalId??row.id??null,nhlPlayerId:row.nhlPlayerId??null,eliteProspectsId:row.eliteProspectsId??null},
   identity:{name,birthDate:birth,position:pos,team:text(row.team??row.teamName)||null,league:text(row.league??source.league)||null},
   ratings:{...ratings,OA:null},
   ratingsStatus:complete?"complete":"partial",
   potential:{value:clamp(row.potential??row.PA),status:row.potentialSource?"sourced_estimate":"unverified"},
   consistency:{value:clamp(row.consistency??row.CON),status:row.consistencySource?"sourced_estimate":"unverified"}
  };
 }
 function normalizeBatch(rows,source){
  if(!source?.name)throw new Error("Source name is required");
  return (Array.isArray(rows)?rows:[]).map(row=>normalizePlayer(row,source));
 }
 const api={normalizePlayer,normalizeBatch,mapPosition};
 if(typeof module!=="undefined"&&module.exports)module.exports=api;
 root.HDRosterImport=api;
})(typeof globalThis!=="undefined"?globalThis:this);
