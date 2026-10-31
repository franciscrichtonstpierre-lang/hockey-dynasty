// Build the canonical cross-league player registry from source snapshots.
// Source-labelled ratings are imported when IDs match; rights, potential and contracts are never inferred.
import { readFile, writeFile } from "node:fs/promises";

const codes = ["ANA","BOS","BUF","CGY","CAR","CHI","COL","CBJ","DAL","DET","EDM","FLA","LAK","MIN","MTL","NSH","NJD","NYI","NYR","OTT","PHI","PIT","SJS","SEA","STL","TBL","TOR","UTA","VAN","VGK","WSH","WPG"];
const affiliations = JSON.parse(await readFile("data/ahl/teams.json", "utf8")).teams || [];
const ahlByCode = new Map(affiliations.map(t => [t.nhlCode, t.ahlName]));
const ratingData = JSON.parse(await readFile("data/ratings.json", "utf8"));
const ratingMap = ratingData.players || {};
const ratingSeason = String(ratingData.season || "").replace(/^(\d{4})(\d{4})$/, "$1-$2");
const records = new Map();
const now = new Date().toISOString();
const scalar = v => v == null || ["string","number","boolean"].includes(typeof v) ? v : null;
const str = v => { const x = scalar(v); return x == null || x === "" ? null : String(x); };
const first = (...values) => values.find(v => scalar(v) != null && String(v).trim() !== "");
const posGroup = p => {
  const raw = String(first(p.positionCode, p.position, p.positionGroup, p.position_name, "")).toUpperCase();
  const parts = raw.split(/[\\/,]/).map(x => x.trim()).filter(Boolean);
  if (parts.some(x => ["G","GOALIE","GOALTENDER"].includes(x))) return "G";
  if (parts.some(x => ["D","DEFENSE","DEFENCEMAN","DEFENSEMAN"].includes(x))) return "D";
  if (parts.some(x => ["F","C","L","R","LW","RW","W","FORWARD","CENTRE","CENTER"].includes(x))) return "F";
  return null;
};
const detailedPos = p => {
  const raw = String(first(p.positionCode, p.position, p.position_name, "")).toUpperCase();
  const p0 = raw.split(/[\\/,]/).map(x => x.trim()).find(Boolean) || raw;
  return ({ C:"C", L:"L", LW:"L", R:"R", RW:"R", D:"D", G:"G", W:"R" })[p0] || null;
};
const nameOf = p => {
  const full = first(p.fullName, p.full_name, p.name, p.displayName, p.display_name);
  if (full) return String(full).trim();
  return [first(p.firstName?.default, p.firstName, p.first_name), first(p.lastName?.default, p.lastName, p.last_name)].filter(Boolean).join(" ").trim();
};
const nameKey = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
const add = p => {
  if (!p.id || !p.name) return;
  const rating = p.nhlPlayerId != null ? ratingMap[String(p.nhlPlayerId)] : null;
  if (rating) {
    p.attributes = p.attributes || rating;
    p.overall = p.overall ?? rating.OA ?? null;
    p.ratingSeason = ratingSeason || null;
    p.ratingSource = ratingData.source || null;
    p.ratingStatus = "sample_adjusted_estimate";
  }
  if (!records.has(p.id)) records.set(p.id, p);
  else {
    const old = records.get(p.id);
    // Prefer the current roster record over a prospect-list record, while retaining known bio fields.
    const incoming = Object.fromEntries(Object.entries(p).filter(([,v]) => v != null && v !== ""));
    const preserveRoster = ["NHL","AHL"].includes(old.currentLeague) && !["NHL","AHL"].includes(p.currentLeague);
    records.set(p.id, {
      ...old, ...incoming,
      ...(preserveRoster ? { currentLeague: old.currentLeague, currentTeam: old.currentTeam, nhlRightsTeam: old.nhlRightsTeam || p.nhlRightsTeam, position: old.position, detailedPosition: old.detailedPosition } : {}),
      attributes: old.attributes || p.attributes
    });
  }
};

// Current NHL roster: team membership and NHL player ID are source-backed.
for (const code of codes) {
  try {
    const data = JSON.parse(await readFile(`data/nhl/${code}.json`, "utf8"));
    for (const [group, players] of [["forwards",data.forwards||[]],["defensemen",data.defensemen||[]],["goalies",data.goalies||[]]]) {
      for (const p of players) {
        const id = first(p.id, p.playerId);
        const name = nameOf(p);
        if (!id || !name) continue;
        add({
          id: `nhl:${id}`, name, firstName: str(p.firstName?.default || p.firstName), lastName: str(p.lastName?.default || p.lastName),
          position: group === "goalies" ? "G" : group === "defensemen" ? "D" : "F",
          detailedPosition: detailedPos(p), currentLeague: "NHL", currentTeam: code, nhlRightsTeam: code,
          birthDate: str(p.birthDate), nationality: str(p.birthCountry), shootsCatches: str(p.shootsCatches),
          heightCm: Number.isFinite(Number(p.heightInCentimeters)) ? Number(p.heightInCentimeters) : null,
          weightKg: Number.isFinite(Number(p.weightInKilograms)) ? Number(p.weightInKilograms) : null,
          sweaterNumber: Number.isFinite(Number(p.sweaterNumber)) ? Number(p.sweaterNumber) : null,
          nhlPlayerId: Number(id), attributes: null, overall: null, potential: null,
          source: data._sourceUrl || `https://api-web.nhle.com/v1/roster/${code}/20262027`,
          sourceUpdatedAt: data._syncedAt || now
        });
      }
    }
  } catch (e) { console.warn(`NHL registry skipped ${code}: ${e.message}`); }
}

