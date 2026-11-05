import { RATING_ATTRIBUTES, normalizeRatings } from "./player-ratings.mjs";

const clamp = value => Math.max(0, Math.min(99, Math.round(Number.isFinite(value) ? value : 50)));
const numeric = (row, ...keys) => {
  for (const key of keys) {
    const value = row?.[key];
    if (value !== null && value !== undefined && value !== "" && Number.isFinite(Number(value))) return Number(value);
  }
  return 0;
};
const normalizedName = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
export function statNameKey(value) {
  const name = String(value || "").trim();
  const ordered = name.includes(",") ? name.split(",").slice(1).join(" ") + " " + name.split(",")[0] : name;
  return normalizedName(ordered);
}

const LEAGUE_BASE = {
  NHL:76, AHL:66, ECHL:51, NCAA:59, OHL:56, WHL:56, QMJHL:56, USHL:52,
  KHL:68, SHL:66, LIIGA:65, ALLSVENSKAN:60, DEL:62, NL:64, VHL:59,
  MHL:53, "U20 NATIONELL":57, EUROPE:60, CZECH:61, NORWAY:57, OTHER:52, UNKNOWN:48
};
const LEAGUE_ALIASES = {
  "CHL-QMJHL":"QMJHL", "CHL-OHL":"OHL", "CHL-WHL":"WHL", CHL:"OHL", USNTDP:"USHL"
};
const RATING_REFERENCE_DATE = new Date();
const leagueKey = value => {
  const code = String(value || "OTHER").toUpperCase();
  return LEAGUE_ALIASES[code] || code;
};
const playerAge = player => {
  const age = numeric(player, "age");
  if (age > 0) return age;
  const date = player?.birthDate || player?.dateOfBirth;
  if (!date) return 0;
  const parsed = new Date(String(date).slice(0, 10) + "T00:00:00Z");
  if (!Number.isFinite(parsed.getTime())) return 0;
  const today = RATING_REFERENCE_DATE;
  let years = today.getUTCFullYear() - parsed.getUTCFullYear();
  if (today.getUTCMonth() < parsed.getUTCMonth() || (today.getUTCMonth() === parsed.getUTCMonth() && today.getUTCDate() < parsed.getUTCDate())) years--;
  return years;
};
const positionGroup = player => {
  const value = String(player?.detailedPosition || player?.position || player?.positionCode || "F").toUpperCase();
  if (["G", "GOALIE", "GOALTENDER"].includes(value)) return "G";
  if (["D", "DEFENSE", "DEFENCEMAN", "DEFENSEMAN"].includes(value)) return "D";
  if (["", "?", "UNKNOWN", "UNK"].includes(value)) return "U";
  return "F";
};
const percentile = (values, value, inverse = false) => {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length || !Number.isFinite(value)) return 0.5;
  let low = 0, high = sorted.length;
  while (low < high) {
    const middle = (low + high) >> 1;
    if (sorted[middle] <= value) low = middle + 1;
    else high = middle;
  }
  const result = low / sorted.length;
  return inverse ? 1 - result : result;
};
const centered = (value, weight) => 0.5 + (value - 0.5) * weight;
const parseNameId = player => String(player?.id || "").match(/^(?:ahl|echl):(\d+)$/i)?.[1] || null;

