import test from "node:test";
import assert from "node:assert/strict";
import matching from "../player-source-matching.js";

const players = [
  {id:"nhl:1", name:"Connor McDavid", birthDate:"1997-01-13", position:"C", nhlPlayerId:8478402},
  {id:"prospect:2", name:"Alexis Lafrenière", birthDate:"2001-10-11", position:"LW"},
  {id:"prospect:3", name:"Alexis Lafrenière", birthDate:"2002-10-11", position:"LW"}
];

test("matches by stable NHL id before names", () => {
  const result=matching.matchPlayer({name:"Connor McDavid",nhlPlayerId:8478402},players);
  assert.equal(result.status,"matched");
  assert.equal(result.playerId,"nhl:1");
  assert.equal(result.method,"nhlPlayerId");
  assert.equal(result.confidence,"verified");
});

test("normalizes accents and matches unique name plus birth date", () => {
  const result=matching.matchPlayer({name:"Alexis Lafreniere",birthDate:"2001-10-11",position:"LW"},players);
  assert.equal(result.status,"matched");
  assert.equal(result.playerId,"prospect:2");
  assert.equal(result.confidence,"high");
});

test("does not guess when same-name candidates remain ambiguous", () => {
  const result=matching.matchPlayer({name:"Alexis Lafrenière",position:"LW"},players);
  assert.equal(result.status,"ambiguous");
  assert.equal(result.playerId,undefined);
  assert.equal(result.candidates.length,2);
});

test("keeps conflicting source observations separate", () => {
  const result=matching.reconcileObservations([
    {playerId:"nhl:1",attribute:"SH",normalizedHdValue:94,sourceName:"EA"},
    {playerId:"nhl:1",attribute:"SH",normalizedHdValue:91,sourceName:"scout"}
  ]);
  assert.equal(result[0].status,"conflicting");
  assert.equal(result[0].suggestedValue,null);
  assert.equal(result[0].observations.length,2);
});