// AHL roster IDs are HockeyTech IDs; affiliate is the playing team, not proof of NHL rights.
for (const code of codes) {
  try {
    const data = JSON.parse(await readFile(`data/ahl/${code}.json`, "utf8"));
    for (const p of (Array.isArray(data.players) ? data.players : [])) {
      const sourceId = first(p.player_id, p.playerId, p.person_id, p.id);
      const name = nameOf(p);
      if (!sourceId || !name) continue;
      add({
        id: `ahl:${sourceId}`, name, firstName: str(first(p.first_name,p.firstName)),
        lastName: str(first(p.last_name,p.lastName)), position: posGroup(p), detailedPosition: detailedPos(p),
        currentLeague: "AHL", currentTeam: data.ahlName || ahlByCode.get(code) || null, nhlRightsTeam: null,
        birthDate: str(first(p.birthdate,p.birthDate)), shootsCatches: str(first(p.shoots,p.catches,p.shootsCatches)),
        sweaterNumber: Number.isFinite(Number(first(p.tp_jersey_number,p.jersey_number,p.sweater_number))) ? Number(first(p.tp_jersey_number,p.jersey_number,p.sweater_number)) : null,
        nhlPlayerId: Number.isFinite(Number(first(p.nhl_player_id,p.nhlPlayerId))) ? Number(first(p.nhl_player_id,p.nhlPlayerId)) : null,
        attributes: null, overall: null, potential: null, source: data.sourceUrl || "AHL HockeyTech public feed",
        sourceUpdatedAt: data.syncedAt || now
      });
    }
  } catch (e) { console.warn(`AHL registry skipped ${code}: ${e.message}`); }
}

// Public prospect lists can describe the development team, but do not prove rights or contract status.
for (const code of codes) {
  try {
    const data = JSON.parse(await readFile(`data/prospects/${code}.json`, "utf8"));
    const list = Array.isArray(data) ? data : (data.prospects || data.players || data.data || []);
    for (const p of (Array.isArray(list) ? list : [])) {
      const sourceId = first(p.id, p.playerId, p.player_id, p.nhlPlayerId);
      const name = nameOf(p);
      if (!name) continue;
      const matchingRecords = [...records.values()].filter(r => nameKey(r.name) === nameKey(name));
      const prospectBirthDate = str(first(p.birthDate,p.birthdate));
      const prospectPosition = posGroup(p);
      const identityMatches = matchingRecords.filter(r =>
        prospectBirthDate && r.birthDate && prospectBirthDate === r.birthDate &&
        (!prospectPosition || !r.position || prospectPosition === r.position)
      );
      // If name + birth date + compatible position match a single roster entry,
      // reuse that stable roster ID even when the prospect endpoint has another ID shape.
      const id = identityMatches.length === 1 ? identityMatches[0].id :
        sourceId ? `nhl:${sourceId}` :
        matchingRecords.length === 1 ? matchingRecords[0].id :
        `prospect:${code}:${nameKey(name).replace(/ /g,"-")}`;
      const leagueRaw = String(first(p.currentLeague,p.league,p.leagueName,p.currentLeagueName,"")).toLowerCase();
      const currentLeague = /\bnhl\b/.test(leagueRaw) ? "NHL" :
        /ahl|american hockey/.test(leagueRaw) ? "AHL" :
        /ncaa|college/.test(leagueRaw) ? "NCAA" :
        /echl/.test(leagueRaw) ? "OTHER" :
        /ohl|whl|qmjhl|chl|junior/.test(leagueRaw) ? "CHL" :
        /shl|khl|liiga|europe|sweden|finland|swiss|czech|russia|germany|slovakia|latvia|mhl|allsvenskan|nationell|mestis/.test(leagueRaw) ? "EUROPE" : "UNKNOWN";
      add({
        id, name, firstName: str(p.firstName?.default || p.firstName || p.first_name),
        lastName: str(p.lastName?.default || p.lastName || p.last_name), position: posGroup(p), detailedPosition: detailedPos(p),
        currentLeague, currentTeam: str(first(p.currentTeam,p.teamName,p.team_name,p.currentTeamName)),
        nhlRightsTeam: str(first(p.nhlRightsTeam,p.rightsTeam,p.rights_team)),
        rightsStatus: str(p.rightsStatus),
        birthDate: str(first(p.birthDate,p.birthdate)), shootsCatches: str(first(p.shootsCatches,p.shoots,p.catches)),
        age: Number.isFinite(Number(p.age)) ? Number(p.age) : null,
        draftYear: p.draftYear != null && Number.isFinite(Number(p.draftYear)) ? Number(p.draftYear) : null,
        draftRound: p.draftRound != null && Number.isFinite(Number(p.draftRound)) ? Number(p.draftRound) : null,
        draftOverall: p.draftOverall != null && Number.isFinite(Number(p.draftOverall)) ? Number(p.draftOverall) : null,
        nhlPlayerId: sourceId != null && Number.isFinite(Number(sourceId)) ? Number(sourceId) : null,
        attributes: null, overall: null, potential: null, source: p.source || data.source || `https://api-web.nhle.com/v1/prospects/${code}`,
        sourceUpdatedAt: p.sourceUpdatedAt || data.syncedUTC || now
      });
    }
  } catch (e) { console.warn(`Prospect registry skipped ${code}: ${e.message}`); }
}

