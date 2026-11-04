import test from "node:test";
import assert from "node:assert/strict";
import adapter from "../nhl-roster-adapter.js";
test("maps NHL roster rows to stable internal identities without inventing ratings",()=>{
 const rows=adapter.normalizeTeamRoster({forwards:[{id:8478402,firstName:{default:"Connor"},lastName:{default:"McDavid"},positionCode:"C",birthDate:"1997-01-13",sweaterNumber:97}],defensemen:[],goalies:[]},"EDM","20262027");
 assert.equal(rows.length,1);
 assert.equal(rows[0].id,"nhl:8478402");
 assert.equal(rows[0].name,"Connor McDavid");
 assert.equal(rows[0].positionCode,"C");
 assert.equal(rows[0].ratings,null);
 assert.equal(rows[0].potentialStatus,"unverified");
});
test("rejects invalid team and season identifiers",()=>{
 assert.throws(()=>adapter.normalizeTeamRoster({players:[]},"Edmonton","20262027"));
 assert.throws(()=>adapter.normalizeTeamRoster({players:[]},"EDM","2026"));
});
