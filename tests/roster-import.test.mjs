import test from "node:test";
import assert from "node:assert/strict";
import roster from "../roster-import.js";
test("normalizes roster identity, positions and the 15 trainable ratings",()=>{
 const p=roster.normalizePlayer({name:"Test Player",birthDate:"2005-01-02",position:"D",team:"MTL",FI:70,SH:60,PL:75,ST:65,CH:80,PO:60,HI:70,SK:78,EN:72,PE:74,FA:69,LE:80,SR:66,OFF:68,DEF:82,OA:99,PA:88,CON:90},{name:"sample source",edition:"2026"});
 assert.equal(p.identity.position,"D");
 assert.equal(p.ratings.OA,null);
 assert.equal(p.ratingsStatus,"complete");
 assert.equal(p.potential.value,88);
 assert.equal(p.consistency.value,90);
});
test("marks partial ratings and unknown potential honestly",()=>{
 const p=roster.normalizePlayer({name:"Prospect",position:"C",SH:64},{name:"sample"});
 assert.equal(p.ratingsStatus,"partial");
 assert.equal(p.potential.value,null);
 assert.equal(p.potential.status,"unverified");
 assert.equal(p.consistency.value,null);
});
test("clamps out-of-range source ratings and rejects nameless rows",()=>{
 const p=roster.normalizePlayer({name:"Player",SH:120},{name:"sample"});
 assert.equal(p.ratings.SH,99);
 assert.throws(()=>roster.normalizePlayer({}, {name:"sample"}));
});
