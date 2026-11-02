// Build the canonical cross-league player registry from source snapshots.
// Source-labelled ratings are imported when IDs match; unknown rights and contracts are never inferred, while missing potential receives a flagged provisional estimate.
import { readFile, writeFile } from "node:fs/promises";
import { emptyRatings, hasAnyRating, normalizeRatings } from "./lib/player-ratings.mjs";

const codes = ["ANA","BOS","BUF","CGY","CAR","CHI","COL","CBJ","DAL","DET","EDM","FLA","LAK","MIN","MTL","NSH","NJD","NYI","NYR","OTT","PHI","PIT","SJS","SEA","STL","TBL","TOR","UTA","VAN","VGK","WSH","WPG"];
const affiliations = JSON.parse(await readFile("data/ahl/teams.json", "utf8")).teams || [];
const echlAffiliations = JSON.parse(await readFile("data/echl/affiliations-2026-2027.json", "utf8")).teams || [];
const echlAffiliationByName = new Map(echlAffiliations.map(t => [String(t.echlName).normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(), t]));
const ahlByCode = new Map(affiliations.map(t => [t.nhlCode, t.ahlName]));
const ratingData = JSON.parse(await readFile("data/ratings.json", "utf8"));
const ratingMap = ratingData.players || {};
const ratingMetadata = ratingData.playerMetadata || {};
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
    p.attributes = rating;
    p.overall = p.overall ?? rating.OA ?? null;
    p.ratingSeason = ratingSeason || null;
    const metadata = ratingMetadata[String(p.nhlPlayerId)] || {};
    p.ratingSource = metadata.source || ratingData.source || null;
    p.ratingConfidence = metadata.confidence || "unknown";
    p.ratingSampleConfidence = metadata.sampleConfidence || "unknown";
    p.ratingSampleSize = metadata.sampleSize ?? null;
    p.ratedAttributes = metadata.ratedAttributes || Object.keys(rating).filter(key => rating[key] != null);
    p.ratingStatus = metadata.status || "sample_adjusted_statistical_estimate";
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
      attributes: p.ratingStatus === "sample_adjusted_statistical_estimate" ? p.attributes : old.attributes || p.attributes
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

