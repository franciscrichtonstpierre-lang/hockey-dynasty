// Synchronise les propriétaires de choix depuis les pages officielles NHL Future Draft Picks.
import { readFile, writeFile } from "node:fs/promises";

const teamSlugs = {
  ANA:"ducks",BOS:"bruins",BUF:"sabres",CGY:"flames",CAR:"hurricanes",CHI:"blackhawks",
  COL:"avalanche",CBJ:"bluejackets",DAL:"stars",DET:"redwings",EDM:"oilers",FLA:"panthers",
  LAK:"kings",MIN:"wild",MTL:"canadiens",NSH:"predators",NJD:"devils",NYI:"islanders",
  NYR:"rangers",OTT:"senators",PHI:"flyers",PIT:"penguins",SJS:"sharks",SEA:"kraken",
  STL:"blues",TBL:"lightning",TOR:"mapleleafs",UTA:"utah",VAN:"canucks",VGK:"goldenknights",
  WSH:"capitals",WPG:"jets"
};
const teams = Object.keys(teamSlugs);
const years = [2027,2028,2029];
const file = "data/draft-picks/2027-2029.json";
const database = JSON.parse(await readFile(file,"utf8"));
if (!Array.isArray(database.picks)) throw new Error("Draft-pick ledger has no picks array.");

