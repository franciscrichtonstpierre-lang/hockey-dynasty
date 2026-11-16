// Evaluate normalized advanced evidence into isolated candidate player cards.
// This writes a review artifact only; it never updates ratings.json, Supabase or the player registry.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { evaluateAdvancedGoalie, evaluateAdvancedSkater } from "./lib/advanced-player-rating-model.mjs";

const input=process.argv[2] || "data/advanced-evidence/normalized-evidence.json";
const output=process.argv[3] || "data/advanced-evidence/candidate-ratings.json";
const doc=JSON.parse(await readFile(resolve(input),"utf8"));
if(!Array.isArray(doc.players) || !doc.players.length) throw new Error("Input has no normalized players[]");
const results=doc.players.map(row=>{
  const evidence={...row,...(row.metrics||{})};
  const result=row.position==="G"
    ? evaluateAdvancedGoalie({playerId:row.playerId,position:"G"},evidence)
    : evaluateAdvancedSkater({playerId:row.playerId,position:row.position},evidence);
  return {
    playerId:String(row.playerId),league:row.league,season:row.season,position:row.position,
    result,sourceObservations:row.sourceObservations||[]
  };
});
const report={
  schemaVersion:1,generatedAt:new Date().toISOString(),
  input:resolve(input),method:"hd_advanced_evidence_candidate_v1",
  candidateCount:results.length,
  ratedCount:results.filter(x=>x.result.overall!==null).length,
  insufficientEvidenceCount:results.filter(x=>x.result.overall===null).length,
  productionWrite:false,
  warning:"Candidate estimates only. Review source rights, identity matching, cohort sizes, calibration and overrides before any production use.",
  candidates:results
};
await mkdir(dirname(resolve(output)),{recursive:true});
await writeFile(resolve(output),JSON.stringify(report,null,2)+"\n");
console.log(JSON.stringify({output,candidates:report.candidateCount,rated:report.ratedCount,insufficient:report.insufficientEvidenceCount,productionWrite:false}));
