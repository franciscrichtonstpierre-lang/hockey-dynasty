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
  MHL:53, EUROPE:60, CZECH:61, NORWAY:57, OTHER:52, UNKNOWN:48
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
    gaa: list.map(row => numeric(row, "goals_against_average", "goalsAgainstAverage", "gaa"))
  });
  return { league:payload?.league || "UNKNOWN", source:payload?.source || null, season:payload?.season || null, byId, byName, skaters:distribution(skaters), goalies:distribution(goalies) };
}

export function matchLeagueStats(player, index) {
  if (!index) return null;
  const id = parseNameId(player);
  if (id && index.byId.has(id)) return index.byId.get(id);
  const candidates = index.byName.get(statNameKey(player?.name)) || [];
  if (candidates.length === 1) return candidates[0];
  if (candidates.length > 1) {
    const position = positionGroup(player);
    const matching = candidates.filter(row => (positionGroup({ position:row.position || row.positionCode }) === position));
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
  const knownOa = current.OA ?? player?.overall;
  if (knownOa != null && knownOa !== "" && Number.isFinite(Number(knownOa))) return clamp(Number(knownOa));
  const base = LEAGUE_BASE[league] ?? 53;
  const rank = rankSignal(player);
  const age = playerAge(player);
  const pickOffset = rank.score == null ? 0 : (rank.score - 60) * 0.32;
  const maturity = age > 0 ? (age < 18 ? -3 : age < 21 ? -1 : age < 25 ? 1 : age < 31 ? 2 : 0) : 0;
  const size = sizeSignal(player);
  const sizeOffset = (size - 0.5) * (position === "G" ? 5 : position === "D" ? 4 : 2);
  const previousCapHit = numeric(player, "previousCapHit", "previousSalary", "annualSalary");
  const salarySignal = previousCapHit > 0 ? Math.max(-4, Math.min(6, (Math.log10(previousCapHit) - 6) * 3)) : 0;
  const leagueSignal = (LEAGUE_BASE[league] ?? 53) - 55;
  return clamp(base + pickOffset + maturity + sizeOffset + salarySignal + leagueSignal * 0.2);
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
    return { goalie:true, games, sampleWeight, score:clamp(42 + svPct * 28 + gaaPct * 17 + gpPct * 10), goals:svPct, assists:gaaPct, points:svPct, shots:svPct, plusMinus:gaaPct, discipline:gpPct, durability:gpPct };
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

export function estimatePlayerRatings(player, statRow, statIndex, existingRatings = null) {
  const league = leagueKey(player?.currentLeague || player?.league);
  const position = positionGroup(player);
  const existing = normalizeRatings(existingRatings || player?.attributes);
  const profileBase = profileOverall(player, existing, league);
  const stat = statsProfile(player, statRow, statIndex);
  const hasKnownOverall = existing.OA != null || (player?.overall != null && player?.overall !== "" && Number.isFinite(Number(player.overall)));
  const overall = hasKnownOverall ? profileBase : (stat?.score ?? profileBase);
  const size = sizeSignal(player);
  const rank = rankSignal(player);
  const attack = stat?.attack ?? (rank.score == null ? 0.5 : Math.max(0.05, Math.min(0.95, 0.5 + (rank.score - 60) / 80)));
  const defense = stat?.defense ?? (position === "D" ? 0.62 : position === "G" ? 0.7 : 0.48);
  const goals = stat?.goals ?? attack;
  const assists = stat?.assists ?? attack;
  const points = stat?.points ?? attack;
  const shots = stat?.shots ?? (0.45 * attack + 0.55 * goals);
  const discipline = stat?.discipline ?? (0.5 + size * 0.05);
  const durability = stat?.durability ?? (playerAge(player) > 25 ? 0.58 : 0.45);
  const isForward = position === "F";
  const isGoalie = position === "G";
  const sizeScore = 0.5 + (size - 0.5) * 0.8;
  const modeled = {
    FI:clamp(overall + (isForward ? 1 : position === "D" ? -2 : 0) + (assists - 0.5) * 12),
    SH:clamp(overall + (goals - 0.5) * 22 + (isForward ? 3 : position === "D" ? -5 : 0) - (isGoalie ? 18 : 0)),
    PL:clamp(overall + (assists - 0.5) * 22 + (isForward ? 2 : position === "D" ? -2 : 0) - (isGoalie ? 18 : 0)),
    ST:clamp(overall + (sizeScore - 0.5) * 22 + (position === "D" ? 3 : 0)),
    CH:clamp(overall + (defense - 0.5) * 18 + (position === "D" ? 4 : -1)),
    PO:clamp(overall + (defense - 0.5) * 16 + (isGoalie ? 7 : 0)),
    HI:clamp(overall + (sizeScore - 0.5) * 24 + (position === "D" ? 4 : 0)),
    SK:clamp(overall + (points - 0.5) * 10 - (sizeScore - 0.5) * 5),
    EN:clamp(overall + (durability - 0.5) * 14),
    PE:clamp(overall + (discipline - 0.5) * 14),
    FA:clamp(overall + (isForward ? 1 : position === "D" ? -3 : 0) + (position === "F" && player?.detailedPosition === "C" ? 4 : 0)),
    LE:clamp(overall + (durability - 0.5) * 9 + (rank.score != null ? 1 : 0)),
    SR:clamp(overall + (durability - 0.5) * 13 + (defense - 0.5) * 5),
    OFF:clamp(40 + attack * 48 + (isForward ? 3 : -3) - (isGoalie ? 18 : 0)),
    DEF:clamp(42 + defense * 45 + (position === "D" || isGoalie ? 4 : 0)),
    OA:overall
  };
  const attributes = Object.fromEntries(RATING_ATTRIBUTES.map(key => [key, existing[key] ?? modeled[key]]));
  attributes.OA = existing.OA ?? modeled.OA;
  const sources = [...new Set([statIndex?.source, player?.source, player?.supplementalSource, player?.bioSourceUrl].filter(value => typeof value === "string" && value.trim()))];
  const modeledFields = RATING_ATTRIBUTES.filter(key => existing[key] == null);
  const evidence = statRow ? "league_statistics" : rank.kind ? rank.kind : (sizeSignal(player) !== 0.5 || player?.shootsCatches) ? "biographical_player_profile" : "minimal_player_profile";
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
      method:"cross_league_profile_model_v1",
      evidence,
      modeledAttributes:modeledFields,
      ratedAttributes:RATING_ATTRIBUTES.slice(),
      season:statIndex?.season || "2026-2027"
    }
  };
}

export function matchStatIndex(player, indexes) {
  const league = leagueKey(player?.currentLeague || player?.league);
  if (indexes.has(league)) return { index:indexes.get(league), row:matchLeagueStats(player, indexes.get(league)) };
  const candidate = [...indexes.entries()].find(([key]) => key === league);
  return candidate ? { index:candidate[1], row:matchLeagueStats(player, candidate[1]) } : { index:null, row:null };
}
