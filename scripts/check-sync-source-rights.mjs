import { readFile } from "node:fs/promises";
import { assessDataRights } from "./lib/data-rights-gate.mjs";

const registry = JSON.parse(await readFile(new URL("../data/data-source-rights-registry.json", import.meta.url), "utf8"));
const required = [
  ["nhl_public_api_rosters_2026_2027", "NHL rosters, prospects and biographies"],
  ["nhl_stats_rest_2025_2026", "NHL player statistics used by the ratings builder"],
  ["ahl_hockeytech_rosters_stats_2026_2027", "AHL rosters and player statistics"],
  ["echl_hockeytech_rosters_stats_2026_2027", "ECHL rosters and player statistics"],
  ["junior_hockeytech_rosters_stats_2026_2027", "OHL/WHL/QMJHL/USHL rosters and statistics"],
  ["ncaa_collegehockeyinc_player_stats_2026_2027", "NCAA player statistics"],
  ["ncaa_collegehockeynews_rosters_2026_2027", "NCAA rosters and biographies"],
  ["european_league_player_stats_2026_2027", "SHL/Liiga/HockeyAllsvenskan statistics"],
  ["future_draft_prospect_pages_2027_2029", "2027-2029 draft prospect lists"],
  ["draft_pick_ownership_nhl_sources_2026_2027", "NHL draft-pick ownership and transaction data"]
];

const blocked = [];
for (const [id, label] of required) {
  const record = registry.datasets?.[id];
  if (!record) {
    blocked.push(id + " (" + label + "): missing rights record");
    continue;
  }
  const assessment = assessDataRights(record);
  if (record.status !== "commercial-free-confirmed" || !assessment.allowed) {
    blocked.push(id + " (" + label + "): " + record.status + " — " + assessment.reasons.join("; "));
  }
}
if (blocked.length) {
  throw new Error("Multi-league data sync is blocked by the zero-budget commercial rights policy. No feeds were fetched. Unapproved sources: " + blocked.join(" | "));
}
console.log("All multi-league data sources have explicit free commercial, derived-use, display, retention, third-party and attribution/share-alike clearance.");
