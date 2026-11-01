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


/*
 * Manual condition resolutions are applied after automated NHL-page parsing.
 * This prevents stale "conditional" labels on team pages from re-blocking
 * picks whose trade/pick records show that the condition has resolved.
 */
const manualConditionResolutions = new Map([
  ["2027-R1-FLA", {
    owner:"CHI",
    source:"https://puckpedia.com/trade/934",
    note:"Florida's 2027 first-round pick transferred to Chicago after the protection rolled forward and resolved.",
    verificationNote:"PuckPedia's individual trade/pick record identifies Chicago as current owner and the protection as resolved. The Chicago future-picks page still displays a conflicting conditional label; that stale label is recorded for audit."
  }],
  ["2027-R1-TOR", {
    owner:"COL",
    source:"https://puckpedia.com/team/toronto-maple-leafs/draftpicks",
    note:"Toronto's 2027 first-round pick transferred to Colorado; owner confirmed in the individual pick ledger.",
    verificationNote:"Current owner cross-checked against the PuckPedia pick ledger and trade history."
  }],
  ["2027-R7-CAR", {
    owner:"PHI",
    source:"https://puckpedia.com/team/carolina-hurricanes/draftpicks",
    note:"Carolina's 2027 seventh-round pick transferred to Philadelphia; owner confirmed in the individual pick ledger.",
    verificationNote:"Current owner cross-checked against the PuckPedia pick ledger and trade history."
  }],
  ["2028-R2-EDM", {
    owner:"CHI",
    source:"https://puckpedia.com/draft-pick/2420282",
    note:"Edmonton's 2028 second-round pick transferred to Chicago in the Connor Murphy trade.",
    verificationNote:"The individual pick record and NHL trade release identify Chicago as owner. Chicago's future-picks page still displays a conflicting conditional label; that discrepancy is retained for audit."
  }],
  ["2027-R1-TBL", {
    owner:"SEA",
    source:"https://puckpedia.com/team/tampa-bay-lightning/draftpicks",
    note:"Tampa Bay's 2027 first-round pick was traded to Seattle in the Oliver Bjorkstrand three-team trade.",
    verificationNote:"PuckPedia lists the 2027 first as transferred to Seattle; no conditional term is shown."
  }],
  ["2028-R1-VGK", {
    owner:"VGK",
    source:"https://puckpedia.com/team/vegas-golden-knights/draftpicks",
    note:"Vegas retains its own 2028 first-round pick. The separate conditional 2028 first acquired from New York is tracked as 2028-R1-NYR.",
    verificationNote:"PuckPedia's Vegas pick ledger distinguishes Vegas's own first from the conditional New York first."
  }],
  ["2028-R4-LAK", {
    owner:"LAK",
    source:"https://puckpedia.com/trade/1074",
    note:"Los Angeles retains its 2028 fourth-round pick; the Panarin-trade condition was resolved and not met, so the pick did not transfer to New York.",
    verificationNote:"PuckPedia's trade analysis says the condition (Los Angeles wins two playoff rounds in 2026) was resolved and the draft pick was not transferred."
  }]
]);
for (const [pickId, resolution] of manualConditionResolutions) {
  const pick = database.picks.find(p => p.pickId === pickId);
  if (!pick) throw new Error(`Manual resolved pick is missing: ${pickId}`);
  Object.assign(pick, {
    currentOwner: resolution.owner,
    status: "active",
    verified: true,
    conditions: null,
    conditionsVerified: true,
    source: resolution.source,
    sourceUpdatedAt: stamp,
    acquiredVia: resolution.note,
    verificationNote: resolution.verificationNote,
    conditionText: null,
    conditionReviewStatus: "RESOLVED",
    conditionTermsDocumented: true,
    conditionVerified: true,
    conditionalBeneficiary: null,
    conditionalCurrentOwner: null,
    conditionalAlternateOwner: null,
    conditionalSelectionGroup: null
  });
}

