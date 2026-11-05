const asArray = value => Array.isArray(value) ? value : [];
const firstRows = payload => {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];
  for (const key of ["data","rows","results","players","items","stats","table","result"]) {
    if (Array.isArray(payload[key])) return payload[key];
    if (payload[key] && typeof payload[key] === "object") {
      const nested = firstRows(payload[key]);
      if (nested.length) return nested;
    }
  }
  return [];
};
const value = (row, ...keys) => {
  for (const key of keys) {
    const v = row?.[key];
    if (v !== null && v !== undefined && v !== "") return v;
  }
  return null;
};
const num = (row, ...keys) => {
  const v = value(row, ...keys);
  const n = Number(v);
  return v == null || !Number.isFinite(n) ? 0 : n;
};
const name = row => String(value(row,"info_full_name","full_name","fullName","name") || [
  value(row,"first_name","firstName","info_first_name") || "",
  value(row,"last_name","lastName","info_last_name") || ""
].join(" ")).trim();

export function normalizeLiigaSkaters(payload) {
  return firstRows(payload).map(row => ({
    player_id:value(row,"player_id","playerId","id"),
    name:name(row),
    position:value(row,"role","position"),
    games_played:num(row,"played_games","games_played","games","gp"),
    goals:num(row,"goals","g"),
    assists:num(row,"assists","a"),
    points:num(row,"points","pts"),
    plus_minus:num(row,"plus_minus","plusMinus"),
    penalty_minutes:num(row,"penalty_minutes","pim"),
    shots:num(row,"shots","sog","shots_on_goal")
  })).filter(row => row.name && row.player_id != null);
}
export function normalizeLiigaGoalies(payload) {
  return firstRows(payload).map(row => ({
    player_id:value(row,"player_id","playerId","id"),
    name:name(row),
    position:"G",
    games_played:num(row,"played_games","games_played","games","gp"),
    wins:num(row,"gk_wins","wins","w"),
    saves:num(row,"saves","svs"),
    shots_against:num(row,"shots_against","sog_against"),
    goals_against:num(row,"goals_against","ga"),
    save_percentage:num(row,"save_percentage","savePctg","sv_pct"),
    goals_against_average:num(row,"goals_against_average","gaa"),
    shutouts:num(row,"shut_out","shutouts","so")
  })).filter(row => row.name && row.player_id != null);
}
export function normalizeShlSkaters(payload) {
  return firstRows(payload).map(row => ({
    player_id:value(row,"player_id","playerId","info_uuid","info_id"),
    name:name(row),
    position:value(row,"info_position","position"),
    games_played:num(row,"gp","games_played"),
    goals:num(row,"g","goals"),
    assists:num(row,"a","assists"),
    points:num(row,"tp","points","pts"),
    plus_minus:num(row,"plus_minus","plusMinus"),
    penalty_minutes:num(row,"pim","penalty_minutes"),
    shots:num(row,"sog","shots")
  })).filter(row => row.name && row.player_id != null);
}
export function normalizeShlGoalies(payload) {
  return firstRows(payload).map(row => ({
    player_id:value(row,"player_id","playerId","info_uuid","info_id"),
    name:name(row),
    position:"G",
    games_played:num(row,"gp","gpi","games_played"),
    wins:num(row,"w","wins"),
    saves:num(row,"svs","saves"),
    save_percentage:num(row,"svs_perc","save_percentage","savePctg"),
    goals_against_average:num(row,"gaa","goals_against_average"),
    shutouts:num(row,"so","shutouts")
  })).filter(row => row.name && row.player_id != null);
}
export const extractRows = firstRows;


function htmlText(fragment) {
  return String(fragment)
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<img\b[^>]*>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/\s+/g, " ")
    .trim();
}

function eliteProspectsRows(html) {
  const rows = [];
  for (const [, rowHtml] of String(html).matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cells = [...rowHtml.matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(match => match[1]);
    if (cells.length < 8) continue;
    const rank = Number(htmlText(cells[0]).replace(/\D/g, ""));
    if (!Number.isInteger(rank) || rank < 1) continue;
    const playerCell = cells[1] || "";
    const rawName = htmlText(playerCell);
    const positionMatch = rawName.match(/\(([^()]*)\)\s*$/);
    const playerName = rawName.replace(/\s*\([^()]*\)\s*$/, "").trim();
    if (!playerName) continue;
    const href = playerCell.match(/<a\b[^>]*href=["']([^"']+)["']/i)?.[1] || "";
    const slug = href.split("?")[0].split("/").filter(Boolean).pop() || playerName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const number = index => {
      const raw = htmlText(cells[index] || "").replace(/,/g, "").replace(/^\./, "0.");
      if (!raw || raw === "-" || raw === "—") return 0;
      const parsed = Number(raw);
      return Number.isFinite(parsed) ? parsed : 0;
    };
    rows.push({ rank, player_id:"ep:"+slug, name:playerName, position:positionMatch?.[1] || null, number });
  }
  return rows;
}

export function normalizeEliteProspectsShlSkaters(html) {
  return eliteProspectsRows(html).map(row => ({
    player_id:row.player_id,
    name:row.name,
    position:/\bD\b/i.test(row.position || "") ? "D" : "F",
    games_played:row.number(3),
    goals:row.number(4),
    assists:row.number(5),
    points:row.number(6),
    penalty_minutes:row.number(8),
    plus_minus:row.number(9)
  }));
}

export function normalizeEliteProspectsShlGoalies(html) {
  return eliteProspectsRows(html).map(row => ({
    player_id:row.player_id,
    name:row.name,
    position:"G",
    games_played:row.number(3),
    goals_against_average:row.number(4),
    save_percentage:row.number(5) * 100,
    wins:row.number(6),
    losses:row.number(7),
    shutouts:row.number(9),
    saves:row.number(11),
    goals_against:row.number(12)
  }));
}