export function createLeagueStatIndex(payload) {
  const rows = [...(payload?.skaters || []), ...(payload?.goalies || [])];
  const byId = new Map();
  const byName = new Map();
  for (const row of rows) {
    const id = String(row.player_id ?? row.playerId ?? "");
    if (id) byId.set(id, row);
    const name = statNameKey(row.name ?? row.full_name ?? row.shortname);
    if (name) {
      if (!byName.has(name)) byName.set(name, []);
      byName.get(name).push(row);
    }
  }
  const skaters = payload?.skaters || [];
  const goalies = payload?.goalies || [];
  const distribution = list => ({
    points: list.map(row => numeric(row, "points", "PTS") / Math.max(1, numeric(row, "games_played", "gamesPlayed", "GP"))),
    goals: list.map(row => numeric(row, "goals", "G") / Math.max(1, numeric(row, "games_played", "gamesPlayed", "GP"))),
    assists: list.map(row => numeric(row, "assists", "A") / Math.max(1, numeric(row, "games_played", "gamesPlayed", "GP"))),
    shots: list.map(row => numeric(row, "shots", "S") / Math.max(1, numeric(row, "games_played", "gamesPlayed", "GP"))),
    plusMinus: list.map(row => numeric(row, "plus_minus", "plusMinus") / Math.sqrt(Math.max(1, numeric(row, "games_played", "gamesPlayed", "GP")))),
    pim: list.map(row => numeric(row, "penalty_minutes", "pim") / Math.max(1, numeric(row, "games_played", "gamesPlayed", "GP"))),
    games: list.map(row => numeric(row, "games_played", "gamesPlayed", "GP")),
    save: list.map(row => numeric(row, "save_percentage", "savePctg", "savePercentage")),
    gaa: list.map(row => numeric(row, "goals_against_average", "goalsAgainstAverage", "gaa")),
    wins: list.map(row => numeric(row, "wins", "W")),
    shutouts: list.map(row => numeric(row, "shutouts", "SO"))
  });
  return { league:payload?.league || "UNKNOWN", source:payload?.source || null, season:payload?.season || null, byId, byName, skaters:distribution(skaters), goalies:distribution(goalies) };
}

const nameSignature = value => {
  const parts = statNameKey(value).split(" ").filter(Boolean);
  while (["jr","sr","ii","iii","iv"].includes(parts.at(-1))) parts.pop();
  if (parts.length < 2) return null;
  return { initial:parts[0][0], last:parts.at(-1) };
};

export function matchLeagueStats(player, index) {
  if (!index) return null;
  const id = parseNameId(player);
  if (id && index.byId.has(id)) return index.byId.get(id);
  const candidates = index.byName.get(statNameKey(player?.name)) || [];
  if (candidates.length === 1) return candidates[0];
  const position = positionGroup(player);
  if (candidates.length > 1) {
    const matching = candidates.filter(row => (positionGroup({ position:row.position || row.positionCode }) === position));
    if (matching.length === 1) return matching[0];
  }

  // Official feeds sometimes abbreviate or expand first names (e.g. "J.P.
  // Hurlbert" vs "Jeffrey JP Hurlbert"). Accept only a unique first-initial +
  // full-surname match, with a compatible position; never guess among twins.
  const signature = nameSignature(player?.name);
  if (!signature || signature.last.length < 4) return null;
  const rows = [...new Set([...index.byName.values()].flat())];
  const signatureMatches = rows.filter(row => {
    const candidate = nameSignature(row.name ?? row.full_name ?? row.shortname);
    return candidate && candidate.initial === signature.initial && candidate.last === signature.last;
  });
  if (signatureMatches.length === 1) {
    const candidatePosition = positionGroup({ position:signatureMatches[0].position || signatureMatches[0].positionCode });
    return position === "U" || candidatePosition === "U" || candidatePosition === position ? signatureMatches[0] : null;
  }
  if (signatureMatches.length > 1 && position !== "U") {
    const matching = signatureMatches.filter(row => positionGroup({ position:row.position || row.positionCode }) === position);
    if (matching.length === 1) return matching[0];
  }
  return null;
}

function rankSignal(player) {
  const draftPick = numeric(player, "draftOverall", "draftPosition", "overallPick");
  if (draftPick > 0) return { score:clamp(94 - 13 * Math.log(draftPick)), kind:"draft_pick" };
  const sourceRank = numeric(player, "futureDraftSourceRank", "sourceRank", "prospectRank", "rank");
  if (sourceRank > 0) return { score:clamp(88 - 11 * Math.log(sourceRank)), kind:"published_source_rank" };
  const round = numeric(player, "draftRound");
  if (round > 0) return { score:clamp(80 - (round - 1) * 6), kind:"draft_round" };
  return { score:null, kind:null };
}

function sizeSignal(player) {
  const height = numeric(player, "heightCm", "heightInCentimeters");
  const weight = numeric(player, "weightKg", "weightInKilograms");
  const components = [];
  if (height > 0) components.push(Math.max(0, Math.min(1, (height - 165) / 35)));
  if (weight > 0) components.push(Math.max(0, Math.min(1, (weight - 60) / 50)));
  return components.length ? components.reduce((sum, value) => sum + value, 0) / components.length : 0.5;
}