function decode(value) {
  return String(value||"")
    .replace(/&nbsp;|&#160;/gi," ")
    .replace(/&amp;/gi,"&")
    .replace(/&quot;/gi,'"')
    .replace(/&#39;|&apos;/gi,"'")
    .replace(/&lt;/gi,"<")
    .replace(/&gt;/gi,">")
    .replace(/&#x([0-9a-f]+);/gi,(_,hex)=>String.fromCodePoint(parseInt(hex,16)))
    .replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n)));
}
function plain(html) {
  return decode(String(html||"").replace(/<br\s*\/?>/gi," ").replace(/<[^>]*>/g," ").replace(/\s+/g," ").trim());
}
function parseYearRows(html, year) {
  const marker = new RegExp(year + "\\s+Draft Picks","i");
  const match = marker.exec(html);
  if (!match) return [];
  const start = match.index + match[0].length;
  const tail = html.slice(start);
  const nextYear = new RegExp((year+1) + "\\s+Draft Picks","i").exec(tail);
  let section = nextYear ? tail.slice(0,nextYear.index) : tail;
  const previouslyHeld = /Previously Held Picks/i.exec(section);
  if (previouslyHeld) section = section.slice(0,previouslyHeld.index);
  const result = [];
  for (const rowMatch of section.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cells = [...rowMatch[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(m=>plain(m[1]));
    if (cells.length < 3 || /^(rd\.?|round)$/i.test(cells[0])) continue;
    const roundMatch = cells[0].match(/^\s*(\d+)\s*(?:\(([^)]+)\))?/i);
    if (!roundMatch) continue;
    const originalTeamMatch = cells[2].match(/\b([A-Z]{3})\b/);
    if (!originalTeamMatch) continue;
    const originalTeam = originalTeamMatch[1];
    if (!teams.includes(originalTeam)) continue;
    const notes = cells[3] && cells[3] !== "--" ? cells[3] : null;
    const conditional = /conditional/i.test(cells[0]) || /conditional pick/i.test(notes||"");
    result.push({year,round:Number(roundMatch[1]),originalTeam,conditional,notes});
  }
  return result;
}

const stamp = new Date().toISOString();
const observed = new Map();
const errors = [];
let pagesFetched = 0, rowsParsed = 0, updated = 0, conflicts = 0;
for (const owner of teams) {
  const url = `https://www.nhl.com/${teamSlugs[owner]}/team/future-draft-picks`;
  try {
    const response = await fetch(url,{
      headers:{"User-Agent":"Mozilla/5.0 (compatible; HockeyDynastyDataSync/1.0)","Accept":"text/html,application/xhtml+xml"},
      signal:AbortSignal.timeout(20000)
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const html = await response.text();
    pagesFetched++;
    let teamRows = 0;
    for (const year of years) {
      const rows = parseYearRows(html,year);
      teamRows += rows.length;
      for (const row of rows) {
        const key = `${row.year}-${row.round}-${row.originalTeam}`;
        const pick = database.picks.find(p=>Number(p.year)===row.year&&Number(p.round)===row.round&&p.originalTeam===row.originalTeam);
        if (!pick) continue;
        rowsParsed++;
        // Project rule: conditional picks are excluded from the playable ledger.
        // Never re-introduce them as assets during an automated NHL sync.
        if (row.conditional) {
          observed.delete(key);
          pick.currentOwner = null;
          pick.status = "excluded_conditional";
          pick.verified = false;
          pick.conditions = null;
          pick.conditionsVerified = false;
          pick.source = url;
          pick.sourceUpdatedAt = stamp;
          pick.acquiredVia = null;
          pick.verificationNote = "Choix conditionnel exclu du registre jouable selon la règle du projet; propriétaire ferme non attribué.";
          continue;
        }
        const previous = observed.get(key);
        if (previous && previous.owner !== owner) {
          pick.currentOwner = null;
          pick.status = "unverified";
          pick.verified = false;
          pick.conditionsVerified = false;
          pick.source = null;
          pick.note = `Conflit entre les pages officielles de ${previous.owner} et ${owner}; validation manuelle requise.`;
          conflicts++;
          continue;
        }
        observed.set(key,{owner,url,row});
        pick.currentOwner = owner;
        pick.status = row.conditional ? "conditional" : "active";
        pick.verified = true;
        pick.source = url;
        pick.sourceUpdatedAt = stamp;
        pick.conditionsVerified = !row.conditional;
        pick.conditions = row.conditional
          ? (row.notes ? `Condition indiquée sur la page officielle; terme exact à confirmer : ${row.notes}` : "La page officielle marque ce choix comme conditionnel; terme exact à confirmer.")
          : null;
        pick.acquiredVia = row.notes;
        pick.verificationNote = "Propriétaire courant et équipe d’origine recoupés depuis la page officielle NHL Future Draft Picks.";
        delete pick.note;
        updated++;
      }
    }
    console.log(`NHL future picks ${owner}: ${teamRows} lignes actives lues`);
    if (!teamRows) errors.push(`${owner}: aucune ligne de choix reconnue dans ${url}`);
  } catch (error) {
    errors.push(`${owner}: ${error.message}`);
    console.error(`NHL future picks ${owner}: ${error.message}`);
  }
}
// PuckPedia team draft pages are a second, current ownership source. Only apply rows whose
// original team and holder can be resolved from the pick row or its transaction details.
const puckpediaSlugs={
  ANA:"ANAHEIM-DUCKS",BOS:"BOSTON-BRUINS",BUF:"BUFFALO-SABRES",CGY:"CALGARY-FLAMES",
  CAR:"CAROLINA-HURRICANES",CHI:"CHICAGO-BLACKHAWKS",COL:"COLORADO-AVALANCHE",CBJ:"COLUMBUS-BLUE-JACKETS",
  DAL:"DALLAS-STARS",DET:"DETROIT-RED-WINGS",EDM:"EDMONTON-OILERS",FLA:"FLORIDA-PANTHERS",
  LAK:"LOS-ANGELES-KINGS",MIN:"MINNESOTA-WILD",MTL:"MONTREAL-CANADIENS",NSH:"NASHVILLE-PREDATORS",
  NJD:"NEW-JERSEY-DEVILS",NYI:"NEW-YORK-ISLANDERS",NYR:"NEW-YORK-RANGERS",OTT:"OTTAWA-SENATORS",
  PHI:"PHILADELPHIA-FLYERS",PIT:"PITTSBURGH-PENGUINS",SJS:"SAN-JOSE-SHARKS",SEA:"SEATTLE-KRAKEN",
  STL:"ST-LOUIS-BLUES",TBL:"TAMPA-BAY-LIGHTNING",TOR:"TORONTO-MAPLE-LEAFS",UTA:"UTAH-MAMMOTH",
  VAN:"VANCOUVER-CANUCKS",VGK:"VEGAS-GOLDEN-KNIGHTS",WSH:"WASHINGTON-CAPITALS",WPG:"WINNIPEG-JETS"
};
const puckpediaTeamNames={
  ANA:"Anaheim Ducks",BOS:"Boston Bruins",BUF:"Buffalo Sabres",CGY:"Calgary Flames",CAR:"Carolina Hurricanes",
  CHI:"Chicago Blackhawks",COL:"Colorado Avalanche",CBJ:"Columbus Blue Jackets",DAL:"Dallas Stars",DET:"Detroit Red Wings",
  EDM:"Edmonton Oilers",FLA:"Florida Panthers",LAK:"Los Angeles Kings",MIN:"Minnesota Wild",MTL:"Montreal Canadiens",
  NSH:"Nashville Predators",NJD:"New Jersey Devils",NYI:"New York Islanders",NYR:"New York Rangers",OTT:"Ottawa Senators",
  PHI:"Philadelphia Flyers",PIT:"Pittsburgh Penguins",SJS:"San Jose Sharks",SEA:"Seattle Kraken",STL:"St. Louis Blues",
  TBL:"Tampa Bay Lightning",TOR:"Toronto Maple Leafs",UTA:"Utah Mammoth",VAN:"Vancouver Canucks",VGK:"Vegas Golden Knights",
  WSH:"Washington Capitals",WPG:"Winnipeg Jets"
};
const fullNameToCode=new Map(Object.entries(puckpediaTeamNames).map(([code,name])=>[name.toLowerCase(),code]));
function teamCodeInText(value){
  const textValue=String(value||"");
  const codeMatch=textValue.match(/\b([A-Z]{3})\b/);
  if(codeMatch&&teams.includes(codeMatch[1]))return codeMatch[1];
  for(const [code,name] of Object.entries(puckpediaTeamNames)){
    if(textValue.toLowerCase().includes(name.toLowerCase()))return code;
  }
  return null;
}
function parsePuckpediaYear(html,owner,year,url){
  const heading=new RegExp("<h[23][^>]*>\\s*"+year+"\\s+NHL Draft\\s*</h[23]>","i").exec(html);
  if(!heading)return [];
  const start=heading.index+heading[0].length;
  const tail=html.slice(start);
  const nextHeading=new RegExp("<h[23][^>]*>\\s*"+(year+1)+"\\s+NHL Draft\\s*</h[23]>","i").exec(tail);
  const section=nextHeading?tail.slice(0,nextHeading.index):tail;
  const result=[];
  for(const rowMatch of section.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)){
    const rawCells=[...rowMatch[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(m=>plain(m[1]));
    if(rawCells.length<3||/^(round|year)$/i.test(rawCells[0]||""))continue;
    const roundMatch=String(rawCells[0]||"").match(/^\s*(\d+)/);
    if(!roundMatch)continue;
    const round=Number(roundMatch[1]);
    if(round<1||round>7)continue;
    const pickFrom=String(rawCells[1]||"").trim();
    const details=String(rawCells[3]||"").trim();
    const conditional=/conditional|\*/i.test(details);
    let originalTeam=teamCodeInText(pickFrom);
    const parenthetical=details.match(new RegExp(year+"\\s+(?:\\d+(?:st|nd|rd|th)?\\s+)?"+round+"?\\s*(?:round|R)\\s*"+round+"?[^\\n]{0,90}\\(([A-Z]{3})\\)","i"));
    // Common PuckPedia wording: "a 2027 2nd round pick (CBJ)".
    const explicitPickCode=details.match(new RegExp(year+"[^\\n]{0,100}?\\b"+round+"(?:st|nd|rd|th)?\\s+round pick\\s*\\(([A-Z]{3})\\)","i"));
    const anyTeamCode=explicitPickCode?.[1]||parenthetical?.[1]||null;
    if(!originalTeam&&anyTeamCode&&teams.includes(anyTeamCode))originalTeam=anyTeamCode;
    if(!originalTeam&&!details)originalTeam=owner;
    let currentOwner=owner;
    if(/traded away/i.test(details)){
      originalTeam=originalTeam||owner;
      const fromMatch=details.match(/\bfrom\s+(.+?)(?:\s+for\s+|\s+in\s+exchange\s+for\s+|$)/i);
      const fromCode=fromMatch?teamCodeInText(fromMatch[1]):null;
      currentOwner=fromCode;
    }else if(!originalTeam&&details){
      // The source club is only accepted when the row explicitly names the pick's origin.
      originalTeam=anyTeamCode;
    }
    if(!originalTeam||!teams.includes(originalTeam)||!currentOwner||!teams.includes(currentOwner))continue;
    result.push({year,round,originalTeam,currentOwner,conditional,details,pickFrom,url});
  }
  return result;
}
let puckpediaPagesFetched=0,puckpediaRowsParsed=0,puckpediaUpdated=0,puckpediaConflicts=0;
const puckpediaResults=[];
for(let start=0;start<teams.length;start+=4){
  const batch=await Promise.all(teams.slice(start,start+4).map(async owner=>{
    const url=`https://puckpedia.com/team/${puckpediaSlugs[owner]}/draftpicks`;
    try{
      const response=await fetch(url,{
        headers:{"user-agent":"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36","accept":"text/html,application/xhtml+xml","accept-language":"en-US,en;q=0.9"},
        signal:AbortSignal.timeout(15000)
      });
      if(!response.ok)throw new Error(`HTTP ${response.status}`);
      const html=await response.text();
      const rows=years.flatMap(year=>parsePuckpediaYear(html,owner,year,url));
      return {owner,url,rows,error:null};
    }catch(error){return {owner,url,rows:[],error:error.message};}
  }));
  puckpediaResults.push(...batch);
  await new Promise(resolve=>setTimeout(resolve,120));
}
for(const result of puckpediaResults){
  if(result.error){errors.push(`PuckPedia ${result.owner}: ${result.error}`);continue;}
  puckpediaPagesFetched++;
  puckpediaRowsParsed+=result.rows.length;
  for(const row of result.rows){
    const key=`${row.year}-${row.round}-${row.originalTeam}`;
    const pick=database.picks.find(p=>Number(p.year)===row.year&&Number(p.round)===row.round&&p.originalTeam===row.originalTeam);
    if(!pick)continue;
    if(row.conditional){
      pick.currentOwner=null;pick.status="excluded_conditional";pick.verified=false;pick.conditions=null;pick.conditionsVerified=false;
      pick.source=row.url;pick.sourceUpdatedAt=stamp;pick.acquiredVia=row.details||null;
      pick.verificationNote="Choix marqué conditionnel sur PuckPedia; exclu du registre jouable selon la règle du projet.";
      continue;
    }
    if(pick.status==="excluded_conditional")continue;
    const previousOwner=observed.get(key);
    if(previousOwner&&previousOwner.owner!==row.currentOwner&&pick.verified===true&&pick.currentOwner!==row.currentOwner){
      // Do not overwrite a source-backed contradiction; leave it for manual reconciliation.
      pick.status="unverified";pick.verified=false;pick.currentOwner=null;pick.source=null;
      pick.note=`Conflit entre les sources NHL et PuckPedia (${previousOwner.owner} / ${row.currentOwner}); validation manuelle requise.`;
      puckpediaConflicts++;
      continue;
    }
    pick.currentOwner=row.currentOwner;pick.status="active";pick.verified=true;pick.source=row.url;pick.sourceUpdatedAt=stamp;
    pick.conditions=null;pick.conditionsVerified=true;pick.acquiredVia=row.details||null;
    pick.verificationNote="Propriétaire recoupé depuis la page PuckPedia du club détenteur; choix non conditionnel dans la ligne source.";
    delete pick.note;
    observed.set(key,{owner:row.currentOwner,url:row.url,row});
    puckpediaUpdated++;
  }
}
console.log(`PuckPedia draft sync: ${puckpediaPagesFetched}/32 pages; ${puckpediaRowsParsed} parsed ownership rows; ${puckpediaUpdated} pick rows updated; ${puckpediaConflicts} conflicts.`);

let provisionalOwners=0, snapshotConflicts=0, snapshotRows=0;
try {
  const snapshot=JSON.parse(await readFile("data/draft-picks/hockey-insights-2027-2029.json","utf8"));
  const snapshotByKey=new Map();
  for(const row of (snapshot.picks||[])){
    if(!years.includes(Number(row.year))||!Number.isInteger(Number(row.round))||!teams.includes(row.originalOwner))continue;
    const key=`${row.year}-${row.round}-${row.originalOwner}`;
    const previous=snapshotByKey.get(key);
    if(row.conflict||previous&&previous.currentOwner!==row.currentOwner){
      snapshotByKey.set(key,{...row,currentOwner:null,conflict:true});
      snapshotConflicts++;
    }else if(!previous||previous.conditional&&!row.conditional){
      snapshotByKey.set(key,row);
    }
  }
  for(const pick of database.picks){
    if(pick.status==="provisional_snapshot"&&pick.verified!==true){
      pick.currentOwner=null;pick.status="unverified";pick.source=null;pick.sourceUpdatedAt=null;pick.acquiredVia=null;
      pick.verificationNote="Aucun propriétaire officiel confirmé; en attente du snapshot secondaire courant.";
    }
    if(pick.verified===true&&teams.includes(pick.currentOwner))continue;
    if(pick.status==="excluded_conditional"||/conflit/i.test(pick.note||""))continue;
    const row=snapshotByKey.get(`${pick.year}-${pick.round}-${pick.originalTeam}`);
    if(!row||row.conflict||!teams.includes(row.currentOwner))continue;
    pick.currentOwner=row.currentOwner;
    pick.status="provisional_snapshot";
    pick.verified=false;
    pick.source=row.source||"Hockey Insights Team Pipeline";
    pick.sourceUpdatedAt=snapshot.snapshotDate||row.snapshotDate||null;
    pick.conditions=null;
    pick.conditionsVerified=false;
    pick.acquiredVia=row.currentOwner!==pick.originalTeam
      ? `Acquis selon le snapshot secondaire; équipe d'origine ${pick.originalTeam}.` : null;
    pick.verificationNote=row.verificationNote||"Propriétaire issu du snapshot secondaire du 2026-09-28; confirmation officielle requise.";
    delete pick.note;
    provisionalOwners++;
    snapshotRows++;
  }
  console.log(`Secondary draft snapshot: ${snapshot.pagesFetched||0}/32 pages; ${(snapshot.picks||[]).length} rows; ${provisionalOwners} provisional owners applied; ${snapshotConflicts} conflicts.`);
} catch(error) {
  console.warn(`Secondary draft snapshot unavailable: ${error.message}`);
}

const expected = teams.length * years.length * 7;
const excludedConditional = database.picks.filter(p=>p.status==="excluded_conditional").length;
const playableExpected = expected-excludedConditional;
const verified = database.picks.filter(p=>p.verified===true&&p.source&&teams.includes(p.currentOwner)).length;
const provisional = database.picks.filter(p=>p.status==="provisional_snapshot"&&p.verified===false&&teams.includes(p.currentOwner)).length;
const unresolved = database.picks.filter(p=>p.status!=="excluded_conditional"&&
  !(p.verified===true&&teams.includes(p.currentOwner))&&
  !(p.status==="provisional_snapshot"&&p.verified===false&&teams.includes(p.currentOwner))).length;
const unverifiedConditions = database.picks.filter(p=>p.status==="conditional"&&p.conditionsVerified!==true).length;
database.source = "Official NHL club Future Draft Picks pages, supplemented by Hockey Insights Team Pipeline snapshot";
database.lastSyncAt = stamp;
database.syncSummary = {pagesFetched,totalPages:teams.length,rowsParsed,updated,conflicts,provisionalOwners:provisional,excludedConditional,unresolved,unverifiedConditions,errors};
database.status = database.picks.length===expected && verified===playableExpected && provisional===0 && unresolved===0 && unverifiedConditions===0 && conflicts===0 ? "complete" : "incomplete";
await writeFile(file,JSON.stringify(database,null,2)+"\n","utf8");
console.log(`Draft picks sync: ${pagesFetched}/${teams.length} NHL pages; ${updated} official slots updated; ${verified}/${playableExpected} verified owners; ${provisional} provisional snapshot owners; ${excludedConditional} conditional picks excluded; ${unresolved} unresolved; ${unverifiedConditions} conditional terms unverified; ${conflicts+snapshotConflicts} conflicts.`);
if (errors.length) console.log("Pages needing follow-up: "+errors.join(" | "));
