const decode = value => String(value || "")
  .replace(/&nbsp;|&#160;/gi, " ")
  .replace(/&amp;/gi, "&")
  .replace(/&quot;/gi, '"')
  .replace(/&#39;|&apos;/gi, "'")
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
  .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)));
const clean = value => decode(String(value || "").replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
const number = value => {
  const parsed = Number(String(value ?? "").replace(/,/g, "").trim());
  return Number.isFinite(parsed) ? parsed : null;
};
const key = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export function parseNCAAPlayerStats(html) {
  const rows = [];
  for (const match of String(html || "").matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cells = [...match[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(cell => clean(cell[1]));
    if (cells.length < 16) continue;
    const name = cells[1];
    const position = String(cells[3] || "").toUpperCase();
    const games = number(cells[5]);
    if (!name || !games || position === "G") continue;
    const goals = number(cells[6]), assists = number(cells[7]), points = number(cells[8]);
    if ([goals, assists, points].some(value => value == null)) continue;
    rows.push({
      player_id: `ncaa:${key(name)}`,
      name,
      position: position === "D" ? "D" : "F",
      team_name: cells[2] || null,
      games_played: games,
      goals,
      assists,
      points,
      penalty_minutes: number(cells[10]) ?? 0,
      shots: number(cells[11]) ?? 0,
      plus_minus: number(cells[15]) ?? 0
    });
  }
  return [...new Map(rows.map(row => [row.player_id, row])).values()];
}
