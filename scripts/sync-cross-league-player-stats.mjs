// Synchronise official ECHL and junior player statistics from HockeyTech/LeagueStat.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { findPlayerRows, parseJsonp, validatePlayerRows } from "./lib/ahl-stat-feed.mjs";

const configs = [
  { code:"ECHL", folder:"echl", seasonFile:"data/echl/teams.json", client:"echl", key:"2c2b89ea7345cae8", leagueId:"1", siteId:"0", base:"https://lscluster.hockeytech.com/feed/index.php", minSkaters:200, minGoalies:20 },
  { code:"OHL", folder:"junior", client:"ohl", key:"f1aa699db3d81487", leagueId:"1", siteId:"1", base:"https://lscluster.hockeytech.com/feed/index.php", minSkaters:100, minGoalies:10 },
  { code:"WHL", folder:"junior", client:"whl", key:"f1aa699db3d81487", leagueId:"7", siteId:"0", base:"https://lscluster.hockeytech.com/feed/index.php", minSkaters:100, minGoalies:10 },
  { code:"QMJHL", folder:"junior", client:"lhjmq", key:"f322673b6bcae299", leagueId:"6", siteId:"0", base:"https://cluster.leaguestat.com/feed/index.php", minSkaters:100, minGoalies:10 },
  { code:"USHL", folder:"junior", client:"ushl", key:"e828f89b243dc43f", leagueId:"1", siteId:"0", base:"https://lscluster.hockeytech.com/feed/index.php", minSkaters:100, minGoalies:10 }
];

const bioData = JSON.parse(await readFile("data/players/junior-bio-enrichment.json", "utf8"));
const endpoint = (cfg, seasonId, extra = {}) => {
  const url = new URL(cfg.base);
  const params = { feed:"statviewfeed", key:cfg.key, client_code:cfg.client, league_id:cfg.leagueId, site_id:cfg.siteId, lang:"en", view:"players", season:seasonId, team:"all", limit:1000, ...extra };
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, String(value));
  return url.toString();
};
async function get(url) {
  const response = await fetch(url, { headers:{ "User-Agent":"Hockey-Dynasty-data-sync/1.0", "Accept":"application/json, text/javascript" }, signal:AbortSignal.timeout(25000) });
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${url}`);
  return parseJsonp(await response.text());
}
function uniqueRows(rows) {
  return [...new Map(rows.map(row => [String(row.player_id ?? row.playerId ?? ""), row]).filter(([id]) => id && id !== "undefined")).values()];
}

for (const cfg of configs) {
  let seasonId;
  if (cfg.seasonFile) {
    seasonId = String(JSON.parse(await readFile(cfg.seasonFile, "utf8")).seasonId);
  } else {
    const sample = bioData.players.find(player => player.league === cfg.code && player.sourceUrl);
    seasonId = sample ? new URL(sample.sourceUrl).searchParams.get("season_id") : null;
  }
  if (!seasonId) throw new Error(`${cfg.code}: impossible de trouver l'identifiant de saison 2026-2027.`);

  const skaterUrl = endpoint(cfg, seasonId);
  const goalieUrl = endpoint(cfg, seasonId, { position:"goalies" });
  const [skaterPayload, goaliePayload] = await Promise.all([get(skaterUrl), get(goalieUrl)]);
  const skaters = validatePlayerRows(uniqueRows(findPlayerRows(skaterPayload)), { minimum:cfg.minSkaters, kind:`${cfg.code} skater` });
  const goalies = validatePlayerRows(uniqueRows(findPlayerRows(goaliePayload)), { minimum:cfg.minGoalies, kind:`${cfg.code} goalie` });
  const payload = {
    schemaVersion:1, league:cfg.code, season:"2026-2027", seasonId,
    source:`Official ${cfg.code} HockeyTech / LeagueStat public player statistics feed`,
    syncedAt:new Date().toISOString(), endpoints:{skaters:skaterUrl, goalies:goalieUrl},
    counts:{skaters:skaters.length, goalies:goalies.length}, skaters, goalies,
    notes:["Raw league-wide season statistics; not scouting grades.", "These statistics support clearly labelled model estimates and do not directly measure every EHM-style attribute."]
  };
  await mkdir(`data/${cfg.folder}`, { recursive:true });
  const target = cfg.code === "ECHL" ? `data/${cfg.folder}/player-stats-2026-2027.json` : `data/${cfg.folder}/player-stats-${cfg.code.toLowerCase()}-2026-2027.json`;
  await writeFile(target, JSON.stringify(payload, null, 2) + "\n", "utf8");
  console.log(`${cfg.code}: ${skaters.length} patineurs, ${goalies.length} gardiens (saison ${seasonId}).`);
}
