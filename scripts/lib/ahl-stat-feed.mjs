export function parseJsonp(text) {
  const value = String(text).replace(/^\uFEFF/, "").trim();
  const open = value.indexOf("(");
  const close = value.lastIndexOf(")");
  const raw = open >= 0 && close > open ? value.slice(open + 1, close) : value;
  return JSON.parse(raw);
}

function rowsFromSection(section) {
  if (!Array.isArray(section?.data)) return [];
  return section.data
    .filter(item => item && typeof item === "object" && item.row && typeof item.row === "object")
    .map(item => ({
      ...item.row,
      player_id: item.row.player_id ?? item.row.playerId ?? item.prop?.name?.playerLink ?? null,
      name: item.row.name ?? item.prop?.name?.seoName ?? null,
      team_code: item.row.team_code ?? item.prop?.team_code?.teamLink ?? null
    }))
    .filter(row => row.player_id != null && (row.games_played != null || row.minutes_played != null));
}

export function findPlayerRows(payload) {
  const result = [];
  const visit = value => {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) {
      if (value.some(item => item && typeof item === "object" &&
        (item.player_id != null || item.playerId != null) &&
        (item.games_played != null || item.gamesPlayed != null || item.GP != null))) {
        for (const item of value) {
          if (!item || typeof item !== "object") continue;
          const id = item.player_id ?? item.playerId;
          if (id != null) result.push({ ...item, player_id: id });
        }
      }
      for (const item of value) visit(item);
      return;
    }
    if (Array.isArray(value.sections)) {
      for (const section of value.sections) result.push(...rowsFromSection(section));
    }
    for (const [key, child] of Object.entries(value)) {
      if (key !== "sections") visit(child);
    }
  };
  visit(payload);
  const byId = new Map();
  for (const row of result) byId.set(String(row.player_id), row);
  return [...byId.values()];
}

export function validatePlayerRows(rows, { minimum, kind }) {
  const usable = rows.filter(row => row.player_id != null &&
    Number.isFinite(Number(row.games_played ?? row.gamesPlayed ?? row.GP)));
  if (usable.length < minimum) {
    throw new Error(`LAH ${kind} response incomplete/schema changed: ${usable.length} rows; minimum ${minimum}.`);
  }
  return usable;
}