const blockedConditionNotes = new Map([
  ["2027-R2-COL", {text:"Calgary receives the better of Colorado or Minnesota's 2027 second-round picks in the Nazem Kadri trade; which pick is conveyed depends on the final order.",beneficiary:"CGY",group:"CGY-2027-R2-BETTER-OF-COL-MIN",source:"https://puckpedia.com/team/colorado-avalanche/draftpicks"}],
  ["2027-R2-MIN", {text:"Minnesota's 2027 second-round pick is listed in the David Jiricek trade to Columbus, but is also referenced in the Colorado-Calgary better-of-two 2027 second-round condition. Ownership chain must be reconciled before release.",beneficiary:"CGY",currentOwner:"CBJ",group:"CGY-2027-R2-BETTER-OF-COL-MIN",source:"https://puckpedia.com/team/minnesota-wild/draftpicks"}],
  ["2027-R2-CBJ", {text:"Seattle receives the higher of Columbus or Winnipeg's 2027 second-round picks through the Florida trade; selection is not determined until the order is known.",beneficiary:"SEA",group:"SEA-2027-R2-HIGHER-OF-CBJ-WPG",source:"https://puckpedia.com/team/florida-panthers/draftpicks"}],
  ["2027-R2-WPG", {text:"Seattle receives the higher of Columbus or Winnipeg's 2027 second-round picks through the Florida trade; selection is not determined until the order is known.",beneficiary:"SEA",group:"SEA-2027-R2-HIGHER-OF-CBJ-WPG",source:"https://puckpedia.com/team/florida-panthers/draftpicks"}],
  ["2027-R3-TOR", {text:"Toronto's 2027 third-round pick was sent to Utah for Matias Maccelli; PuckPedia lists a possible upgrade to a 2029 second if Toronto makes the playoffs and Maccelli records at least 51 points in 2025-26. Its later routing is linked to the earlier-of-two third-round clause.",beneficiary:"NYR",currentOwner:"UTA",group:"NYR-2027-R3-EARLIER-OF-UTA-TOR",source:"https://puckpedia.com/team/toronto-maple-leafs/draftpicks"}],
  ["2027-R3-UTA", {text:"The Vincent Trocheck trade gives NYR the earlier of Utah or Toronto's 2027 third-round picks; the selected pick is not known yet.",beneficiary:"NYR",group:"NYR-2027-R3-EARLIER-OF-UTA-TOR",source:"https://puckpedia.com/team/utah-mammoth/draftpicks"}],
  ["2028-R1-COL", {text:"Colorado's 2028 first-round pick is in a multi-step conditional transfer chain; PuckPedia lists Nashville as the current holder and Toronto as a contingent owner. Keep blocked pending final condition and chain verification.",currentOwner:"NSH",alternateOwner:"TOR",source:"https://puckpedia.com/team/colorado-avalanche/draftpicks"}],
  ["2028-R1-DAL", {text:"Dallas's 2028 first-round pick was included as a conditional pick in the Mikko Rantanen trade to Carolina; condition remains unresolved.",beneficiary:"CAR",source:"https://puckpedia.com/team/carolina-hurricanes/draftpicks"}],
  ["2028-R1-FLA", {text:"Florida's 2028 first-round pick appears as a conditional asset in the Utah-to-Boston John-Jason Peterka trade; keep blocked pending final condition.",beneficiary:"BOS",source:"https://puckpedia.com/team/utah-mammoth/draftpicks"}],
  ["2028-R2-VGK", {text:"Vegas's 2028 second-round pick was included conditionally in the Rasmus Andersson trade to Calgary; condition remains unresolved.",beneficiary:"CGY",source:"https://puckpedia.com/team/vegas-golden-knights/draftpicks"}],
  ["2029-R1-FLA", {text:"Florida's 2029 first-round pick is included conditionally in the Brady Tkachuk trade to Ottawa; condition remains unresolved.",beneficiary:"OTT",source:"https://puckpedia.com/team/florida-panthers/draftpicks"}],
  ["2027-R1-COL", {text:"Toronto has a conditional claim to Colorado's 2027 first-round pick in the Nicolas Roy trade. The pick is top-10 protected; if it falls in the top 10, the obligation rolls to Colorado's 2028 first-round pick.",beneficiary:"TOR",group:"TOR-COL-2027-R1-2028-R1",source:"https://puckpedia.com/team/colorado-avalanche/draftpicks"}],
  ["2027-R1-VGK", {text:"Vegas's 2027 first-round pick was routed through Calgary and is subject to a top-10 protection before the contingent New Jersey transfer can be finalized. The final branch depends on the 2027 draft position.",beneficiary:"NJD",currentOwner:"NJD",alternateOwner:"CGY",group:"NJD-VGK-2027-R1-TOP10",source:"https://puckpedia.com/team/vegas-golden-knights/draftpicks"}],
  ["2028-R1-NYR", {text:"New York's 2028 first-round pick was included in the Pavel Dorofeyev trade to Vegas. It is top-10 protected; if it falls in the top 10, the obligation rolls to a 2029 first-round pick.",beneficiary:"VGK",group:"VGK-NYR-2028-R1-2029-R1",source:"https://puckpedia.com/trade/1149"}],
  ["2028-R1-TOR", {text:"Toronto's 2027 first-round obligation to Philadelphia for Scott Laughton is protected; if the 2027 pick does not convey, Toronto's 2028 first-round pick is the fallback. Keep blocked until the 2027 protection outcome is known.",beneficiary:"PHI",group:"PHI-TOR-2027-R1-2028-R1",source:"https://puckpedia.com/team/toronto-maple-leafs/draftpicks"}],
  ["2028-R3-NYR", {text:"Boston acquired New York's 2028 third-round pick in the William Borgen trade. It upgrades to a 2028 second if Boston reaches the Eastern Conference Final in 2027 or 2028 and Borgen plays in 50% of the playoff games.",beneficiary:"BOS",group:"BOS-NYR-2028-R3-UPGRADE-R2",source:"https://puckpedia.com/trade/1195"}],
  ["2029-R1-COL", {text:"Colorado's 2029 first is part of a multi-team conditional chain. PuckPedia lists Nashville, New Jersey and Calgary as conditional claimants if Colorado's 2027 first goes to Toronto and the protected 2028 first rolls forward; final priority and ownership remain unresolved.",beneficiary:"NSH;NJD;CGY",group:"COL-2027-R1-2028-R1-2029-R1",source:"https://puckpedia.com/draft-pick/120291"}]
]);
const blockedConditionalPickIds = [
  "2027-R1-COL","2027-R1-VGK",
  "2027-R2-COL","2027-R2-CBJ","2027-R2-MIN","2027-R2-WPG",
  "2027-R3-TOR","2027-R3-UTA",
  "2028-R1-COL","2028-R1-DAL","2028-R1-FLA","2028-R1-NYR","2028-R1-TOR",
  "2028-R2-VGK","2028-R3-BOS","2028-R3-NYR",
  "2029-R1-COL","2029-R1-FLA"
];
for (const pickId of blockedConditionalPickIds) {
  const pick = database.picks.find(p => p.pickId === pickId);
  if (!pick) throw new Error(`Blocked conditional pick is missing: ${pickId}`);
  const note = blockedConditionNotes.get(pickId);
  Object.assign(pick, {
    currentOwner: null,
    status: "excluded_conditional",
    verified: false,
    conditions: null,
    conditionsVerified: false,
    source: note?.source || pick.source || "Hockey Insights / PuckPedia snapshot",
    sourceUpdatedAt: stamp,
    acquiredVia: null,
    conditionText: note?.text || null,
    conditionReviewStatus: note ? "DOCUMENTED_BLOCKED" : "SOURCE_REVIEW_REQUIRED",
    conditionTermsDocumented: Boolean(note),
    conditionVerified: false,
    conditionalBeneficiary: note?.beneficiary || null,
    conditionalCurrentOwner: note?.currentOwner || null,
    conditionalAlternateOwner: note?.alternateOwner || null,
    conditionalSelectionGroup: note?.group || null,
    verificationNote: note
      ? "Condition terms documented, but the pick remains blocked until the selection or final ownership is resolved."
      : "Still blocked: exact condition terms or a reliable resolution source are required."
  });
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
const documentedBlocked = database.picks.filter(p=>p.status==="excluded_conditional"&&p.conditionTermsDocumented===true).length;
const sourceReviewRequired = excludedConditional-documentedBlocked;
database.syncSummary = {pagesFetched,totalPages:teams.length,rowsParsed,updated,conflicts,snapshotVerifiedOwners,tradeOverridesApplied,provisionalOwners:provisional,excludedConditional,unresolved,unverifiedConditions,activeVerified:verified,manualConditionResolutions:manualConditionResolutions.size,documentedBlocked,sourceReviewRequired,resolvedConditionalThisPass:[...manualConditionResolutions.keys()],errors};
database.conditionalAuditStatus = excludedConditional ? "PARTIAL" : "COMPLETE";
database.status = database.picks.length===expected && verified===playableExpected && provisional===0 && unresolved===0 && unverifiedConditions===0 && conflicts===0 ? "complete" : "incomplete";
await writeFile(file,JSON.stringify(database,null,2)+"\n","utf8");
console.log(`Draft picks sync: ${pagesFetched}/${teams.length} NHL pages; ${updated} official slots updated; ${verified}/${playableExpected} verified owners; ${snapshotVerifiedOwners} snapshot owners reconciled; ${tradeOverridesApplied} official trade overrides; ${excludedConditional} conditional picks excluded; ${unresolved} unresolved; ${unverifiedConditions} conditional terms unverified; ${conflicts+snapshotConflicts} conflicts.`);
if (errors.length) console.log("Pages needing follow-up: "+errors.join(" | "));