function profileOverall(player, existing, league) {
  const position = positionGroup(player);
  const current = normalizeRatings(existing);
  const knownOa = player?.overall;
  if (knownOa != null && knownOa !== "" && Number.isFinite(Number(knownOa))) return clamp(Number(knownOa));
  const base = LEAGUE_BASE[league] ?? 53;
  // Current ability must not be inflated by draft pedigree, body measurements,
  // salary, or cap hit. Those are not direct measures of on-ice skill.
  const age = playerAge(player);
  const maturity = age > 0 ? (age < 18 ? -3 : age < 21 ? -1 : age < 25 ? 1 : age < 31 ? 2 : 0) : 0;
  const leagueSignal = (LEAGUE_BASE[league] ?? 53) - 55;
  return clamp(base + maturity + leagueSignal * 0.2);
}

function statsProfile(player, row, index) {
  if (!row || !index) return null;
  const position = positionGroup(player);
  const goalie = position === "G" || row.save_percentage != null || row.savePctg != null;
  const games = Math.max(0, numeric(row, "games_played", "gamesPlayed", "GP"));
  const sampleWeight = Math.min(1, Math.sqrt(games / (goalie ? 20 : 30)));
  const distributions = goalie ? index.goalies : index.skaters;
  if (goalie) {
    const sv = numeric(row, "save_percentage", "savePctg", "savePercentage");
    const gaa = numeric(row, "goals_against_average", "goalsAgainstAverage", "gaa");
    const svPct = centered(percentile(distributions.save, sv), sampleWeight);
    const gaaPct = centered(percentile(distributions.gaa, gaa, true), sampleWeight);
    const gpPct = centered(percentile(distributions.games, games), sampleWeight);
    const winsPct = centered(percentile(distributions.wins, numeric(row, "wins", "W")), sampleWeight);
    const shutoutsPct = centered(percentile(distributions.shutouts, numeric(row, "shutouts", "SO")), sampleWeight);
    return { goalie:true, games, sampleWeight, score:clamp(40 + svPct * 32 + gaaPct * 20 + gpPct * 4 + winsPct * 3 + shutoutsPct), save:svPct, goalsAgainst:gaaPct, workload:gpPct, wins:winsPct, shutouts:shutoutsPct, goals:svPct, assists:gaaPct, points:svPct, shots:svPct, plusMinus:gaaPct, discipline:gpPct, durability:gpPct };
  }
  const gp = Math.max(1, games);
  const rates = {
    points:numeric(row, "points", "PTS") / gp,
    goals:numeric(row, "goals", "G") / gp,
    assists:numeric(row, "assists", "A") / gp,
    shots:numeric(row, "shots", "S") / gp,
    plusMinus:numeric(row, "plus_minus", "plusMinus") / Math.sqrt(gp),
    pim:numeric(row, "penalty_minutes", "pim") / gp
  };
  const pointPct = centered(percentile(distributions.points, rates.points), sampleWeight);
  const goalPct = centered(percentile(distributions.goals, rates.goals), sampleWeight);
  const assistPct = centered(percentile(distributions.assists, rates.assists), sampleWeight);
  const shotPct = centered(percentile(distributions.shots, rates.shots), sampleWeight);
  const plusPct = centered(percentile(distributions.plusMinus, rates.plusMinus), sampleWeight);
  const disciplinePct = centered(percentile(distributions.pim, rates.pim, true), sampleWeight);
  const gamesPct = centered(percentile(distributions.games, games), sampleWeight);
  const attack = 0.48 * pointPct + 0.28 * goalPct + 0.24 * assistPct;
  const defense = 0.55 * plusPct + 0.25 * gamesPct + 0.2 * disciplinePct;
  const statOverall = clamp(40 + (attack * 0.64 + defense * 0.36) * 40 + (LEAGUE_BASE[index.league] ?? 55) * 0.18);
  return { goalie:false, games, sampleWeight, score:statOverall, goals:goalPct, assists:assistPct, points:pointPct, shots:shotPct, plusMinus:plusPct, discipline:disciplinePct, durability:gamesPct, attack, defense };
}

