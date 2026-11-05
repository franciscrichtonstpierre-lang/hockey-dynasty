import test from "node:test";
import assert from "node:assert/strict";
import { mergeNhlProspectAliases } from "../scripts/lib/registry-identity-merge.mjs";

const nameKey = value => String(value || "").normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "").toLowerCase()
  .replace(/[^a-z0-9]+/g, " ").trim();

test("merges a duplicate prospect alias into its NHL identity and keeps current NHL team", () => {
  const records = new Map([
    ["nhl:8483752", {
      id:"nhl:8483752",name:"Dominic James",birthDate:"2002-07-03",
      nhlRightsTeam:"TBL",position:"F",currentLeague:"NHL",currentTeam:"TBL"
    }],
    ["prospect:TBL:dominic-james", {
      id:"prospect:TBL:dominic-james",name:"Dominic James",
      nhlRightsTeam:"TBL",position:"F",currentLeague:"NHL",currentTeam:null
    }]
  ]);
  const result = mergeNhlProspectAliases(records,nameKey);
  assert.equal(result.merged,1);
  assert.equal(records.size,1);
  assert.equal(records.get("nhl:8483752").currentTeam,"TBL");
});

test("uses the more specific playing league and clears a rights-owner team masquerading as current team", () => {
  const records = new Map([
    ["nhl:8484151", {
      id:"nhl:8484151",name:"Quinton Burns",birthDate:"2005-04-14",
      nhlRightsTeam:"STL",position:"D",currentLeague:"NHL",currentTeam:"STL"
    }],
    ["prospect:STL:quinton-burns", {
      id:"prospect:STL:quinton-burns",name:"Quinton Burns",
      nhlRightsTeam:"STL",position:"D",currentLeague:"ECHL",currentTeam:null
    }]
  ]);
  const result = mergeNhlProspectAliases(records,nameKey);
  assert.equal(result.merged,1);
  assert.equal(records.size,1);
  assert.equal(records.get("nhl:8484151").currentLeague,"ECHL");
  assert.equal(records.get("nhl:8484151").currentTeam,null);
});

test("does not merge different rights owners or conflicting birth dates", () => {
  const records = new Map([
    ["nhl:1",{id:"nhl:1",name:"Alex Smith",birthDate:"2001-01-01",nhlRightsTeam:"BOS",position:"F",currentLeague:"NHL"}],
    ["prospect:NYR:alex-smith",{id:"prospect:NYR:alex-smith",name:"Alex Smith",nhlRightsTeam:"NYR",position:"F",currentLeague:"AHL"}],
    ["nhl:2",{id:"nhl:2",name:"Chris Jones",birthDate:"2001-02-02",nhlRightsTeam:"TOR",position:"D",currentLeague:"NHL"}],
    ["prospect:TOR:chris-jones",{id:"prospect:TOR:chris-jones",name:"Chris Jones",birthDate:"2002-02-02",nhlRightsTeam:"TOR",position:"D",currentLeague:"AHL"}]
  ]);
  const result = mergeNhlProspectAliases(records,nameKey);
  assert.equal(result.merged,0);
  assert.equal(records.size,4);
});
