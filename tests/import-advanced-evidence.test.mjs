import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const script = new URL("../scripts/import-advanced-evidence.mjs", import.meta.url);

test("advanced evidence importer creates within-cohort percentiles with provenance", async () => {
  const dir = await mkdtemp(join(tmpdir(), "hd-advanced-"));
  try {
    const input = join(dir, "input.json"), output = join(dir, "out.json");
    await writeFile(input, JSON.stringify({
      source:{name:"Test source",url:"https://example.org/data",checkedAt:"2026-11-15T12:00:00Z",season:"2025-2026",licenseStatus:"approved"},
      rows:[
        {playerId:"p1",position:"F",league:"NHL",season:"2025-2026",gamesPlayed:50,usageCohort:"all",metrics:{ixgPer60:1,topSpeed:30}},
        {playerId:"p2",position:"F",league:"NHL",season:"2025-2026",gamesPlayed:50,usageCohort:"all",metrics:{ixgPer60:2,topSpeed:32}},
        {playerId:"p3",position:"D",league:"NHL",season:"2025-2026",gamesPlayed:50,usageCohort:"all",metrics:{ixgPer60:100,topSpeed:35}}
      ]
    }));
    const run = spawnSync(process.execPath,[script.pathname,input,output],{encoding:"utf8"});
    assert.equal(run.status,0,run.stderr);
    const result = JSON.parse(await readFile(output,"utf8"));
    assert.equal(result.normalizedRowCount,3);
    const f1=result.players.find(p=>p.playerId==="p1");
    const f2=result.players.find(p=>p.playerId==="p2");
    assert.equal(f1.ixgPer60Percentile,0);
    assert.equal(f2.ixgPer60Percentile,1);
    assert.equal(f1.sourceObservations[0].sourceName,"Test source");
    assert.equal(f1.sourceObservations[0].licenseStatus,"approved");
    assert.equal(result.players.find(p=>p.playerId==="p3").ixgPer60Percentile,0.5);
  } finally { await rm(dir,{recursive:true,force:true}); }
});

test("advanced evidence importer refuses unknown or unapproved licensing status", async () => {
  const dir = await mkdtemp(join(tmpdir(), "hd-advanced-license-"));
  try {
    const input=join(dir,"input.json");
    await writeFile(input,JSON.stringify({
      source:{name:"Unapproved",url:"https://example.org",checkedAt:"2026-11-15T12:00:00Z",season:"2025-2026",licenseStatus:"unknown"},
      rows:[{playerId:"p1",position:"F",league:"NHL",season:"2025-2026",metrics:{ixgPer60:1}}]
    }));
    const run=spawnSync(process.execPath,[script.pathname,input,join(dir,"out.json")],{encoding:"utf8"});
    assert.notEqual(run.status,0);
    assert.match(run.stderr,/Refusing import/);
  } finally { await rm(dir,{recursive:true,force:true}); }
});
