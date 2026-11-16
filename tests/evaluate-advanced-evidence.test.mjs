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

test("synthetic pilot reports position distributions, evidence coverage and fail-closed guardrails",async()=>{
 const dir=await mkdtemp(join(tmpdir(),"hd-synthetic-pilot-"));
 try{
  const input=join(dir,"synthetic.json"),output=join(dir,"report.json");
  const fixture=JSON.parse(await readFile(new URL("../data/advanced-input/synthetic-pilot.json",import.meta.url),"utf8"));
  await writeFile(input,JSON.stringify(fixture));
  const reportScript=new URL("../scripts/run-synthetic-pilot-report.mjs",import.meta.url);
  const run=spawnSync(process.execPath,[reportScript.pathname,input,output],{encoding:"utf8"});
  assert.equal(run.status,0,run.stderr);
  const report=JSON.parse(await readFile(output,"utf8"));
  assert.equal(report.datasetType,"synthetic");
  assert.equal(report.candidateCount,15);
  assert.equal(report.positions.F.players,5);
  assert.equal(report.positions.D.players,5);
  assert.equal(report.positions.G.players,5);
  assert.equal(report.guardrails.productionWrite,false);
  assert.equal(report.guardrails.providerDataUsed,false);
  assert.ok(report.positions.F.attributeCoverage.OFF===1);
  assert.ok(Array.isArray(report.smallCohorts));
 }finally{await rm(dir,{recursive:true,force:true});}
});

test("synthetic pilot refuses input that is not explicitly synthetic",async()=>{
 const dir=await mkdtemp(join(tmpdir(),"hd-synthetic-reject-"));
 try{
  const input=join(dir,"input.json");
  await writeFile(input,JSON.stringify({players:[{playerId:"SYN-X",position:"F"}]}));
  const reportScript=new URL("../scripts/run-synthetic-pilot-report.mjs",import.meta.url);
  const run=spawnSync(process.execPath,[reportScript.pathname,input,join(dir,"out.json")],{encoding:"utf8"});
  assert.notEqual(run.status,0);
  assert.match(run.stderr,/must explicitly declare synthetic/);
 }finally{await rm(dir,{recursive:true,force:true});}
});


test("equal Overall can produce distinct evidence-based skater archetypes",async()=>{
 const { evaluateAdvancedSkater, classifyAdvancedProfile } = await import("../scripts/lib/advanced-player-rating-model.mjs");
 const make = (off,def) => evaluateAdvancedSkater({position:"F"},{
  gamesPlayed:55,
  ixgPer60Percentile:off, goalsAboveExpectedPer60Percentile:off, primaryPointsPer60Percentile:off, shotGenerationPer60Percentile:off,
  xgaSuppressionPercentile:def, expectedGoalDifferentialPercentile:def, shotAttemptSuppressionPercentile:def,
  ixgPerShotPercentile:.5, goalsAboveExpectedPercentile:.5, shotVolumePer60Percentile:.5,
  primaryAssistsPer60Percentile:.5, chanceCreationPercentile:.5, controlledEntriesPercentile:.5, controlledExitsPercentile:.5,
  topSpeedPercentile:.5, speedBurstsPercentile:.5, highIntensityDistancePercentile:.5,
  faceoffWinPercentile:.5, availabilityPercentile:.5, sustainedWorkloadPercentile:.5, penaltyDifferentialPercentile:.5,
  STPercentile:.5, CHPercentile:.5, POPercentile:.5, HIPercentile:.5, LEPercentile:.5, SRPercentile:.5
 });
 const scorer=make(.95,.25), stopper=make(.25,.95);
 assert.equal(scorer.overall,stopper.overall);
 assert.equal(classifyAdvancedProfile(scorer).archetype,"offensive_elite");
 assert.equal(classifyAdvancedProfile(stopper).archetype,"defensive_specialist");
});

test("low sample is a confidence flag, not a low-talent archetype",async()=>{
 const { evaluateAdvancedSkater, classifyAdvancedProfile } = await import("../scripts/lib/advanced-player-rating-model.mjs");
 const result=evaluateAdvancedSkater({position:"F"},{gamesPlayed:8,
  ixgPer60Percentile:.9,goalsAboveExpectedPer60Percentile:.9,primaryPointsPer60Percentile:.9,shotGenerationPer60Percentile:.9,
  xgaSuppressionPercentile:.8,expectedGoalDifferentialPercentile:.8,shotAttemptSuppressionPercentile:.8,
  ixgPerShotPercentile:.8,goalsAboveExpectedPercentile:.8,shotVolumePer60Percentile:.8,
  primaryAssistsPer60Percentile:.8,chanceCreationPercentile:.8,controlledEntriesPercentile:.8,controlledExitsPercentile:.8,
  topSpeedPercentile:.8,speedBurstsPercentile:.8,highIntensityDistancePercentile:.8,
  STPercentile:.8,CHPercentile:.8,POPercentile:.8,HIPercentile:.8,LEPercentile:.8,SRPercentile:.8
 });
 const profile=classifyAdvancedProfile(result);
 assert.equal(profile.archetype,"offensive_elite");
 assert.equal(profile.limitedSample,true);
 assert.notEqual(profile.confidence,"high");
});
