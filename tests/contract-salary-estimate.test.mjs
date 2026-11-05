import test from "node:test";
import assert from "node:assert/strict";
import { simulationSalaryEstimate } from "../scripts/lib/contract-salary-estimate.mjs";

test("prefers a sourced season cap hit when available", () => {
  assert.deepEqual(
    simulationSalaryEstimate({overall:70}, {nhl_salary_usd:850000}, {cap_hit_usd:2250000}, 28),
    {usd:2250000,status:"verified_cap_hit",method:"source_2026_27_season_cap_hit"}
  );
});

test("uses a sourced base salary instead of inventing a model salary when cap hit is absent", () => {
  assert.deepEqual(
    simulationSalaryEstimate({overall:70}, {nhl_salary_usd:850000}, null, 21),
    {usd:850000,status:"verified_base_salary_fallback",method:"source_2026_27_base_salary_when_cap_hit_missing"}
  );
});

test("uses a sourced season base salary before the age/overall estimate", () => {
  assert.deepEqual(
    simulationSalaryEstimate({overall:88}, null, {base_salary_usd:1200000}, 22),
    {usd:1200000,status:"verified_base_salary_fallback",method:"source_2026_27_base_salary_when_cap_hit_missing"}
  );
});

test("keeps salary estimates explicitly provisional when no contract salary source exists", () => {
  const result = simulationSalaryEstimate({overall:80}, null, null, 24);
  assert.equal(result.status,"provisional_model_estimate");
  assert.equal(result.method,"overall_age_band_v1_not_a_verified_contract_or_salary");
  assert.equal(result.usd,7000000);
});
