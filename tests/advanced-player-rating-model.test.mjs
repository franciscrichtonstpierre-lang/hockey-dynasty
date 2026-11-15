import test from "node:test";
import assert from "node:assert/strict";
import { evaluateAdvancedGoalie, evaluateAdvancedSkater } from "../scripts/lib/advanced-player-rating-model.mjs";

test("advanced skater model ranks evidence-based offensive production without inventing unmeasured traits", () => {
  const elite = evaluateAdvancedSkater({ name:"Elite Forward", position:"F" }, {
    gamesPlayed:60,
    ixgPer60Percentile:0.95, goalsAboveExpectedPer60Percentile:0.90,
    primaryPointsPer60Percentile:0.92, shotGenerationPer60Percentile:0.88,
    ixgPerShotPercentile:0.85, goalsAboveExpectedPercentile:0.90,
    shotVolumePer60Percentile:0.92, primaryAssistsPer60Percentile:0.85,
    chanceCreationPercentile:0.90, controlledEntriesPercentile:0.80,
    controlledExitsPercentile:0.75, topSpeedPercentile:0.80,
    speedBurstsPercentile:0.85, highIntensityDistancePercentile:0.70,
    sources:["NHL EDGE","MoneyPuck"]
  });
  const depth = evaluateAdvancedSkater({ name:"Depth Forward", position:"F" }, {
    gamesPlayed:60,
    ixgPer60Percentile:0.15, goalsAboveExpectedPer60Percentile:0.20,
    primaryPointsPer60Percentile:0.18, shotGenerationPer60Percentile:0.25,
    ixgPerShotPercentile:0.20, goalsAboveExpectedPercentile:0.15,
    shotVolumePer60Percentile:0.20, primaryAssistsPer60Percentile:0.18,
    chanceCreationPercentile:0.20, controlledEntriesPercentile:0.25,
    controlledExitsPercentile:0.20, topSpeedPercentile:0.35,
    speedBurstsPercentile:0.30, highIntensityDistancePercentile:0.25
  });
  assert.ok(elite.overall > depth.overall);
  assert.equal(elite.attributes.FI, null);
  assert.equal(elite.attributes.LE, null);
  assert.equal(elite.metadata.confidence, "low");
  assert.ok(elite.overall >= 0 && elite.overall <= 99);
});

test("fighting percentile never changes skater OA", () => {
  const evidence = {
    gamesPlayed:50, ixgPer60Percentile:0.7, goalsAboveExpectedPer60Percentile:0.7,
    primaryPointsPer60Percentile:0.7, shotGenerationPer60Percentile:0.7
  };
  const withoutFight = evaluateAdvancedSkater({ position:"F" }, evidence);
  const withFight = evaluateAdvancedSkater({ position:"F" }, { ...evidence, fightingSkillPercentile:1 });
  assert.equal(withoutFight.overall, withFight.overall);
  assert.equal(withFight.attributes.FI, 99);
});

test("defencemen use a separate OA weighting profile", () => {
  const evidence = {
    gamesPlayed:55, ixgPer60Percentile:0.4, goalsAboveExpectedPer60Percentile:0.4,
    primaryPointsPer60Percentile:0.4, shotGenerationPer60Percentile:0.4,
    xgaSuppressionPercentile:0.95, expectedGoalDifferentialPercentile:0.9,
    shotAttemptSuppressionPercentile:0.95, topSpeedPercentile:0.6,
    speedBurstsPercentile:0.6, highIntensityDistancePercentile:0.7,
    STPercentile:0.5, CHPercentile:0.9, POPercentile:0.95,
    HIPercentile:0.8, LEPercentile:0.5, SRPercentile:0.8
  };
  const defender = evaluateAdvancedSkater({ position:"D" }, evidence);
  const forward = evaluateAdvancedSkater({ position:"F" }, evidence);
  assert.ok(defender.overall > forward.overall);
});

test("insufficient or invalid percentiles do not produce fabricated skater OA", () => {
  const result = evaluateAdvancedSkater({ position:"F" }, { gamesPlayed:10, ixgPer60Percentile:1.2 });
  assert.equal(result.overall, null);
  assert.equal(result.attributes.OFF, null);
  assert.equal(result.metadata.confidence, "low");
});

test("goalies use GSAx and shot-quality evidence in a dedicated model", () => {
  const strong = evaluateAdvancedGoalie({ position:"G" }, {
    gamesPlayed:45, goalsSavedAboveExpectedPercentile:0.95,
    shotQualityAdjustedSavePercentile:0.92, highDangerSavePercentile:0.90,
    reboundControlPercentile:0.8, workloadPercentile:0.7,
    seasonStabilityPercentile:0.85, sources:["MoneyPuck"]
  });
  const weak = evaluateAdvancedGoalie({ position:"G" }, {
    gamesPlayed:45, goalsSavedAboveExpectedPercentile:0.15,
    shotQualityAdjustedSavePercentile:0.20, highDangerSavePercentile:0.18,
    reboundControlPercentile:0.25, workloadPercentile:0.7,
    seasonStabilityPercentile:0.2
  });
  assert.ok(strong.overall > weak.overall);
  assert.equal(strong.metadata.method, "hd_advanced_goalie_evidence_v1");
  assert.ok(strong.overall >= 0 && strong.overall <= 99);
});

test("goalie model returns no rating when no relevant performance evidence exists", () => {
  const result = evaluateAdvancedGoalie({ position:"G" }, { gamesPlayed:30 });
  assert.equal(result.overall, null);
  assert.equal(result.status, "insufficient_advanced_evidence");
});
