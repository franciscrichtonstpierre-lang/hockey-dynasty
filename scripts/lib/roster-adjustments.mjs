const groupFor = p => p.positionCode === "G" ? "goalies" : p.positionCode === "D" ? "defensemen" : "forwards";
export function applyRosterAdjustments(rosters, adjustments) {
 const snapshots=adjustments.playerSnapshots||{};
 for(const move of adjustments.playerMoves||[]){
  if(move.rightsOnly)continue;
  const id=Number(move.nhlPlayerId);let player=snapshots[String(id)]||null;
  for(const roster of Object.values(rosters))for(const group of ["forwards","defensemen","goalies"]){
   const rows=roster[group]||[];const found=rows.find(p=>Number(p.id)===id);if(!player&&found)player=found;
   roster[group]=rows.filter(p=>Number(p.id)!==id);
  }
  if(!player)throw new Error("Missing player snapshot: "+move.player);
  const target=rosters[move.to];if(!target)throw new Error("Missing target roster: "+move.to);
  const group=groupFor(player);target[group]=target[group]||[];target[group].push({...player});
 }
 return rosters;
}
export function applyProspectRightsAdjustments(files, adjustments) {
 const snapshots=adjustments.playerSnapshots||{};
 for(const move of adjustments.playerMoves||[]){
  if(!move.rightsOnly)continue;
  const id=Number(move.nhlPlayerId);let prospect=snapshots[String(id)]||null;
  for(const file of Object.values(files)){const rows=file.prospects||[];const found=rows.find(p=>Number(p.id)===id);if(!prospect&&found)prospect=found;file.prospects=rows.filter(p=>Number(p.id)!==id);}
  if(!prospect)throw new Error("Missing prospect snapshot: "+move.player);
  const target=files[move.to];if(!target)throw new Error("Missing prospect target: "+move.to);
  target.prospects=target.prospects||[];target.prospects.push({...prospect,currentLeague:"NCAA",currentTeam:"Michigan",rightsTeamCode:move.to,nhlRightsTeamCode:move.to,rightsTransferredDate:adjustments.effectiveDate});
 }
 for(const file of Object.values(files))file.count=file.prospects.length;
 return files;
}