// Apply the season's official ECHL-to-NHL/AHL organization affiliation to each roster record.
const echlTeamNames = new Map(echlAffiliations.map(t => [String(t.echlName).normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(), t]));
// ECHL roster snapshots: these are professional players, but ECHL membership alone does not prove NHL rights.
try {
  const { readdir } = await import("node:fs/promises");
  const files = (await readdir("data/echl")).filter(name => name.endsWith(".json") && name !== "teams.json");
  for (const file of files) {
    try {
      const data = JSON.parse(await readFile(`data/echl/${file}`, "utf8"));
      for (const p of (Array.isArray(data.players) ? data.players : [])) {
        const sourceId = first(p.player_id, p.playerId, p.person_id, p.id);
        const name = nameOf(p);
        if (!sourceId || !name) continue;
        add({
          id: `echl:${sourceId}`, name, firstName: str(first(p.first_name,p.firstName)),
          lastName: str(first(p.last_name,p.lastName)), position: posGroup(p), detailedPosition: detailedPos(p),
          currentLeague: "ECHL", currentTeam: data.teamName || data.team_name || null,
          nhlRightsTeam: echlTeamNames.get(nameKey(data.teamName || data.team_name || ""))?.nhlCode || null,
          ahlAffiliationTeam: echlTeamNames.get(nameKey(data.teamName || data.team_name || ""))?.ahlName || null,
          affiliationSource: "https://echl.com/teams/nhl-ahl-affiliations",
          affiliationSeason: "2026-2027",
          affiliationStatus: echlTeamNames.has(nameKey(data.teamName || data.team_name || "")) ? (echlTeamNames.get(nameKey(data.teamName || data.team_name || ""))?.independent ? "independent_echl_team" : "official_nhl_ahl_affiliation") : "affiliation_unmatched",
          birthDate: str(first(p.birthdate,p.birthDate)), shootsCatches: str(first(p.shoots,p.catches,p.shootsCatches)),
          sweaterNumber: Number.isFinite(Number(first(p.tp_jersey_number,p.jersey_number,p.sweater_number))) ? Number(first(p.tp_jersey_number,p.jersey_number,p.sweater_number)) : null,
          nhlPlayerId: Number.isFinite(Number(first(p.nhl_player_id,p.nhlPlayerId))) ? Number(first(p.nhl_player_id,p.nhlPlayerId)) : null,
          attributes: null, overall: null, potential: null,
          source: data.sourceUrl || "ECHL HockeyTech public feed", sourceUpdatedAt: data.syncedAt || now
        });
      }
    } catch (e) { console.warn(`ECHL registry skipped ${file}: ${e.message}`); }
  }
  console.log(`ECHL roster snapshots processed: ${files.length} team files.`);
} catch (e) { console.warn(`ECHL registry unavailable: ${e.message}`); }

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
      const currentLeague = leagueFromPipeline(leagueRaw);

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
          fullName:name, positionCode, age, currentLeague:leagueName, currentTeam:null, nhlRightsTeam:null,
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
  const draftPickMap = new Map();
  let draftPickConflicts = 0;
  let draftSnapshotDate = "2026-09-28";
  let draftIndexFetched = false;
  const draftIndexUrl = "https://hockeyinsights.ca/data/team_prospects_2026_index.json?v=20260807-season";
  try {
    const draftIndexResponse = await fetch(draftIndexUrl, {
      headers: {"user-agent":"Mozilla/5.0 (compatible; HockeyDynastyDataSync/1.0)","accept":"application/json"},
      signal: AbortSignal.timeout(15000)
    });
    if (!draftIndexResponse.ok) throw new Error(`HTTP ${draftIndexResponse.status}`);
    const draftIndexData = await draftIndexResponse.json();
    draftIndexFetched = true;
    const stamp = draftIndexData.meta?.puckpediaLastUpdated || draftIndexData.meta?.generatedAt || draftIndexData.meta?.generatedLocalDate;
    if (stamp) draftSnapshotDate = String(stamp).slice(0,10);
    for (const club of (draftIndexData.teams || [])) {
      const owner = String(club.key || "");
      if (!teamPipelineSlugs[owner]) continue;
      for (const yearRow of (club.futureDraftCapital?.years || [])) {
        for (const p of (yearRow.picks || [])) {
          const year = Number(p.year || yearRow.year);
          const round = Number(p.round);
          const originalOwner = String(p.originalTeam || "");
          const currentOwner = String(p.projectedTeam || owner);
          const conditional = Boolean(p.conditionText && String(p.conditionText).trim() || p.conditional === true || p.status === "conditional" || p.locked === true);
          if (![2027,2028,2029].includes(year) || round < 1 || round > 7 || !teamPipelineSlugs[originalOwner] || !teamPipelineSlugs[currentOwner]) continue;
          const key = `${year}-${round}-${originalOwner}`;
          const record = {
            year, round, originalOwner, currentOwner, conditional, conflict: false,
            source: draftIndexUrl, snapshotDate: draftSnapshotDate,
            sourceType: "Hockey Insights team_prospects_2026_index.json / PuckPedia snapshot",
            verificationNote: conditional
              ? "La source signale une condition; ce choix est exclu du registre jouable."
              : "Propriétaire du snapshot PuckPedia du 2026-09-28; confirmation avec les transactions plus récentes requise."
          };
          const previous = draftPickMap.get(key);
          if (!previous || conditional) {
            draftPickMap.set(key, conditional ? {...record,currentOwner:null} : record);
          } else if (previous.conditional) {
            continue;
          } else if (previous.currentOwner !== currentOwner) {
            draftPickMap.set(key, {...previous,currentOwner:null,conflict:true,verificationNote:"Conflit entre les clubs dans le snapshot PuckPedia; validation manuelle requise."});
            draftPickConflicts++;
          }
        }
      }
    }
    console.log(`PuckPedia-backed capital index: ${draftIndexData.teams?.length||0} teams; ${draftPickMap.size} unique 2027–2029 base slots; snapshot ${draftSnapshotDate}; ${draftPickConflicts} conflicts.`);
  } catch (error) {
    console.warn(`PuckPedia-backed capital index unavailable: ${error.message}`);
  }
  const draftSnapshotPath = "data/draft-picks/hockey-insights-2027-2029.json";
  const draftSnapshot = {
    schemaVersion: 1,
    source: "Hockey Insights team_prospects_2026_index.json / PuckPedia",
    snapshotDate: draftSnapshotDate,
    pagesFetched: draftIndexFetched ? 32 : 0,
    totalPages: 32,
    picks: [...draftPickMap.values()].sort((a,b)=>a.year-b.year||a.round-b.round||a.originalOwner.localeCompare(b.originalOwner)),
    notes: [
      "PuckPedia-backed snapshot is dated 2026-09-28 and may miss later trades.",
      "Rows from this source remain provisional until reconciled with current NHL transactions.",
      "Conditional picks are excluded from the playable ledger."
    ]
  };
  const serializedDraftSnapshot = JSON.stringify(draftSnapshot,null,2)+"\n";
  const previousDraftSnapshot = await readFile(draftSnapshotPath,"utf8").catch(()=>null);
  if (draftPickMap.size > 0 && previousDraftSnapshot !== serializedDraftSnapshot) {
    await writeFile(draftSnapshotPath,serializedDraftSnapshot,"utf8");
    console.log(`Saved secondary draft-pick snapshot: ${draftPickMap.size} unique slots; ${draftSnapshot.pagesFetched}/32 team records; ${draftPickConflicts} conflicts.`);
  } else {
    console.log(`Secondary draft-pick snapshot: ${draftPickMap.size} unique slots; ${draftSnapshot.pagesFetched}/32 team records; ${draftPickConflicts} conflicts.`);
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
      // Reuse the canonical league classifier so specific European leagues stay filterable.
      const league = leagueFromPipeline(rawLeague);
      const incoming = {
        currentLeague: league,
        currentTeam: str(p.currentTeam),
        nhlRightsTeam: str(first(p.nhlRightsTeam, p.rightsTeam, p.rights_team)),
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
      const hadUnknownLeague=!matching.currentLeague||matching.currentLeague==="UNKNOWN";
      matching.futureDraftEligibility=Number(p.draftYear);
      matching.futureDraftSourceRank=p.sourceRank??null;
      matching.futureDraftSource=p.source||futureDraftData.source||null;
      matching.futureDraftRankType=p.rankType||null;
      matching.futureDraftProfileUrl=p.sourceProfileUrl||matching.futureDraftProfileUrl||null;
      matching.currentTeamSource=p.currentTeamSource||matching.currentTeamSource||null;
      matching.currentLeagueSource=p.currentLeagueSource||matching.currentLeagueSource||null;
      if(hadUnknownLeague&&p.currentLeague&&p.currentLeague!=="UNKNOWN"){
        matching.currentLeague=p.currentLeague;
        matching.currentTeam=matching.currentTeam||str(p.currentTeam);
        matching.leagueResolution="future_draft_source";
      }else if(matching.currentLeague===p.currentLeague&&!matching.currentTeam&&p.currentTeam){
        matching.currentTeam=str(p.currentTeam);
      }
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

// Enrich current league/team fields from the public Hockey Insights per-club prospect export.
// Only explicit league labels are used; the club file itself is not treated as proof of NHL rights.
function leagueFromPipeline(value) {
  const l=String(value||"").trim().toLowerCase();
  if(!l||/unknown|unassigned|not available|^n\/a$/.test(l))return "UNKNOWN";
  if(/\bnhl\b|national hockey league/.test(l))return "NHL";
  if(/\bahl\b|american hockey league/.test(l))return "AHL";
  if(/ncaa|college|university/.test(l))return "NCAA";
  if(/\bohl\b/.test(l))return "OHL";
  if(/\bwhl\b/.test(l))return "WHL";
  if(/qmjhl|lhjmq/.test(l))return "QMJHL";
  if(/\bushl\b/.test(l))return "USHL";
  if(/usntdp|national u17/.test(l))return "USNTDP";
  if(/\bechl\b|east coast hockey league/.test(l))return "ECHL";
  if(/bchl|ajhl|nahl|sjhl|mjhl|cchl|ojhl|league1/.test(l))return "OTHER";
  if(/\bkhl\b|kontinental hockey league/.test(l))return "KHL";
  if(/\bshl\b|swedish hockey league|svenska hockeyligan/.test(l))return "SHL";
  if(/liiga|finnish liiga/.test(l))return "LIIGA";
  if(/icehl|ice hockey league|ebel|austrian ice/.test(l))return "ICEHL";
  if(/\bdel\b|deutsche eishockey liga/.test(l))return "DEL";
  if(/\bnl\b|national league switzerland|swiss national league/.test(l))return "NL";
  if(/czech extraliga|\bextraliga\b|tipsport liga/.test(l))return "CZECH";
  if(/\bvhl\b|supreme hockey league/.test(l))return "VHL";
  if(/allsvenskan/.test(l))return "ALLSVENSKAN";
  if(/mestis/.test(l))return "MESTIS";
  if(/nationell|europe|sweden|finland|swiss|czech|russia|germany|slovakia|latvia|norway|denmark|france|austria|\bmhl\b|\bsl\b/.test(l))return "EUROPE";
  return "OTHER";
}
let pipelineJsonPagesFetched=0,pipelineJsonRows=0,pipelineJsonEnriched=0,pipelineJsonAdded=0,pipelineJsonAmbiguous=0,pipelineJsonUnknown=0;
const pipelineJsonResults=await Promise.all(codes.map(async teamCode=>{
  const url=`https://hockeyinsights.ca/data/team-prospects/${teamCode}.json`;
  try{
    const response=await fetch(url,{headers:{"user-agent":"Mozilla/5.0 (compatible; HockeyDynastyDataSync/1.0)","accept":"application/json"},signal:AbortSignal.timeout(12000)});
    if(!response.ok)throw new Error(`HTTP ${response.status}`);
    return {teamCode,url,data:await response.json(),error:null};
  }catch(error){return {teamCode,url,data:null,error:error.message};}
}));
for(const result of pipelineJsonResults){
  if(result.error)continue;
  const data=result.data;
  const candidates=Array.isArray(data)?data:[data?.prospects,data?.players,data?.rows,data?.records,data?.items,data?.data,data?.team?.prospects].find(Array.isArray)||[];
  if(!Array.isArray(candidates))continue;
  pipelineJsonPagesFetched++;
  for(const p of candidates){
    pipelineJsonRows++;
    const name=nameOf(p)||str(first(p.player_name,p.full_name,p.displayName));
    if(!name)continue;
    const rawLeague=first(p.currentLeague,p.currentLeagueName,p.league,p.leagueName,p.leagueLabel,p.leagueCode,p.teamLeague,p.current_league,p.current_league_name,p.league?.name);
    const league=leagueFromPipeline(rawLeague);
    const currentTeam=str(first(p.currentTeam,p.currentTeamName,p.teamName,p.team_name,p.club,p.clubName,p.currentClub,p.team?.name,p.team?.label));
    const birthDate=str(first(p.birthDate,p.birthdate,p.birth_date));
    const position=posGroup(p);
    const explicitRights=str(first(p.nhlRightsTeam,p.rightsTeam,p.rights_team,p.nhlRightsCode,p.rightsCode));
    const draftYear=Number(first(p.draftYear,p.draft_year,p.yearDrafted));
    let matches=[...records.values()].filter(r=>nameKey(r.name)===nameKey(name));
    if(birthDate){
      const sameBirth=matches.filter(r=>r.birthDate===birthDate&&(!position||!r.position||r.position===position));
      if(sameBirth.length)matches=sameBirth;
    }
    if(matches.length>1&&position){
      const samePosition=matches.filter(r=>!r.position||r.position===position);
      if(samePosition.length)matches=samePosition;
    }
    if(matches.length===1){
      const match=matches[0];
      let changed=false;
      const exactForeign=["KHL","SHL","LIIGA","ICEHL","DEL","NL","CZECH","ECHL"].includes(league);
      const replaceGenericEurope=match.currentLeague==="EUROPE"&&exactForeign;
      const replaceGenericOther=match.currentLeague==="OTHER"&&league==="ECHL";
      if((!match.currentLeague||match.currentLeague==="UNKNOWN"||replaceGenericEurope||replaceGenericOther)&&league!=="UNKNOWN"){
        match.currentLeague=league;match.leagueResolution="hockey_insights_team_prospects_snapshot";changed=true;
        if(currentTeam)match.currentTeam=currentTeam;
      }else if(match.currentLeague===league&&!match.currentTeam&&currentTeam){
        match.currentTeam=currentTeam;changed=true;
      }
      if(!match.birthDate&&birthDate){match.birthDate=birthDate;changed=true;}
      if(!match.position&&position){match.position=position;changed=true;}
      if(!match.draftYear&&Number.isFinite(draftYear)&&draftYear>1900&&draftYear<2100){match.draftYear=draftYear;changed=true;}
      if(!match.nhlRightsTeam&&explicitRights&&codes.includes(explicitRights)){match.nhlRightsTeam=explicitRights;changed=true;}
      if(changed){match.teamPipelineSnapshotDate=data?.meta?.generatedLocalDate||data?.generatedAt||"2026-09-08";match.teamPipelineSource=result.url;pipelineJsonEnriched++;}
      if(league==="UNKNOWN")pipelineJsonUnknown++;
    }else if(matches.length>1){
      pipelineJsonAmbiguous++;
    }else if(league!=="UNKNOWN"){
      const key=nameKey(name);
      add({
        id:`pipeline:${result.teamCode}:${key.replace(/ /g,"-")}`,name,
        firstName:str(first(p.firstName,p.first_name)),lastName:str(first(p.lastName,p.last_name)),
        position,detailedPosition:detailedPos(p),currentLeague:league,currentTeam,
        nhlRightsTeam:explicitRights&&codes.includes(explicitRights)?explicitRights:null,
        rightsStatus:str(first(p.rightsStatus,p.rights_status)),birthDate,
        age:Number.isFinite(Number(p.age))?Number(p.age):null,
        draftYear:Number.isFinite(draftYear)&&draftYear>1900&&draftYear<2100?draftYear:null,
        draftRound:Number.isFinite(Number(first(p.draftRound,p.draft_round)))?Number(first(p.draftRound,p.draft_round)):null,
        draftOverall:Number.isFinite(Number(first(p.draftOverall,p.draft_overall,p.pick)))?Number(first(p.draftOverall,p.draft_overall,p.pick)):null,
        nhlPlayerId:Number.isFinite(Number(first(p.nhlPlayerId,p.nhl_player_id)))?Number(first(p.nhlPlayerId,p.nhl_player_id)):null,
        attributes:null,overall:null,potential:null,source:str(first(p.source,data?.source,result.url)),
        sourceUpdatedAt:str(first(p.sourceUpdatedAt,p.source_updated_at,data?.meta?.generatedLocalDate,data?.generatedAt,now)),
        teamPipelineSnapshotDate:data?.meta?.generatedLocalDate||data?.generatedAt||"2026-09-08"
      });
      pipelineJsonAdded++;
    }
  }
}
console.log(`Hockey Insights team prospect JSON: ${pipelineJsonPagesFetched}/32 team files; ${pipelineJsonRows} rows; ${pipelineJsonEnriched} existing records enriched; ${pipelineJsonAdded} new records; ${pipelineJsonAmbiguous} ambiguous identities; ${pipelineJsonUnknown} source rows without a known league.`);

// Apply auditable, source-backed current league/team corrections to legacy prospect entries.
const manualLeagueCorrections=JSON.parse(await readFile("data/players/manual-league-corrections.json","utf8"));
let manualCorrectionsApplied=0,manualCorrectionsAmbiguous=0,manualCorrectionsAdded=0;
const manualCorrectionsAmbiguousNames=[];
for(const correction of (manualLeagueCorrections.players||[])){
  const names=[correction.name,...(correction.aliases||[])].map(nameKey);
  const allMatches=[...records.values()].filter(p=>names.includes(nameKey(p.name)));
  let matches=allMatches;
  if(correction.playerId){
    const exactId=[...records.values()].filter(p=>String(p.id)===String(correction.playerId));
    if(exactId.length)matches=exactId;
  }
  if(matches.length>1&&correction.birthDate){
    const exactBirth=matches.filter(p=>p.birthDate===correction.birthDate);
    if(exactBirth.length)matches=exactBirth;
  }
  if(matches.length>1&&correction.position){
    const wantedPosition=posGroup(correction)||String(correction.position).toUpperCase();
    const exactPosition=matches.filter(p=>p.position===wantedPosition||p.detailedPosition===String(correction.position).toUpperCase());
    if(exactPosition.length)matches=exactPosition;
  }
  if(matches.length>1&&correction.currentTeam){
    const exactTeam=matches.filter(p=>nameKey(p.currentTeam)===nameKey(correction.currentTeam));
    if(exactTeam.length)matches=exactTeam;
  }
  if(matches.length>1){
    const unresolved=matches.filter(p=>!p.currentLeague||p.currentLeague==="UNKNOWN");
    if(unresolved.length)matches=unresolved;
  }
  if(matches.length===0){
    const manualId=`manual-correction:${nameKey(correction.name).replace(/ /g,"-")}`;
    add({
      id:manualId,name:correction.name,aliases:correction.aliases||[],
      position:posGroup(correction)||String(correction.position||"").toUpperCase()||null,
      currentLeague:correction.currentLeague||"OTHER",currentTeam:correction.currentTeam||null,
      nhlRightsTeam:correction.clearNhlRightsTeam===true?null:(codes.includes(correction.nhlRightsTeam)?correction.nhlRightsTeam:null),
      birthDate:correction.birthDate||null,birthDateSource:correction.birthDateSource||correction.source||"manual-league-corrections",heightCm:correction.heightCm!=null&&Number.isFinite(Number(correction.heightCm))?Number(correction.heightCm):null,weightKg:correction.weightKg!=null&&Number.isFinite(Number(correction.weightKg))?Number(correction.weightKg):null,shootsCatches:correction.shootsCatches||null,currentStatus:correction.currentStatus||null,playable:correction.playable===true,source:correction.source||"manual-league-corrections",
      sourceUpdatedAt:manualLeagueCorrections.verifiedAt||now,
      leagueResolution:"manual_source_verified",manualCorrectionSource:correction.source||null,
      attributes:null,overall:null,potential:null
    });
    manualCorrectionsAdded++;
    continue;
  }
  if(matches.length!==1){
    manualCorrectionsAmbiguous++;
    manualCorrectionsAmbiguousNames.push(correction.name);
    continue;
  }
  const selected=matches[0];
  const wantedPosition=posGroup(correction)||String(correction.position||"").toUpperCase();
  const targets=[selected,...allMatches.filter(p=>p!==selected&&(!p.currentLeague||p.currentLeague==="UNKNOWN")&&(!p.birthDate||!correction.birthDate||p.birthDate===correction.birthDate)&&(!p.position||!wantedPosition||p.position===wantedPosition||p.detailedPosition===String(correction.position||"").toUpperCase()))];
  for(const p of targets){
    if(correction.currentLeague)p.currentLeague=correction.currentLeague;
    if(Object.prototype.hasOwnProperty.call(correction,"currentTeam"))p.currentTeam=correction.currentTeam;
    if(correction.clearNhlRightsTeam===true)p.nhlRightsTeam=null;else if(correction.nhlRightsTeam&&codes.includes(correction.nhlRightsTeam))p.nhlRightsTeam=correction.nhlRightsTeam;
    if(correction.birthDate&&!p.birthDate)p.birthDate=correction.birthDate;if(correction.birthDateSource)p.birthDateSource=correction.birthDateSource;if(correction.heightCm!=null&&Number.isFinite(Number(correction.heightCm)))p.heightCm=Number(correction.heightCm);if(correction.weightKg!=null&&Number.isFinite(Number(correction.weightKg)))p.weightKg=Number(correction.weightKg);if(correction.shootsCatches)p.shootsCatches=correction.shootsCatches;
    if(correction.position&&!p.position)p.position=posGroup(correction)||correction.position;
    if(correction.currentStatus)p.currentStatus=correction.currentStatus;
    if(Object.prototype.hasOwnProperty.call(correction,"playable"))p.playable=correction.playable;
    if(correction.retired)p.retired=true;
    p.currentTeamSource=correction.source||null;
    p.currentLeagueSource=correction.source||null;
    p.leagueResolution="manual_source_verified";
    p.manualCorrectionSource=correction.source||null;
    p.sourceUpdatedAt=manualLeagueCorrections.verifiedAt||p.sourceUpdatedAt||now;
  }
  manualCorrectionsApplied++;
}
console.log(`Manual league corrections: ${manualCorrectionsApplied} existing records updated; ${manualCorrectionsAdded} verified missing records added; ${manualCorrectionsAmbiguous} ambiguous identities (${manualCorrectionsAmbiguousNames.join(", ")}).`);

let manualAliasGroupsMerged=0;
for(const correction of (manualLeagueCorrections.players||[])){
  if(!correction.birthDate||!(correction.aliases||[]).length)continue;
  const aliasNames=new Set([correction.name,...correction.aliases].map(nameKey));
  let group=[...records.values()].filter(p=>aliasNames.has(nameKey(p.name))&&(!p.birthDate||p.birthDate===correction.birthDate));
  group=group.filter(p=>!p.birthDate||p.birthDate===correction.birthDate);
  if(group.length<2)continue;
  const pos=posGroup(correction)||String(correction.position||"").toUpperCase();
  if(pos)group=group.filter(p=>!p.position||p.position===pos||p.detailedPosition===String(correction.position||"").toUpperCase());
  if(group.length<2)continue;
  group.sort((a,b)=>
    Number(b.currentLeague===correction.currentLeague)-Number(a.currentLeague===correction.currentLeague)||
    Number(b.currentTeam===correction.currentTeam)-Number(a.currentTeam===correction.currentTeam)||
    Number(!!b.nhlPlayerId)-Number(!!a.nhlPlayerId)||
    Number(String(b.id).startsWith("nhl:"))-Number(String(a.id).startsWith("nhl:"))
  );
  const primary=group[0];
  primary.name=correction.name;
  primary.birthDate=correction.birthDate;
  if(correction.currentLeague)primary.currentLeague=correction.currentLeague;
  if(correction.currentTeam)primary.currentTeam=correction.currentTeam;
  if(correction.nhlRightsTeam&&codes.includes(correction.nhlRightsTeam))primary.nhlRightsTeam=correction.nhlRightsTeam;
  primary.aliases=[...new Set([...(primary.aliases||[]),...(correction.aliases||[])])];
  primary.manualCorrectionSource=correction.source||primary.manualCorrectionSource||null;
  for(const duplicate of group.slice(1)){
    for(const [key,value] of Object.entries(duplicate)){
      if(primary[key]==null&&value!=null&&!["id","name","currentLeague","currentTeam","nhlRightsTeam","source","attributes","overall","potential"].includes(key))primary[key]=value;
    }
    records.delete(duplicate.id);
    manualAliasGroupsMerged++;
  }
}
console.log(`Manual name aliases merged: ${manualAliasGroupsMerged} duplicate records removed using verified birth dates.`);

const juniorBioLeagueMap={OHL:["OHL","CHL-OHL"],WHL:["WHL","CHL-WHL"],QMJHL:["QMJHL","CHL-QMJHL"],USHL:["USHL"]};
let juniorBioApplied=0,juniorBioAmbiguous=0;
try{
 const juniorBioData=JSON.parse(await readFile("data/players/junior-bio-enrichment.json","utf8"));
 for(const bio of (juniorBioData.players||[])){
  const allowed=juniorBioLeagueMap[bio.league]||[];
  const matches=[...records.values()].filter(p=>nameKey(p.name)===bio.nameKey&&allowed.includes(p.currentLeague));
  if(matches.length!==1){if(matches.length>1)juniorBioAmbiguous++;continue;}
  const p=matches[0];
  if(!p.birthDate)p.birthDate=bio.birthDate;
  p.leaguePlayerId=bio.playerId||p.leaguePlayerId||null;
  p.birthDateSource=bio.sourceUrl;
  p.bioSourceUrl=bio.sourceUrl;
  juniorBioApplied++;
 }
 console.log("Junior HockeyTech biography enrichment: "+juniorBioApplied+" records updated; "+juniorBioAmbiguous+" ambiguous matches.");
}catch(error){console.warn("Junior HockeyTech bio enrichment skipped: "+error.message);}

let ncaaBioApplied=0,ncaaBioAmbiguous=0;
try{
 const ncaaBioData=JSON.parse(await readFile("data/players/ncaa-bio-enrichment.json","utf8"));
 for(const bio of (ncaaBioData.players||[])){
  const matches=[...records.values()].filter(p=>nameKey(p.name)===bio.nameKey&&p.currentLeague==="NCAA");
  if(matches.length!==1){if(matches.length>1)ncaaBioAmbiguous++;continue;}
  const p=matches[0];
  if(!p.birthDate)p.birthDate=bio.birthDate;
  if(bio.recordType==="roster"&&bio.currentTeam)p.currentTeam=bio.currentTeam;
  if(bio.recordType==="recruit"&&bio.committedTeam)p.committedTeam=bio.committedTeam;
  p.birthDateSource=bio.sourceUrl;
  p.bioSourceUrl=bio.sourceUrl;
  ncaaBioApplied++;
 }
 console.log("NCAA College Hockey News biography enrichment: "+ncaaBioApplied+" records updated; "+ncaaBioAmbiguous+" ambiguous matches.");
}catch(error){console.warn("NCAA biography enrichment skipped: "+error.message);}

let futureDraftBioApplied=0,futureDraftBioAmbiguous=0;
try{
 const futureDraftData=JSON.parse(await readFile("data/players/future-draft-bio-enrichment.json","utf8"));
 for(const bio of (futureDraftData.players||[])){
  const matches=[...records.values()].filter(p=>nameKey(p.name)===bio.nameKey);
  if(matches.length!==1){if(matches.length>1)futureDraftBioAmbiguous++;continue;}
  const p=matches[0];
  if(!p.birthDate&&bio.birthDate)p.birthDate=bio.birthDate;
  if(!p.birthYear&&bio.birthYear)p.birthYear=bio.birthYear;
  p.birthDateSource=bio.sourceUrl||bio.profileUrl||bio.hubUrl;
  p.bioSourceUrl=bio.sourceUrl||bio.profileUrl||bio.hubUrl;
  p.draftEligibilityYear=bio.draftYear;
  if(bio.currentTeam)p.currentTeam=bio.currentTeam;
  if(bio.currentLeague)p.currentLeague=bio.currentLeague;
  futureDraftBioApplied++;
 }
 console.log("Future draft Elite Prospects biography enrichment: "+futureDraftBioApplied+" records updated; "+futureDraftBioAmbiguous+" ambiguous matches.");
}catch(error){console.warn("Future draft biography enrichment skipped: "+error.message);}

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

// Preserve the shared schema without implying that a missing scouting grade is known.
let unratedPlayers = 0;
for (const p of records.values()) {
  p.attributes = p.attributes ? normalizeRatings(p.attributes) : emptyRatings();
  if (p.overall == null && p.attributes.OA != null) p.overall = p.attributes.OA;
  if (!hasAnyRating(p.attributes)) {
    p.overall = null;
    p.ratingStatus = "unrated";
    p.ratingSource = null;
    p.ratingConfidence = "none";
    unratedPlayers++;
  } else {
    p.ratingStatus ||= "source_unverified";
    p.ratingSource ||= "Source not recorded";
    p.ratingConfidence ||= "unknown";
    p.ratedAttributes ||= Object.keys(p.attributes).filter(key => p.attributes[key] != null);
  }
}
console.log(`Registry ratings: ${records.size - unratedPlayers} with at least one sourced or retained rating; ${unratedPlayers} explicitly unrated.`);

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
  p.potential = p.potentialEstimate;
  p.potentialStatus = "provisional_model_estimate";
  p.potentialEstimateMethod = "overall_plus_age_growth_band_v1; not source-verified";
  potentialEstimates++;
}
console.log(`Potential ratings assigned to ${potentialEstimates} records using a labelled provisional age-growth model; source-verified potential remains unchanged.`);


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
  description: "Unified player registry built from source snapshots. Ratings are present only when a source or explicitly labelled estimate exists; potential is a separate field.",
  counts, playerCount: players.length, players,
  ratingsMetadata: { season: ratingSeason || null, source: ratingData.source || null, playersAvailable: Object.keys(ratingMap).length, method: "sample-adjusted statistical estimates; not scouting grades", attributes: ["FI","SH","PL","ST","CH","PO","HI","SK","EN","PE","FA","LE","SR","OFF","DEF","OA"] },
  requiredFields: ["id","name","position","currentLeague","currentTeam","nhlRightsTeam"],
  optionalFields: ["birthDate","contractTeam","contractEnd","potential","source","verifiedAt"],
  leagues: ["NHL","AHL","CHL","NCAA","EUROPE","OTHER","UNKNOWN"],
  status: "generated_from_available_source_snapshots",
  dataNotes: [
    "NHL roster membership is assigned to the NHL team shown in the official roster snapshot.",
    "AHL affiliation does not establish NHL contract or rights ownership; nhlRightsTeam stays null unless the source explicitly states it.",
    "NHL public prospect lists may be incomplete or empty for some organizations; absence is not proof of missing rights.",
    "Source ratings are imported only when an NHL player ID matches data/ratings.json; missing ratings stay null and are labelled unrated.",
    "AHL player statistics are stored separately as raw statistics and are not converted into unsupported scouting attributes.",
    "Potential without a source is assigned a provisional age-growth estimate; unverified contracts and draft-pick ownership are never fabricated."
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