export function combineLeagueStatRows(currentRow, previousRow) {
  if (!currentRow || !previousRow) return currentRow || previousRow || null;
  const currentGames = Math.max(0,numeric(currentRow,"games_played","gamesPlayed","GP"));
  const previousGames = Math.max(0,numeric(previousRow,"games_played","gamesPlayed","GP"));
  const totalGames = currentGames + previousGames;
  if (!totalGames) return currentRow;
  const combined = { ...previousRow, ...currentRow, games_played:totalGames };
  for (const fields of [
    ["goals","G"],["assists","A"],["points","PTS"],["shots","SOG","shots_on_goal"],
    ["plus_minus","plusMinus"],["penalty_minutes","pim"],["wins","W"],["saves","SV"],
    ["shots_against","shotsAgainst"],["goals_against","GA"],["shutouts","SO"]
  ]) {
    const key = fields[0];
    const total = numeric(currentRow,...fields) + numeric(previousRow,...fields);
    if (currentRow[key] != null || previousRow[key] != null || key === "points") combined[key] = total;
  }
  const goalie = currentRow.save_percentage != null || previousRow.save_percentage != null ||
    currentRow.savePctg != null || previousRow.savePctg != null;
  if (goalie) {
    const shotsAgainst = numeric(currentRow,"shots_against","shotsAgainst") + numeric(previousRow,"shots_against","shotsAgainst");
    const saves = numeric(currentRow,"saves","SV") + numeric(previousRow,"saves","SV");
    combined.save_percentage = shotsAgainst > 0 ? saves / shotsAgainst * 100 :
      (numeric(currentRow,"save_percentage","savePctg") * currentGames + numeric(previousRow,"save_percentage","savePctg") * previousGames) / totalGames;
    combined.goals_against_average = (numeric(currentRow,"goals_against_average","gaa") * currentGames +
      numeric(previousRow,"goals_against_average","gaa") * previousGames) / totalGames;
  }
  combined.games_played = totalGames;
  return combined;
}

