// Import verified NHL contract claims and per-season salary structure from the CC0 nhl-contracts dataset.
import { readFile, writeFile } from "node:fs/promises";

const BASE = "https://github.com/ehlersio/nhl-contracts/releases/download/contracts";
const SEASON = "2026-27";
const fetchJson = async name => {
  const res = await fetch(`${BASE}/${name}.json`, { headers: { "user-agent": "Hockey-Dynasty-data-sync/1.0" } });
  if (!res.ok) throw new Error(`Download ${name}.json failed: HTTP ${res.status}`);
  return res.json();
};
const rows = data => Array.isArray(data) ? data : (data.rows || data.data || data.records || []);
const [contractsRaw, seasonsRaw, clausesRaw, gapsRaw, claimsRaw, timestampRaw] = await Promise.all([
  fetchJson("contracts"), fetchJson("contract_seasons"), fetchJson("clauses"),
  fetchJson("gaps"), fetchJson("claims"), fetchJson("timestamp")
]);
const contracts = rows(contractsRaw), seasons = rows(seasonsRaw), clauses = rows(clausesRaw), gaps = rows(gapsRaw), claims = rows(claimsRaw);
const byKey = new Map();
for (const row of seasons) {
  if (row.season !== SEASON) continue;
  const key = row.contract_key || row.contractKey;
  if (!key) continue;
  if (!byKey.has(key)) byKey.set(key, []);
  byKey.get(key).push(row);
}
const claimById = new Map(claims.map(c => [String(c.claim_id || c.claimId || c.id), c]));
const norm = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
const sourceInfo = c => {
  const ids = String(c.claim_ids || c.claimIds || "").split(";").filter(Boolean);
  return ids.map(id => claimById.get(id)).filter(Boolean).slice(0,3).map(s => ({
    url: s.source_url || s.url || null, publisher: s.publisher || null,
    publishedAt: s.published_at || null, confidenceTier: s.confidence_tier || null
  })).filter(s => s.url);
};
const gapFor = player => gaps.find(g =>
  (player.id && Number(g.player_id || g.playerId) === Number(player.id)) ||
  norm(g.player_name || g.playerName || g.name) === norm(player.name)
) || null;
const codes = ["ANA","BOS","BUF","CGY","CAR","CHI","COL","CBJ","DAL","DET","EDM","FLA","LAK","MIN","MTL","NSH","NJD","NYI","NYR","OTT","PHI","PIT","SJS","SEA","STL","TBL","TOR","UTA","VAN","VGK","WSH","WPG"];
const players = [];
for (const code of codes) {
  const data = JSON.parse(await readFile(`data/nhl/${code}.json`, "utf8"));
  for (const [group, list] of [["forwards",data.forwards||[]],["defensemen",data.defensemen||[]],["goalies",data.goalies||[]]]) {
    for (const p of list) {
      const id = Number(p.id || p.playerId);
      const name = [p.firstName?.default || p.firstName || "",p.lastName?.default || p.lastName || ""].join(" ").trim();
      if (!id || !name) continue;
      const normalizedName = norm(name);
      let candidates = contracts.filter(c => Number(c.player_id || c.playerId) === id);
      if (!candidates.length) candidates = contracts.filter(c => norm(c.player_name || c.playerName) === normalizedName);
      const gap = gapFor({id,name});
      const active = candidates.map(c => ({ c, season: (byKey.get(c.contract_key || c.contractKey)||[])[0] }))
        .filter(x => {
          if (x.c.bought_out) return false;
          if (x.season) return true;
          const start=String(x.c.start_season||""), end=String(x.c.end_season||"");
          return !!(start && end && start<=SEASON && end>=SEASON);
        })
        .sort((a,b) => {
          if (!!a.season !== !!b.season) return a.season ? -1 : 1;
          return String(b.c.signed_at||"").localeCompare(String(a.c.signed_at||""));
        });
      const selected = active[0] || null;
      if (!selected) {
        players.push({
          playerId:id, name, teamCode:code, position:group==="goalies"?"G":group==="defensemen"?"D":"F",
          contractStatus:gap ? "GAP_REPORTED_BY_SOURCE" : "NO_MATCHED_2026_27_CONTRACT",
          gapReason:gap?.gap || null, contract:null, season:null, clauses:[],
          sourceDataset:"ehlersio/nhl-contracts", license:"CC0-1.0"
        });
        continue;
      }
      const c=selected.c, season=selected.season, key=c.contract_key||c.contractKey;
      const playerClauses=clauses.filter(cl =>
        (cl.contract_key||cl.contractKey)===key ||
        (Number(cl.player_id||cl.playerId)===id && String(cl.season_from||"")<=SEASON && String(cl.season_to||"")>=SEASON)
      );
      players.push({
        playerId:id, name, teamCode:code, position:group==="goalies"?"G":group==="defensemen"?"D":"F",
        contractStatus:selected.season ? "MATCHED" : "MATCHED_CONTRACT_NO_SEASON_ROW", contract:{
          contractKey:key, signingTeam:c.team||null, signedAt:c.signed_at||null,
          signingDateStated:c.signing_date_stated??null, type:c.contract_type||null,
          termYears:c.term_years??null, startSeason:c.start_season||null, endSeason:c.end_season||null,
          expiryStatus:c.expiry_status||null, boughtOut:!!c.bought_out, oneWay:c.one_way??null,
          totalUsd:c.total_usd??null, nhlSalaryUsd:c.nhl_salary_usd??null, minorsSalaryUsd:c.minors_salary_usd??null,
          confidenceTier:c.best_tier||null, tiers:c.tiers||null, sourceCount:c.n_sources??null,
          conflicts:c.conflicts||null, flags:c.flags||null, sourceClaimIds:String(c.claim_ids||"").split(";").filter(Boolean),
          sources:sourceInfo(c)
        },
        season:season ? {
          season:SEASON, capHitUsd:season.cap_hit_usd??null, aavUsd:season.aav_usd??null,
          baseSalaryUsd:season.base_salary_usd??null, signingBonusUsd:season.signing_bonus_usd??null,
          performanceBonusUsd:season.performance_bonus_usd??null, totalSalaryUsd:season.total_salary_usd??null,
          minorsSalaryUsd:season.minors_salary_usd??null, oneWay:season.one_way??null, clause:season.clause||null
        } : null,
        clauses:playerClauses.map(cl=>({kind:cl.kind||null,seasonFrom:cl.season_from||null,seasonTo:cl.season_to||null,listSize:cl.list_size??null,listType:cl.list_type||null})),
        sourceDataset:"ehlersio/nhl-contracts", license:"CC0-1.0"
      });
    }
  }
}
const matchedContracts=players.filter(p=>p.contract!=null).length;\nconst salaryRows=players.filter(p=>p.season?.capHitUsd!=null).length;
const output={
  schemaVersion:1, season:"2026-2027", seasonKey:SEASON, generatedAt:new Date().toISOString(),
  sourceDataset:"ehlersio/nhl-contracts", sourceUrl:"https://github.com/ehlersio/nhl-contracts/releases/tag/contracts",
  sourceUpdatedAt:timestampRaw.updated_at||timestampRaw.updatedAt||timestampRaw.generated_at||null,
  license:"CC0-1.0", playerCount:players.length, matchedContracts, salaryRows,\n  coveragePercent:Number((100*matchedContracts/Math.max(players.length,1)).toFixed(1)),\n  salaryCoveragePercent:Number((100*salaryRows/Math.max(players.length,1)).toFixed(1)),\n  counts:{matchedContracts, salaryRows, missingContracts:players.length-matchedContracts,withGapSource:players.filter(p=>p.gapReason).length},
  players,
  dataNotes:[
    "Contract records and seasonal salary values retain the source confidence tier and source claims where available.",
    "Cap hit, AAV, base salary, signing bonus, performance bonus and total salary remain separate fields.",
    "A missing record is marked as a gap; no salary or contract term is invented.",
    "This is a public dataset snapshot, not legal or payroll advice. Verify important clauses and disputed values against official team announcements."
  ]
};
await writeFile("data/contracts/2026-2027.json",JSON.stringify(output)+"\n","utf8");
console.log(`Contracts import: ${matchedContracts}/${players.length} roster players with contract records (${output.coveragePercent}%); ${salaryRows} with 2026-27 cap-hit data (${output.salaryCoveragePercent}%); ${output.counts.withGapSource} gaps documented; upstream ${output.sourceUpdatedAt||"timestamp unknown"}`);
