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
  const p0 = String(first(p.positionCode, p.position, p.positionGroup, p.position_name, "")).toUpperCase();
  if (["G","GOALIE","GOALTENDER"].includes(p0)) return "G";
  if (["D","DEFENSE","DEFENCEMAN","DEFENSEMAN"].includes(p0)) return "D";
  if (["F","C","L","R","LW","RW","W","FORWARD","CENTRE","CENTER"].includes(p0)) return "F";
  return null;
};
const detailedPos = p => {
  const p0 = String(first(p.positionCode, p.position, p.position_name, "")).toUpperCase();
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
      const id = sourceId ? `nhl:${sourceId}` : matchingRecords.length === 1 ? matchingRecords[0].id : `prospect:${code}:${nameKey(name).replace(/ /g,"-")}`;
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
        nhlRightsTeam: str(first(p.nhlRightsTeam,p.rightsTeam,p.rights_team,code)),
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

const players = [...records.values()].sort((a,b) => a.name.localeCompare(b.name,"en"));
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
    "Attributes and overall ratings are imported only when an NHL player ID matches data/ratings.json; they are sample-adjusted estimates, not scouting grades.",
    "Potential, unverified contracts and draft-pick ownership are not fabricated."
  ]
};
await writeFile("data/players/registry.json", JSON.stringify(output,null,2)+"\n", "utf8");
console.log(`Player registry: ${players.length} records; ${JSON.stringify(counts)}`);