export function estimatePlayerRatings(player, statRow, statIndex, existingRatings = null) {
  const league = leagueKey(player?.currentLeague || player?.league);
  const position = positionGroup(player);
  const existing = normalizeRatings(existingRatings || player?.attributes);
  const profileBase = profileOverall(player, existing, league);
  const stat = statsProfile(player, statRow, statIndex);
  const hasKnownOverall = existing.OA != null || (player?.overall != null && player?.overall !== "" && Number.isFinite(Number(player.overall)));
  const overall = hasKnownOverall ? profileBase : (stat?.score ?? profileBase);

  // Without performance/scouting evidence, do not translate draft rank into
  // invented offensive skill. Keep the estimate neutral and low-confidence.
  const attack = stat?.attack ?? 0.5;
  const defense = stat?.defense ?? (position === "D" ? 0.62 : position === "G" ? 0.7 : 0.48);
  const goals = stat?.goals ?? attack;
  const assists = stat?.assists ?? attack;
  const points = stat?.points ?? attack;
  const shots = stat?.shots ?? (0.45 * attack + 0.55 * goals);
  const discipline = stat?.discipline ?? 0.5;
  const durability = stat?.durability ?? (playerAge(player) > 25 ? 0.58 : 0.45);
  const isForward = position === "F";
  const isGoalie = position === "G";
  // Body measurements are descriptive metadata, not skating/strength grades.
  const sizeScore = 0.5;
  const fightEvidence = statRow || player || {};
  const directFightRating = numeric(fightEvidence, "fightingSkill", "fightRating");
  const fightCount = numeric(fightEvidence, "fightsPerSeason", "fightingMajors", "fights");
  const goalieSave = stat?.goalie ? stat.save : 0.5;
  const goalieGaa = stat?.goalie ? stat.goalsAgainst : 0.5;
  const goalieWorkload = stat?.goalie ? stat.workload : 0.5;
  const goalieWins = stat?.goalie ? stat.wins : 0.5;
  const goalieShutouts = stat?.goalie ? stat.shutouts : 0.5;
  const modeled = {
    // FI is Fighting only; it is independent of OA and never inferred from PIM.
    FI:clamp(directFightRating > 0 ? directFightRating : fightCount > 0 ? 20 + Math.min(79, fightCount * 12) : 10),
    SH:clamp(isGoalie ? 35 + goalieSave * 48 : overall + (goals - 0.5) * 22 + (isForward ? 3 : position === "D" ? -5 : 0)),
    PL:clamp(isGoalie ? 35 + goalieGaa * 45 : overall + (assists - 0.5) * 22 + (isForward ? 2 : position === "D" ? -2 : 0)),
    ST:clamp(isGoalie ? 35 + goalieSave * 42 : overall + (sizeScore - 0.5) * 22 + (position === "D" ? 3 : 0)),
    CH:clamp(isGoalie ? 35 + goalieWorkload * 48 : overall + (defense - 0.5) * 18 + (position === "D" ? 4 : -1)),
    PO:clamp(isGoalie ? 35 + goalieGaa * 48 : overall + (defense - 0.5) * 16),
    HI:clamp(isGoalie ? 35 + goalieShutouts * 48 : overall + (sizeScore - 0.5) * 24 + (position === "D" ? 4 : 0)),
    SK:clamp(isGoalie ? 35 + goalieWorkload * 44 : overall + (points - 0.5) * 10 - (sizeScore - 0.5) * 5),
    EN:clamp(isGoalie ? 35 + goalieWorkload * 48 : overall + (durability - 0.5) * 14),
    PE:clamp(isGoalie ? 35 + goalieSave * 46 : overall + (discipline - 0.5) * 14),
    FA:clamp(isGoalie ? 35 + goalieWins * 44 : overall + (isForward ? 1 : position === "D" ? -3 : 0) + (position === "F" && player?.detailedPosition === "C" ? 4 : 0)),
    LE:clamp(isGoalie ? 35 + goalieWins * 46 : overall + (durability - 0.5) * 9),
    SR:clamp(isGoalie ? 35 + goalieShutouts * 48 : overall + (durability - 0.5) * 13 + (defense - 0.5) * 5),
    OFF:clamp(isGoalie ? 35 + goalieSave * 45 : 40 + attack * 48 + (isForward ? 3 : -3)),
    DEF:clamp(isGoalie ? 35 + goalieGaa * 50 : 42 + defense * 45 + (position === "D" ? 4 : 0)),
    OA:overall
  };
  // Goalies still receive all 16 card attributes; these are goalie-specific
  // performance proxies mapped onto the shared card fields. FI stays separate.
  const oaWeights = { SH:0.08, PL:0.08, ST:0.05, CH:0.08, PO:0.10, HI:0.05, SK:0.06, EN:0.08, PE:0.08, FA:0.03, LE:0.05, SR:0.08, OFF:0.10, DEF:0.08 };
  const attributes = Object.fromEntries(RATING_ATTRIBUTES.map(key => [key, existing[key] ?? modeled[key]]));
  // OFF and DEF are derived card attributes, never independent imported ratings.
  // Keep the shared 0-99 scale by averaging their three component attributes.
  attributes.OFF = clamp((attributes.SH + attributes.PL + attributes.ST) / 3);
  attributes.DEF = clamp((attributes.CH + attributes.PO + attributes.HI) / 3);
  const oaWeightTotal = Object.values(oaWeights).reduce((sum, weight) => sum + weight, 0);
  const calculatedOa = clamp(Object.entries(oaWeights).reduce((sum, [key, weight]) => sum + attributes[key] * weight, 0) / oaWeightTotal);
  // Never preserve a stale imported OA: it is always derived from the 14 non-FI attributes.
  attributes.OA = calculatedOa;
  const sources = [...new Set([statIndex?.source, player?.source, player?.supplementalSource, player?.bioSourceUrl].filter(value => typeof value === "string" && value.trim()))];
  const modeledFields = RATING_ATTRIBUTES.filter(key => existing[key] == null);
  const evidence = statRow ? "league_statistics" : "minimal_player_profile";
  const confidence = statRow ? "low" : evidence === "minimal_player_profile" ? "very_low" : "very_low";
  const status = statRow ? "model_estimate_from_league_statistics" : evidence === "minimal_player_profile" ? "minimal_profile_model_estimate" : "model_estimate_from_player_profile";
  const sampleSize = stat?.games ?? null;
  const sampleConfidence = sampleSize == null ? null : sampleSize >= 30 ? "high" : sampleSize >= 12 ? "medium" : "low";
  return {
    attributes,
    overall:attributes.OA,
    metadata:{
      source:sources.join(" | ") || "Hockey Dynasty profile model; no external rating source",
      confidence, sampleConfidence, sampleSize, status,
      method:"cross_league_profile_model_v5_derived_off_def_fighting_excluded_goalie_complete_attributes",
      evidence,
      modeledAttributes:modeledFields,
      ratedAttributes:RATING_ATTRIBUTES.slice(),
      season:statIndex?.season || "2026-2027"
    }
  };
}

