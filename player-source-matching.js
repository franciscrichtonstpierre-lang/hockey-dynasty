/* Hockey Dynasty — deterministic player identity matching for external rating sources.
 * Never auto-merges ambiguous identities. NHL/league IDs take precedence over names.
 */
(function(root) {
  "use strict";
  const clean = value => String(value ?? "")
    .normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
  const suffixes = new Set(["jr","sr","ii","iii","iv"]);
  function nameParts(value) {
    const parts = clean(value).split(" ").filter(Boolean);
    while (parts.length && suffixes.has(parts[parts.length - 1])) parts.pop();
    return parts;
  }
  function sameName(a,b) {
    const x=nameParts(a), y=nameParts(b);
    return x.length>0 && y.length>0 && x.join(" ")===y.join(" ");
  }
  function matchPlayer(source, players) {
    const candidates = Array.isArray(players) ? players : [];
    const sourceIds = [
      ["nhlPlayerId", source?.nhlPlayerId],
      ["eliteProspectsId", source?.eliteProspectsId],
      ["externalId", source?.externalId]
    ].filter(([,v]) => v !== undefined && v !== null && String(v).trim() !== "");
    for (const [field,value] of sourceIds) {
      const hits=candidates.filter(p => String(p?.[field] ?? "")===String(value));
      if (hits.length===1) return {status:"matched",playerId:String(hits[0].id ?? hits[0].playerId),method:field,confidence:"verified",candidates:[]};
      if (hits.length>1) return {status:"ambiguous",method:field,confidence:"low",candidates:hits.map(p=>String(p.id ?? p.playerId))};
    }
    const name=source?.name ?? source?.fullName;
    if (!name) return {status:"unmatched",method:"none",confidence:"very_low",candidates:[]};
    let hits=candidates.filter(p => sameName(name,p.name ?? p.fullName));
    const birth=source?.birthDate;
    if (birth) hits=hits.filter(p => !p.birthDate || String(p.birthDate).slice(0,10)===String(birth).slice(0,10));
    const pos=source?.positionCode ?? source?.position;
    if (pos) {
      const samePos=hits.filter(p => !p.positionCode && !p.position || clean(p.positionCode ?? p.position)===clean(pos));
      if (samePos.length) hits=samePos;
    }
    if (hits.length===1) return {status:"matched",playerId:String(hits[0].id ?? hits[0].playerId),method:"normalized_name"+(birth?"+birthDate":""),confidence:birth?"high":"medium",candidates:[]};
    return {status:hits.length?"ambiguous":"unmatched",method:"normalized_name",confidence:hits.length?"low":"very_low",candidates:hits.map(p=>String(p.id ?? p.playerId))};
  }
  function reconcileObservations(observations) {
    const groups=new Map();
    for (const item of (Array.isArray(observations)?observations:[])) {
      if (!item?.playerId || !item?.attribute) continue;
      const key=String(item.playerId)+"::"+String(item.attribute).toUpperCase();
      if (!groups.has(key)) groups.set(key,[]);
      groups.get(key).push(item);
    }
    return [...groups.entries()].map(([key,items]) => {
      const values=[...new Set(items.filter(x=>x.normalizedHdValue!==null && x.normalizedHdValue!==undefined).map(x=>Number(x.normalizedHdValue)))];
      return {key,observations:items, status:values.length>1?"conflicting":values.length===1?"comparable":"not_available",suggestedValue:values.length===1?values[0]:null};
    });
  }
  const api={normalizeName:clean,matchPlayer,reconcileObservations};
  if(typeof module!=="undefined" && module.exports) module.exports=api;
  root.HDPlayerSourceMatching=api;
})(typeof globalThis!=="undefined"?globalThis:this);
