/* NHL web roster payload adapter. Network fetching is intentionally external to this pure mapper. */
(function(root){
 "use strict";
 const text=v=>String(v??"").trim();
 function rosterRows(payload){
  if(Array.isArray(payload))return payload;
  if(!payload||typeof payload!=="object")return [];
  const keys=["forwards","defensemen","defense","goalies"];
  const rows=[];
  for(const key of keys)if(Array.isArray(payload[key]))rows.push(...payload[key]);
  if(rows.length)return rows;
  if(Array.isArray(payload.players))return payload.players;
  return [];
 }
 function mapNhlPlayer(row,team,season){
  const id=row.id??row.playerId??row.nhlPlayerId;
  const first=text(row.firstName?.default??row.firstName);
  const last=text(row.lastName?.default??row.lastName);
  const full=text(row.fullName?.default??row.fullName)||[first,last].filter(Boolean).join(" ");
  if(!id||!full)return null;
  const pos=text(row.positionCode??row.position??row.positionType);
  return {
   id:"nhl:"+String(id),nhlPlayerId:String(id),name:full,
   birthDate:row.birthDate??row.birthdate??null,
   positionCode:pos,shootsCatches:row.shootsCatches??row.shoots??null,
   height:row.heightInInches??row.height??null,weight:row.weightInPounds??row.weight??null,
   team,season,league:"NHL",jerseyNumber:row.sweaterNumber??row.jerseyNumber??null,
   source:{name:"NHL Web API",url:"https://api-web.nhle.com/v1/roster/"+team+"/"+season,edition:season,checkedAt:null},
   ratings:null,potential:null,consistency:null,
   ratingsStatus:"not_imported",potentialStatus:"unverified",consistencyStatus:"unverified"
  };
 }
 function normalizeTeamRoster(payload,team,season){
  if(!/^[A-Z]{3}$/.test(text(team)))throw new Error("Expected three-letter NHL team code");
  if(!/^20\d{6}$/.test(text(season)))throw new Error("Expected season in YYYYYYYY format");
  return rosterRows(payload).map(row=>mapNhlPlayer(row,team,season)).filter(Boolean);
 }
 const api={rosterRows,mapNhlPlayer,normalizeTeamRoster};
 if(typeof module!=="undefined"&&module.exports)module.exports=api;
 root.HDNhlRosterAdapter=api;
})(typeof globalThis!=="undefined"?globalThis:this);
