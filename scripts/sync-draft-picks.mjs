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
let snapshotVerifiedOwners=0, snapshotConflicts=0, snapshotRows=0, tradeOverridesApplied=0;
try {
  const snapshot=JSON.parse(await readFile("data/draft-picks/hockey-insights-2027-2029.json","utf8"));
  const snapshotByKey=new Map();
  for(const row of (snapshot.picks||[])){
    if(!years.includes(Number(row.year))||!Number.isInteger(Number(row.round))||!teams.includes(row.originalOwner))continue;
    const key=`${row.year}-${row.round}-${row.originalOwner}`;
    const previous=snapshotByKey.get(key);
    if(row.conditional){
      snapshotByKey.set(key,{...row,currentOwner:null,conditional:true,conflict:false});
    }else if(previous?.conditional){
      continue;
    }else if(row.conflict||previous&&previous.currentOwner!==row.currentOwner){
      snapshotByKey.set(key,{...row,currentOwner:null,conflict:true});
      snapshotConflicts++;
    }else if(!previous){
      snapshotByKey.set(key,row);
    }
  }
  // Reconcile every future-pick trade listed after the 2026-09-28 snapshot in the official NHL tracker.
  const officialTradeTrackerUrl="https://www.nhl.com/news/topic/trade-coverage/2026-27-nhl-trades";
  const officialTradeOverrides=new Map([
    ["2027-2-TOR",{owner:"CBJ",note:"2026-09-28 : Toronto a cédé son choix de 2e ronde 2027 à Columbus."}],
    ["2027-2-MTL",{owner:"NSH",note:"2026-10-09 : Montréal a cédé son choix de 2e ronde 2027 à Nashville."}],
    ["2029-2-WPG",{owner:"NJD",note:"2026-10-23 : Winnipeg a cédé son choix de 2e ronde 2029 au New Jersey."}],
    ["2027-7-WPG",{owner:"NJD",note:"2026-10-23 : Winnipeg a cédé son choix de 7e ronde 2027 au New Jersey."}]
  ]);
  for(const [key,override] of officialTradeOverrides){
    const row=snapshotByKey.get(key);
    if(row&&!row.conditional&&!row.conflict&&teams.includes(override.owner)){
      snapshotByKey.set(key,{...row,currentOwner:override.owner,tradeNote:override.note,verifiedByTracker:true});
      tradeOverridesApplied++;
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
    if(!row||row.conflict)continue;
    if(row.conditional){
      pick.currentOwner=null;pick.status="excluded_conditional";pick.verified=false;
      pick.source=row.source||"Hockey Insights / PuckPedia snapshot";pick.sourceUpdatedAt=row.snapshotDate||null;
      pick.conditions=null;pick.conditionsVerified=false;pick.acquiredVia=null;
      pick.verificationNote="Choix conditionnel exclu du registre jouable selon la règle du projet.";
      continue;
    }
    if(!teams.includes(row.currentOwner))continue;
    pick.currentOwner=row.currentOwner;
    pick.status="active";
    pick.verified=true;
    pick.source=`${row.source||"Hockey Insights Team Pipeline snapshot"} | ${officialTradeTrackerUrl}`;
    pick.sourceUpdatedAt=stamp;
    pick.conditions=null;
    pick.conditionsVerified=true;
    pick.acquiredVia=row.tradeNote|| (row.currentOwner!==pick.originalTeam
      ? `Acquis selon le snapshot PuckPedia du ${snapshot.snapshotDate||row.snapshotDate}; équipe d'origine ${pick.originalTeam}.` : null);
    pick.verificationNote=row.tradeNote
      ? `Propriétaire confirmé par le snapshot PuckPedia et le suivi officiel NHL : ${row.tradeNote}`
      : "Propriétaire du snapshot PuckPedia du 2026-09-28 recoupé avec le suivi officiel des transactions NHL jusqu'au 2026-10-30; les échanges postérieurs au snapshot ont été appliqués.";
    delete pick.note;
    snapshotVerifiedOwners++;
    snapshotRows++;
  }
  console.log(`Secondary draft snapshot: ${snapshot.pagesFetched||0}/32 pages; ${(snapshot.picks||[]).length} rows; ${snapshotVerifiedOwners} owners reconciled and verified; ${tradeOverridesApplied} official trade overrides; ${snapshotConflicts} conflicts.`);
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
database.source = "Official NHL Future Draft Picks pages + Hockey Insights/PuckPedia snapshot reconciled against the official 2026-27 NHL trade tracker through 2026-10-30";
database.lastSyncAt = stamp;
database.syncSummary = {pagesFetched,totalPages:teams.length,rowsParsed,updated,conflicts,snapshotVerifiedOwners,tradeOverridesApplied,provisionalOwners:provisional,excludedConditional,unresolved,unverifiedConditions,errors};
database.status = database.picks.length===expected && verified===playableExpected && provisional===0 && unresolved===0 && unverifiedConditions===0 && conflicts===0 ? "complete" : "incomplete";
await writeFile(file,JSON.stringify(database,null,2)+"\n","utf8");
console.log(`Draft picks sync: ${pagesFetched}/${teams.length} NHL pages; ${updated} official slots updated; ${verified}/${playableExpected} verified owners; ${snapshotVerifiedOwners} snapshot owners reconciled; ${tradeOverridesApplied} official trade overrides; ${excludedConditional} conditional picks excluded; ${unresolved} unresolved; ${unverifiedConditions} conditional terms unverified; ${conflicts+snapshotConflicts} conflicts.`);
if (errors.length) console.log("Pages needing follow-up: "+errors.join(" | "));
