import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const script=new URL("../scripts/evaluate-advanced-evidence.mjs",import.meta.url);

test("candidate evaluator writes a review artifact and never claims production writes",async()=>{
 const dir=await mkdtemp(join(tmpdir(),"hd-candidate-"));
 try{
  const input=join(dir,"normalized.json"),output=join(dir,"candidates.json");
  const forward={playerId:"f1",position:"F",league:"NHL",season:"2025-2026",gamesPlayed:55,
   ixgPer60Percentile:.9,goalsAboveExpectedPer60Percentile:.9,primaryPointsPer60Percentile:.9,shotGenerationPer60Percentile:.9,
   ixgPerShotPercentile:.8,goalsAboveExpectedPercentile:.8,shotVolumePer60Percentile:.8,
   primaryAssistsPer60Percentile:.8,chanceCreationPercentile:.8,controlledEntriesPercentile:.8,controlledExitsPercentile:.8,
   topSpeedPercentile:.8,speedBurstsPercentile:.8,highIntensityDistancePercentile:.8};
  const goalie={playerId:"g1",position:"G",league:"NHL",season:"2025-2026",gamesPlayed:45,
   goalsSavedAboveExpectedPercentile:.9,shotQualityAdjustedSavePercentile:.9};
  await writeFile(input,JSON.stringify({players:[forward,goalie]}));
  const run=spawnSync(process.execPath,[script.pathname,input,output],{encoding:"utf8"});
  assert.equal(run.status,0,run.stderr);
  const report=JSON.parse(await readFile(output,"utf8"));
  assert.equal(report.candidateCount,2);
  assert.equal(report.ratedCount,2);
  assert.equal(report.productionWrite,false);
  assert.ok(report.candidates.every(x=>x.result.overall!==null));
 }finally{await rm(dir,{recursive:true,force:true});}
});