// Enrich NHL API prospect records with the separately maintained organization snapshots.
// These snapshots provide league/team context absent from the NHL prospects endpoint; they do not override NHL/AHL roster membership.
let supplementalMatched = 0, supplementalAdded = 0, supplementalAmbiguous = 0;
try {
  const supplementalData = JSON.parse(await readFile("data/prospects-supplemental/2026-2027.json", "utf8"));
  const teamPipelineSlugs = {
    ANA:"anaheim-ducks",BOS:"boston-bruins",BUF:"buffalo-sabres",CGY:"calgary-flames",
    CAR:"carolina-hurricanes",CHI:"chicago-blackhawks",COL:"colorado-avalanche",CBJ:"columbus-blue-jackets",
    DAL:"dallas-stars",DET:"detroit-red-wings",EDM:"edmonton-oilers",FLA:"florida-panthers",
    LAK:"los-angeles-kings",MIN:"minnesota-wild",MTL:"montreal-canadiens",NSH:"nashville-predators",
    NJD:"new-jersey-devils",NYI:"new-york-islanders",NYR:"new-york-rangers",OTT:"ottawa-senators",
    PHI:"philadelphia-flyers",PIT:"pittsburgh-penguins",SJS:"san-jose-sharks",SEA:"seattle-kraken",
    STL:"st-louis-blues",TBL:"tampa-bay-lightning",TOR:"toronto-maple-leafs",UTA:"utah-mammoth",
    VAN:"vancouver-canucks",VGK:"vegas-golden-knights",WSH:"washington-capitals",WPG:"winnipeg-jets"
  };
  const teamSnapshots = new Map(Object.entries(supplementalData.teams || {}).map(([code, data]) => [
    code, {...data, prospects:[...(Array.isArray(data.prospects)?data.prospects:[])]}
  ]));
  const cleanCell = value => String(value || "")
    .replace(/<br\s*\/?>/gi," ").replace(/<[^>]*>/g," ")
    .replace(/&nbsp;|&#160;/gi," ").replace(/&amp;/gi,"&").replace(/&harr;|&#8596;|&#x2194;/gi,"↔").replace(/&quot;/gi,'"')
    .replace(/&#39;|&apos;/gi,"'").replace(/&#x([0-9a-f]+);/gi,(_,h)=>String.fromCodePoint(parseInt(h,16)))
    .replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n))).replace(/\s+/g," ").trim();
  let pipelinePagesFetched = 0, pipelineRowsFetched = 0;
  const pipelineResults = await Promise.all(Object.entries(teamPipelineSlugs).map(async ([teamCode, slug]) => {
    const url = `https://hockeyinsights.ca/team-pipeline/${slug}/`;
    try {
      const response = await fetch(url, {
        headers: {"user-agent":"Hockey-Dynasty-data-sync/1.0","accept":"text/html"},
        signal: AbortSignal.timeout(12000)
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const html = await response.text();
      const rows = [];
      const draftPicks = [];
      for (const rowMatch of html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
        const cells = [...rowMatch[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(m=>cleanCell(m[1]));
        if (cells.length < 5 || /^player$/i.test(cells[0])) continue;
        const name = cells[0], positionCode = cells[1], age = Number(cells[2]), draft = cells[3], leagueName = cells[4];
        if (!name || !leagueName || !/^[A-Za-zÀ-ÿ .'-]+$/.test(name) || !Number.isFinite(age) || age < 15 || age > 45) continue;
        const yearMatch = draft.match(/\b(19|20)\d{2}\b/);
        const roundMatch = draft.match(/round\s*(\d+)/i);
        const overallMatch = draft.match(/#(\d+)/);
        rows.push({
          fullName:name, positionCode, age, currentLeague:leagueName, currentTeam:null, nhlRightsTeam:teamCode,
          draftYear:yearMatch?Number(yearMatch[0]):null, draftRound:roundMatch?Number(roundMatch[1]):null,
          draftOverall:overallMatch?Number(overallMatch[1]):null, rightsStatus:"secondary_snapshot_recheck_required",
          source:url, sourceUpdatedAt:"2026-09-28", verificationStatus:"secondary_snapshot_recheck_required"
        });
      }
      // Parse the year/round draft-capital grid on the same team page.
      for (const tableMatch of html.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/gi)) {
        const tableRows = [...tableMatch[1].matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)];
        let headerIndex=-1, yearIndex=-1, roundIndexes={};
        for (let hi=0; hi<Math.min(tableRows.length,4); hi++) {
          const headerCells=[...tableRows[hi][1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)];
          const labels=headerCells.map(m=>cleanCell(m[1]).toLowerCase());
          const yi=labels.findIndex(v=>v==="year");
          const indexes={};
          for (let round=1;round<=7;round++) indexes[round]=labels.findIndex(v=>v===("r"+round));
          if(yi>=0&&Object.values(indexes).every(v=>v>=0)){headerIndex=hi;yearIndex=yi;roundIndexes=indexes;break;}
        }
        if(headerIndex<0) continue;
        for(const rowMatch of tableRows.slice(headerIndex+1)){
          const cells=[...rowMatch[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)];
          const year=Number(cleanCell(cells[yearIndex]?.[1]||""));
          if(![2027,2028,2029].includes(year))continue;
          for(let round=1;round<=7;round++){
            const cellText=cleanCell(cells[roundIndexes[round]]?.[1]||"");
            for(const chip of cellText.matchAll(/(?:^|\s)R([1-7])\s*(\?)?(?:\s*↔\s*([A-Z]{3}))?/g)){
              if(Number(chip[1])!==round)continue;
              const originalOwner=chip[3]||teamCode;
              if(!teamPipelineSlugs[originalOwner])continue;
              const conditional=Boolean(chip[2]);
              draftPicks.push({
                year,round,originalOwner,currentOwner:conditional?originalOwner:teamCode,conditional,
                source:url,snapshotDate:"2026-09-28",sourceType:"Hockey Insights Team Pipeline / PuckPedia snapshot",
                verificationNote:conditional
                  ?"Transfert conditionnel ignoré selon la règle du projet; propriétaire provisoire conservé à l'équipe d'origine."
                  :"Propriétaire issu du snapshot secondaire du 2026-09-28; confirmation officielle requise."
              });
            }
          }
        }
      }
      return {teamCode,url,rows,draftPicks,error:null,debugHtml:teamCode==="ANA"?html:null};
    } catch(error) {
      return {teamCode,url,rows:[],error:error.message};
    }
  }));
  for (const result of pipelineResults) {
    if (!result.rows.length) continue;
    pipelinePagesFetched++;
    pipelineRowsFetched += result.rows.length;
    const existing = teamSnapshots.get(result.teamCode) || {source:result.url,snapshotDate:"2026-09-28",prospects:[]};
    existing.source = existing.source || result.url;
    existing.snapshotDate = existing.snapshotDate || "2026-09-28";
    const byName = new Map(existing.prospects.map(p=>[nameKey(nameOf(p)),p]).filter(([key])=>key));
    for (const row of result.rows) {
      const key = nameKey(row.fullName);
      const previous = byName.get(key);
      if (previous) {
        if (!previous.currentLeague || String(previous.currentLeague).toUpperCase()==="UNKNOWN") previous.currentLeague=row.currentLeague;
        if (!previous.positionCode) previous.positionCode=row.positionCode;
        if (!previous.age) previous.age=row.age;
        if (!previous.draftYear && row.draftYear) previous.draftYear=row.draftYear;
        if (!previous.draftRound && row.draftRound) previous.draftRound=row.draftRound;
        if (!previous.draftOverall && row.draftOverall) previous.draftOverall=row.draftOverall;
        if (!previous.source) previous.source=row.source;
        if (!previous.sourceUpdatedAt) previous.sourceUpdatedAt=row.sourceUpdatedAt;
        if (!previous.verificationStatus) previous.verificationStatus=row.verificationStatus;
      } else {
        existing.prospects.push(row);
        byName.set(key,row);
      }
    }
    teamSnapshots.set(result.teamCode,existing);
  }
  console.log(`Hockey Insights prospect snapshots: ${pipelinePagesFetched}/32 pages with rows; ${pipelineRowsFetched} rows parsed.`);
  let pipelineMarkdown="";
  try{
    const mdResponse=await fetch("https://hockeyinsights.ca/content/team-pipeline.md",{
      headers:{"user-agent":"Hockey-Dynasty-data-sync/1.0","accept":"text/markdown"},
      signal:AbortSignal.timeout(15000)
    });
    if(mdResponse.ok)pipelineMarkdown=await mdResponse.text();
    else console.warn(`Team pipeline markdown fetch returned HTTP ${mdResponse.status}.`);
  }catch(error){console.warn(`Team pipeline markdown unavailable: ${error.message}`);}
  const markdownDraftHits=[...pipelineMarkdown.matchAll(/2027|2028|2029|draft capital|future picks/gi)].slice(0,24)
    .map(m=>pipelineMarkdown.slice(Math.max(0,m.index-100),Math.min(pipelineMarkdown.length,m.index+240)));
  console.log("Team pipeline markdown diagnostics: "+JSON.stringify({length:pipelineMarkdown.length,draftHits:markdownDraftHits}));

  const anaDebugHtml=pipelineResults.find(r=>r.teamCode==="ANA")?.debugHtml||"";
  const draftTerms=["draft capital","future draft","puckpedia","pick-chip","draft-picks","draftPicks","futurePicks","2027 picks","R1"];
  const termHits=draftTerms.map(term=>{const index=anaDebugHtml.toLowerCase().indexOf(term.toLowerCase());return {term,index,snippet:index>=0?anaDebugHtml.slice(Math.max(0,index-180),Math.min(anaDebugHtml.length,index+420)):null};});
  const scriptSources=[...anaDebugHtml.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)].map(m=>m[1]);
  const dataRefs=[...anaDebugHtml.matchAll(/(?:src|href)=["']([^"']+\.(?:json|js|md)(?:\?[^"']*)?)["']/gi)].map(m=>m[1]).slice(0,30);
  const scriptDiagnostics=await Promise.all(scriptSources.filter(src=>src.startsWith("/")||src.includes("hockeyinsights.ca")).slice(0,8).map(async src=>{
    const scriptUrl=new URL(src,"https://hockeyinsights.ca/team-pipeline/anaheim-ducks/").toString();
    try{
      const response=await fetch(scriptUrl,{headers:{"user-agent":"Hockey-Dynasty-data-sync/1.0"},signal:AbortSignal.timeout(10000)});
      const body=await response.text();
      const refs=[...body.matchAll(/["'`]([^"'`]{0,180}(?:\.json|picks|draft|capital|pipeline)[^"'`]{0,180})["'`]/gi)].slice(0,30).map(m=>m[1]);
      const hits=[...body.matchAll(/2027|2028|2029|draft|pick|\.json|fetch\(/gi)].slice(0,30).map(m=>({term:m[0],index:m.index,snippet:body.slice(Math.max(0,m.index-90),Math.min(body.length,m.index+220))}));
      return {src,status:response.status,length:body.length,refs,hits};
    }catch(error){return {src,error:error.message};}
  }));
  console.log("Draft HTML diagnostics ANA: "+JSON.stringify({htmlLength:anaDebugHtml.length,tableCount:[...anaDebugHtml.matchAll(/<table\\b/gi)].length,scriptSources,dataRefs,termHits,scriptDiagnostics}));
  try{
    const hubUrl="https://hockeyinsights.ca/data/team-pipeline.json";
    const hubResponse=await fetch(hubUrl,{headers:{"user-agent":"Hockey-Dynasty-data-sync/1.0","accept":"application/json"},signal:AbortSignal.timeout(10000)});
    const hubText=await hubResponse.text();
    let hubJson=null;try{hubJson=JSON.parse(hubText)}catch{}
    const hubKeys=hubJson&&typeof hubJson==="object"?Object.keys(hubJson):[];
    const interestingHubFields=hubKeys.filter(k=>/pick|draft|right|snapshot|owner|asset/i.test(k)).map(k=>({key:k,value:JSON.stringify(hubJson[k]).slice(0,1200)}));
    console.log("Team hub JSON diagnostics ANA: "+JSON.stringify({url:hubUrl,status:hubResponse.status,length:hubText.length,keys:hubKeys,interestingHubFields,preview:hubJson?null:hubText.slice(0,500)}));
  }catch(error){console.log("Team hub JSON diagnostics ANA: "+JSON.stringify({error:error.message}));}

  const draftPickMap = new Map();
  let draftPickConflicts = 0;
  for (const result of pipelineResults) {
    for (const pick of (result.draftPicks||[])) {
      const key=`${pick.year}-${pick.round}-${pick.originalOwner}`;
      const previous=draftPickMap.get(key);
      if(!previous){draftPickMap.set(key,pick);continue;}
      if(previous.conditional&&!pick.conditional){draftPickMap.set(key,pick);continue;}
      if(!previous.conditional&&pick.conditional)continue;
      if(previous.currentOwner!==pick.currentOwner){
        draftPickMap.set(key,{...previous,currentOwner:null,conflict:true,verificationNote:"Conflit entre les pages de filière pour ce choix; validation manuelle requise."});
        draftPickConflicts++;
      }
    }
  }
  const draftSnapshotPath="data/draft-picks/hockey-insights-2027-2029.json";
  const draftSnapshot={
    schemaVersion:1,source:"Hockey Insights Team Pipeline / PuckPedia context",snapshotDate:"2026-09-28",
    pagesFetched:pipelineResults.filter(r=>(r.draftPicks||[]).length>0).length,totalPages:32,
    picks:[...draftPickMap.values()].sort((a,b)=>a.year-b.year||a.round-b.round||a.originalOwner.localeCompare(b.originalOwner)),
    notes:[
      "Secondary snapshot date: 2026-09-28; it may not include later trades.",
      "Conditional transfers are not applied; where the only listing is conditional, the original team is retained as a provisional game fallback.",
      "Official NHL Future Draft Picks rows take precedence over this snapshot."
    ]
  };
  const serializedDraftSnapshot=JSON.stringify(draftSnapshot,null,2)+"\n";
  const previousDraftSnapshot=await readFile(draftSnapshotPath,"utf8").catch(()=>null);
  if(draftPickMap.size>0&&previousDraftSnapshot!==serializedDraftSnapshot){
    await writeFile(draftSnapshotPath,serializedDraftSnapshot,"utf8");
    console.log(`Saved secondary draft-pick snapshot: ${draftPickMap.size} unique picks; ${draftSnapshot.pagesFetched}/32 pages; ${draftPickConflicts} conflicts.`);
  } else {
    console.log(`Secondary draft-pick snapshot: ${draftPickMap.size} unique picks; ${draftSnapshot.pagesFetched}/32 pages; ${draftPickConflicts} conflicts.`);
  }

  const snapshotNote = "League and development-team context supplemented from Hockey Insights Team Pipeline (2026-09-28 snapshot); secondary data that must be rechecked against current transactions.";
  if (!Array.isArray(supplementalData.dataNotes)) supplementalData.dataNotes=[];
  if (!supplementalData.dataNotes.includes(snapshotNote)) supplementalData.dataNotes.push(snapshotNote);
  supplementalData.teams = Object.fromEntries(teamSnapshots.entries());
  const supplementalPath = "data/prospects-supplemental/2026-2027.json";
  const serializedSupplemental = JSON.stringify(supplementalData,null,2)+"\n";
  const previousSupplemental = await readFile(supplementalPath,"utf8").catch(()=>null);
  if (pipelinePagesFetched>0 && previousSupplemental!==serializedSupplemental) {
    await writeFile(supplementalPath,serializedSupplemental,"utf8");
    console.log("Saved refreshed 32-team prospect league snapshots for the next roster sync.");
  }
  for (const [teamCode, teamData] of teamSnapshots.entries()) {
    for (const p of (Array.isArray(teamData.prospects) ? teamData.prospects : [])) {
      const name = nameOf(p);
      if (!name) continue;
      const key = nameKey(name);
      const candidates = [...records.values()].filter(r => nameKey(r.name) === key);
      const sameRights = candidates.filter(r => r.nhlRightsTeam === teamCode);
      const match = sameRights.length === 1 ? sameRights[0] : candidates.length === 1 ? candidates[0] : null;
      const rawLeague = String(first(p.currentLeague, p.league, p.leagueName, "")).toLowerCase();
      const league = /\bnhl\b/.test(rawLeague) ? "NHL" :
        /\bahl\b|american hockey/.test(rawLeague) ? "AHL" :
        /ncaa|college/.test(rawLeague) ? "NCAA" :
        /echl|ushl|bchl|ajhl|nahl/.test(rawLeague) ? "OTHER" :
        /ohl|whl|qmjhl|\bchl\b|junior/.test(rawLeague) ? "CHL" :
        /shl|khl|vhl|liiga|europe|sweden|finland|swiss|switzerland|czech|russia|germany|slovakia|latvia|norway|denmark|france|austria|icehl|del|mhl|allsvenskan|nationell|mestis|j20|\bnl\b|\bsl\b/.test(rawLeague) ? "EUROPE" : "UNKNOWN";
      const incoming = {
        currentLeague: league,
        currentTeam: str(p.currentTeam),
        nhlRightsTeam: str(first(p.nhlRightsTeam, p.rightsTeam, p.rights_team, teamCode)),
        rightsStatus: str(p.rightsStatus),
        age: Number.isFinite(Number(p.age)) ? Number(p.age) : null,
        draftYear: p.draftYear != null && Number.isFinite(Number(p.draftYear)) ? Number(p.draftYear) : null,
        draftRound: p.draftRound != null && Number.isFinite(Number(p.draftRound)) ? Number(p.draftRound) : null,
        draftOverall: p.draftOverall != null && Number.isFinite(Number(p.draftOverall)) ? Number(p.draftOverall) : null,
        supplementalVerificationStatus: str(p.verificationStatus),
        supplementalSnapshotDate: str(p.sourceUpdatedAt || teamData.snapshotDate),
        supplementalSource: str(p.source || teamData.source || supplementalData.sourceName)
      };
      if (match) {
        // Roster membership is stronger evidence than an older organization snapshot.
        if (!["NHL", "AHL"].includes(match.currentLeague) && league !== "UNKNOWN") {
          match.currentLeague = league;
          match.leagueResolution = "supplemental_secondary_snapshot";
        }
        for (const [field, value] of Object.entries(incoming)) {
          if (value == null || value === "") continue;
          if (match[field] == null || match[field] === "" || field === "nhlRightsTeam" && !match[field]) match[field] = value;
        }
        if (!match.position) match.position = posGroup(p);
        if (!match.detailedPosition) match.detailedPosition = detailedPos(p);
        if (!match.source && incoming.supplementalSource) match.source = incoming.supplementalSource;
        supplementalMatched++;
      } else if (candidates.length > 1) {
        supplementalAmbiguous++;
      } else {
        const id = `supplemental:${teamCode}:${key.replace(/ /g,"-")}`;
        add({
          id, name, firstName: str(p.firstName?.default || p.firstName || p.first_name),
          lastName: str(p.lastName?.default || p.lastName || p.last_name),
          position: posGroup(p), detailedPosition: detailedPos(p),
          currentLeague: league, currentTeam: incoming.currentTeam, nhlRightsTeam: incoming.nhlRightsTeam,
          rightsStatus: incoming.rightsStatus, birthDate: str(first(p.birthDate,p.birthdate)),
          age: incoming.age, draftYear: incoming.draftYear, draftRound: incoming.draftRound, draftOverall: incoming.draftOverall,
          attributes: null, overall: null, potential: null, source: incoming.supplementalSource,
          sourceUpdatedAt: incoming.supplementalSnapshotDate,
          supplementalVerificationStatus: incoming.supplementalVerificationStatus,
          supplementalSnapshotDate: incoming.supplementalSnapshotDate,
          supplementalSource: incoming.supplementalSource
        });
        supplementalAdded++;
      }
    }
  }
} catch (error) {
  console.warn(`Supplemental prospect data skipped: ${error.message}`);
}
console.log(`Supplemental prospects: ${supplementalMatched} matched/enriched; ${supplementalAdded} added; ${supplementalAmbiguous} ambiguous matches left unchanged.`);

// Import cross-team, undrafted players eligible for the next three NHL drafts.
// Draft eligibility and source rank are kept separate from NHL rights; undrafted players have no rights owner.
let futureDraftProspectsAdded=0, futureDraftProspectsMatched=0;
try {
  const futureDraftData=JSON.parse(await readFile("data/future-draft-prospects/2027-2029.json","utf8"));
  for(const p of (futureDraftData.prospects||[])){
    if(!p.name||![2027,2028,2029].includes(Number(p.draftYear)))continue;
    const key=nameKey(p.name);
    const candidates=[...records.values()].filter(r=>nameKey(r.name)===key);
    const matching=candidates.length===1?candidates[0]:null;
    if(matching){
      matching.futureDraftEligibility=Number(p.draftYear);
      matching.futureDraftSourceRank=p.sourceRank??null;
      matching.futureDraftSource=p.source||futureDraftData.source||null;
      matching.futureDraftRankType=p.rankType||null;
      // A player who already has a verified NHL rights holder remains tied to that club.
      if(!matching.nhlRightsTeam && p.rightsTeam)matching.nhlRightsTeam=p.rightsTeam;
      futureDraftProspectsMatched++;
      continue;
    }
    const id=p.prospectId||`nhl-draft:${p.draftYear}:${key.replace(/ /g,"-")}`;
    add({
      id,name:p.name,position:posGroup({positionCode:p.position}),detailedPosition:detailedPos({positionCode:p.position}),
      currentLeague:p.currentLeague||"UNKNOWN",currentTeam:str(p.currentTeam),nhlRightsTeam:str(p.rightsTeam),
      rightsStatus:p.nhlRightsStatus||"undrafted_unassigned",birthDate:null,age:null,
      draftYear:Number(p.draftYear),futureDraftEligibility:Number(p.draftYear),
      futureDraftSourceRank:p.sourceRank??null,futureDraftRankType:p.rankType||null,
      attributes:null,overall:null,potential:null,source:p.source||futureDraftData.source||null,
      sourceUpdatedAt:p.sourceUpdatedAt||futureDraftData.lastSyncAt||now
    });
    futureDraftProspectsAdded++;
  }
  console.log(`Future draft prospect registry: ${futureDraftProspectsAdded} new records; ${futureDraftProspectsMatched} existing records linked to draft eligibility.`);
}catch(error){
  console.warn(`Future draft prospect registry skipped: ${error.message}`);
}

// Collapse same-person records that appear in both NHL and AHL snapshots.
const samePerson = new Map();
for (const p of records.values()) {
  if (!p.name || !p.birthDate) continue;
  const key = `${nameKey(p.name)}|${p.birthDate}`;
  if (!samePerson.has(key)) samePerson.set(key, []);
  samePerson.get(key).push(p);
}
let identityDuplicatesMerged = 0;
for (const group of samePerson.values()) {
  if (group.length < 2) continue;
  const priority = p => p.currentLeague === "NHL" ? 3 : p.currentLeague === "AHL" ? 2 : 1;
  group.sort((a,b) => priority(b)-priority(a) || Number(!!b.nhlPlayerId)-Number(!!a.nhlPlayerId));
  const primary = group[0];
  primary.otherObservedTeams = [...new Set([...(primary.otherObservedTeams||[]), ...group.slice(1).map(p=>p.currentTeam).filter(Boolean)])];
  for (const duplicate of group.slice(1)) {
    for (const [key,value] of Object.entries(duplicate)) {
      if (primary[key] == null && value != null && !["id","currentLeague","currentTeam","nhlRightsTeam","source","attributes","overall","potential"].includes(key)) primary[key] = value;
    }
    records.delete(duplicate.id);
    identityDuplicatesMerged++;
  }
}
console.log(`Merged ${identityDuplicatesMerged} duplicate identity records using NHL > AHL roster priority.`);

// Enrich unknown league only from a unique, same-name roster record.
const byName = new Map();
for (const p of records.values()) {
  const key = nameKey(p.name);
  if (!byName.has(key)) byName.set(key, []);
  byName.get(key).push(p);
}
let leagueEnriched = 0;
for (const p of records.values()) {
  if (p.currentLeague !== "UNKNOWN") continue;
  const matches = (byName.get(nameKey(p.name)) || []).filter(q =>
    q.id !== p.id && q.currentLeague && q.currentLeague !== "UNKNOWN" && q.currentLeague !== "OTHER"
  );
  const leagues = new Set(matches.map(q => q.currentLeague));
  if (leagues.size !== 1 || matches.length === 0) continue;
  const league = [...leagues][0];
  const sameLeague = matches.filter(q => q.currentLeague === league);
  const teams = new Set(sameLeague.map(q => q.currentTeam).filter(Boolean));
  if (teams.size > 1) continue;
  p.currentLeague = league;
  if (!p.currentTeam && teams.size === 1) p.currentTeam = [...teams][0];
  p.leagueResolution = "matched_unique_name_to_roster_source";
  leagueEnriched++;
}
console.log(`Registry league enrichment: ${leagueEnriched} UNKNOWN entries resolved via unique roster-name match.`);

// Keep every roster/prospect record usable by the game: if no statistical
// rating exists, use the same explicitly provisional age/position fallback
// already shown by the interface. This is not presented as a scouting grade.
const ratingFields = ["FI","SH","PL","ST","CH","PO","HI","SK","EN","PE","FA","LE","SR","OFF","DEF","OA"];
let provisionalRatings = 0;
for (const p of records.values()) {
  const existing = p.attributes && typeof p.attributes === "object" ? p.attributes : {};
  const complete = ratingFields.every(k => existing[k] != null && Number.isFinite(Number(existing[k])) && Number(existing[k]) >= 0 && Number(existing[k]) <= 99);
  if (complete && p.overall != null) continue;
  let age = 0;
  if (p.birthDate) {
    const birth = new Date(p.birthDate + "T00:00:00Z");
    if (Number.isFinite(birth.getTime())) age = 2026 - birth.getUTCFullYear();
  }
  const pos = p.position === "G" ? "G" : p.position === "D" ? "D" : (p.detailedPosition || "F");
  const base = pos === "G" ? 57 : age && age < 22 ? 53 : age && age < 25 ? 57 : age && age < 29 ? 60 : 58;
  const fallback = {FI:base,SH:base,PL:base,ST:base,CH:base,PO:base,HI:base,SK:base,EN:base,PE:base,FA:base,LE:base,SR:base,OFF:base,DEF:base,OA:base};
  if (pos === "D") Object.assign(fallback,{SH:base-5,PL:base-2,ST:base+3,CH:base+3,HI:base+4,DEF:base+3,OFF:base-3});
  if (pos === "G") Object.assign(fallback,{SH:25,PL:25,SK:base-4,PO:base+5,OFF:25,DEF:base+2});
  if (p.detailedPosition === "C") fallback.FA = base+5;
  fallback.OA = Math.round((fallback.OFF+fallback.DEF)/2);
  p.attributes = Object.fromEntries(ratingFields.map(k => [k, existing[k] != null && Number.isFinite(Number(existing[k])) ? Math.max(0,Math.min(99,Math.round(Number(existing[k])))) : fallback[k]]));
  if (p.overall == null || !Number.isFinite(Number(p.overall))) p.overall = p.attributes.OA;
  if (!complete) {
    p.ratingStatus = p.ratingStatus || "provisional_age_position_fallback";
    p.ratingSource = p.ratingSource || "Hockey Dynasty fallback model (age/position); not a scouting grade";
    provisionalRatings++;
  }
}
console.log(`Provisional rating fallback applied to ${provisionalRatings} records with missing rating data; potentials remain null unless source-backed.`);

let potentialEstimates = 0;
for (const p of records.values()) {
  if (p.potential != null && Number.isFinite(Number(p.potential)) && Number(p.potential) >= 0 && Number(p.potential) <= 99) continue;
  let age = 27;
  if (p.birthDate) {
    const birth = new Date(p.birthDate + "T00:00:00Z");
    if (Number.isFinite(birth.getTime())) age = 2026 - birth.getUTCFullYear();
  }
  const overall = Number.isFinite(Number(p.overall)) ? Number(p.overall) : 55;
  const growth = age <= 18 ? 20 : age <= 20 ? 16 : age <= 22 ? 12 : age <= 24 ? 8 : age <= 26 ? 4 : age <= 29 ? 1 : 0;
  p.potentialEstimate = Math.max(0, Math.min(99, Math.round(overall + growth)));
  p.potentialStatus = "provisional_model_estimate";
  p.potentialEstimateMethod = "overall_plus_age_growth_band_v1; not source-verified";
  potentialEstimates++;
}
console.log(`Potential model estimates created for ${potentialEstimates} records; source-verified potential remains unchanged.`);


const players = [...records.values()].sort((a,b) => a.name.localeCompare(b.name,"en"));
const identityGroups = new Map();
for (const p of players) {
  if (!p.name || !p.birthDate) continue;
  const key = `${nameKey(p.name)}|${p.birthDate}`;
  if (!identityGroups.has(key)) identityGroups.set(key, []);
  identityGroups.get(key).push(p);
}
const duplicateIdentityReport = [...identityGroups.values()].filter(group => group.length > 1)
  .map(group => group.map(p => ({id:p.id,name:p.name,birthDate:p.birthDate,league:p.currentLeague,team:p.currentTeam})));
console.log(`Potential duplicate identities: ${JSON.stringify(duplicateIdentityReport)}`);
const counts = players.reduce((out,p) => (out[p.currentLeague]=(out[p.currentLeague]||0)+1,out),{});
const output = {
  schemaVersion: 1, season: "2026-2027", generatedAt: now,
  description: "Unified player registry built from source snapshots. Ratings are source-labelled estimates; unknown rights, potential and contracts are not inferred.",
  counts, playerCount: players.length, players,
  ratingsMetadata: { season: ratingSeason || null, source: ratingData.source || null, playersAvailable: Object.keys(ratingMap).length, method: "sample-adjusted estimates; not scouting grades" },
  requiredFields: ["id","name","position","currentLeague","currentTeam","nhlRightsTeam"],
  optionalFields: ["birthDate","contractTeam","contractEnd","potential","source","verifiedAt"],
  leagues: ["NHL","AHL","CHL","NCAA","EUROPE","OTHER","UNKNOWN"],
  status: "generated_from_available_source_snapshots",
  dataNotes: [
    "NHL roster membership is assigned to the NHL team shown in the official roster snapshot.",
    "AHL affiliation does not establish NHL contract or rights ownership; nhlRightsTeam stays null unless the source explicitly states it.",
    "NHL public prospect lists may be incomplete or empty for some organizations; absence is not proof of missing rights.",
    "Source ratings are imported only when an NHL player ID matches data/ratings.json; missing ratings receive an explicitly provisional age/position fallback for game usability, not a scouting grade.",
    "Potential, unverified contracts and draft-pick ownership are not fabricated."
  ]
};
await writeFile("data/players/registry.json", JSON.stringify(output,null,2)+"\n", "utf8");
console.log(`Player registry: ${players.length} records; ${JSON.stringify(counts)}`);
const unknownLeagueDetails = players.filter(p=>!p.currentLeague||p.currentLeague==="UNKNOWN")
  .map(p=>`${p.name} [rights=${p.nhlRightsTeam||"?"}; age=${p.age??"?"}; draft=${p.draftYear??"?"}; team=${p.currentTeam||"?"}]`);
console.log(`UNKNOWN league detail (${unknownLeagueDetails.length}): ${unknownLeagueDetails.join(" | ")}`);

// Populate coaching ratings for simulation usability, without presenting them as verified scouting grades.
// Ratings are intentionally marked as provisional until a sourced coach-evaluation dataset is added.
for (const path of ["data/coaches/2026-2027.json", "data/coaches/ahl-2026-2027.json"]) {
  try {
    const staffData = JSON.parse(await readFile(path, "utf8"));
    let filled = 0;
    for (const coach of (Array.isArray(staffData.coaches) ? staffData.coaches : [])) {
      const fields = ["offensive","defensive","playerDevelopment","playerManagement","physicalStyle","powerPlayImpact","penaltyKillImpact","youngPlayerUsage"];
      const complete = fields.every(k => coach[k] != null && Number.isFinite(Number(coach[k])) && Number(coach[k]) >= 0 && Number(coach[k]) <= 99);
      if (complete) continue;
      const roleBase = coach.role === "head_coach" ? 63 : coach.role === "assistant_coach" ? 57 : 55;
      const key = String(coach.coachId || coach.fullName || "");
      let hash = 0;
      for (const ch of key) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
      const variation = (hash % 5) - 2;
      const base = Math.max(40, Math.min(85, roleBase + variation));
      const defaults = {
        offensive: base, defensive: base, playerDevelopment: base + 1,
        playerManagement: base, physicalStyle: base, powerPlayImpact: base,
        penaltyKillImpact: base, youngPlayerUsage: base
      };
      for (const field of fields) {
        if (coach[field] == null || !Number.isFinite(Number(coach[field])) || Number(coach[field]) < 0 || Number(coach[field]) > 99) {
          coach[field] = Math.max(0, Math.min(99, defaults[field]));
        }
      }
      coach.ratingsStatus = "provisional_role_estimate";
      coach.ratingsSource = "Hockey Dynasty role-based fallback model; not a sourced scouting grade";
      filled++;
    }
    staffData.ratingsMetadata = {
      ...(staffData.ratingsMetadata || {}),
      status: "provisional_role_estimates",
      note: "Missing coach ratings are role-based simulation estimates, not verified evaluations."
    };
    await writeFile(path, JSON.stringify(staffData, null, 2) + "\n", "utf8");
    console.log(`Coach ratings ${path}: ${filled} entries given explicitly provisional ratings.`);
  } catch (error) {
    console.warn(`Coach rating fallback skipped ${path}: ${error.message}`);
  }
}