export function estimatePlayerPotential(player, overall = player?.overall) {
  const current = Number(overall);
  if (!Number.isFinite(current)) return { value:null, status:"unavailable", method:"no_current_overall" };
  const age = playerAge(player);
  const growth = age > 0
    ? (age <= 17 ? 22 : age === 18 ? 20 : age === 19 ? 17 : age === 20 ? 14 :
      age === 21 ? 11 : age === 22 ? 8 : age === 23 ? 6 : age === 24 ? 4 :
      age === 25 ? 2 : age <= 27 ? 1 : 0)
    : 6;
  const rank = rankSignal(player);
  const rankWeight = age > 0 && age <= 18 ? 0.24 : age <= 21 && age > 0 ? 0.18 : age <= 24 && age > 0 ? 0.10 : 0;
  const rankAdjustment = rank.score == null ? 0 : Math.max(0, rank.score - current) * rankWeight;
  const stats = player?.potentialStats || null;
  const games = numeric(stats, "games_played", "gamesPlayed", "GP");
  const position = positionGroup(player);
  let productionAdjustment = 0;
  let productionEvidence = null;
  if (age > 0 && age <= 23 && stats && games >= 10) {
    if (position === "G") {
      let sv = numeric(stats, "save_percentage", "savePercentage", "SVPCT");
      if (sv > 1) sv /= 100;
      if (sv >= 0.915) productionAdjustment = 2;
      else if (sv >= 0.900) productionAdjustment = 1;
      productionEvidence = "goalie_save_percentage";
    } else {
      const points = numeric(stats, "points", "PTS") || (numeric(stats, "goals", "G") + numeric(stats, "assists", "A"));
      const ppg = points / games;
      const league = leagueKey(player?.potentialLeague || player?.currentLeague || player?.league);
      const thresholds = ["OHL","WHL","QMJHL","USHL"].includes(league) ? [0.90,1.25,1.60]
        : ["AHL","ECHL"].includes(league) ? [0.45,0.70,0.95]
        : league === "NCAA" ? [0.40,0.65,0.90] : [0.35,0.60,0.85];
      productionAdjustment = ppg >= thresholds[2] ? 3 : ppg >= thresholds[1] ? 2 : ppg >= thresholds[0] ? 1 : 0;
      productionEvidence = "league_points_per_game";
    }
  }
  const hasSignal = rank.score != null || productionEvidence != null;
  return {
    value:clamp(Math.max(current, current + growth + rankAdjustment + productionAdjustment)),
    status:"provisional_model_estimate",
    method:"age_curve_current_ability_draft_rank_and_league_production_projection_v5; provisional_not_source_verified",
    evidence:[rank.kind, productionEvidence].filter(Boolean).join("+") || "current_ability_and_age",
    confidence:hasSignal ? "low" : "very_low"
  };
}

export function matchStatIndex(player, indexes, { allowCrossLeague = false } = {}) {
  const league = leagueKey(player?.currentLeague || player?.league);
  const preferred = indexes.get(league);
  const preferredList = Array.isArray(preferred) ? preferred : preferred ? [preferred] : [];
  const preferredMatches = [];
  for (const index of preferredList) {
    const row = matchLeagueStats(player, index);
    if (row) preferredMatches.push({ index, row });
  }
  if (preferredMatches.length) return { ...preferredMatches[0], additionalMatches:preferredMatches.slice(1) };
  // NHL prospect and secondary roster feeds often omit the player's current
  // league. Search every official feed by exact normalized name/ID, but accept
  // a fallback only when exactly one league has an unambiguous player match.
  if (!["UNKNOWN", "OTHER"].includes(league) && !allowCrossLeague) return { index:preferredList[0] || null, row:null };
  const matches = [];
  for (const [key, value] of indexes.entries()) {
    if (key === league) continue;
    const list = Array.isArray(value) ? value : [value];
    const found = [];
    for (const index of list) {
      const row = matchLeagueStats(player, index);
      if (row) found.push({ index, row });
    }
    if (found.length) matches.push({ ...found[0], additionalMatches:found.slice(1) });
  }
  return matches.length === 1 ? matches[0] : { index:preferredList[0] || null, row:null };
}
