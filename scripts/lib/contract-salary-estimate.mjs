export function simulationSalaryEstimate(registryPlayer, contract, season, age = 27) {
  const cap = Number(season?.cap_hit_usd ?? season?.capHitUsd);
  if ((season?.cap_hit_usd ?? season?.capHitUsd) != null && Number.isFinite(cap) && cap > 0) {
    return { usd:Math.round(cap), status:"verified_cap_hit", method:"source_2026_27_season_cap_hit" };
  }

  const baseRaw = season?.base_salary_usd ?? season?.baseSalaryUsd ?? contract?.nhl_salary_usd ?? contract?.nhlSalaryUsd;
  const base = Number(baseRaw);
  if (baseRaw != null && baseRaw !== "" && Number.isFinite(base) && base > 0) {
    return { usd:Math.round(base), status:"verified_base_salary_fallback", method:"source_2026_27_base_salary_when_cap_hit_missing" };
  }

  const overall = Number(registryPlayer?.overall);
  const oa = Number.isFinite(overall) ? Math.max(0,Math.min(99,overall)) : 55;
  const playerAge = Number.isFinite(Number(age)) ? Number(age) : 27;
  let amount = 775000;
  if (playerAge <= 22) amount = oa >= 80 ? 950000 : oa >= 70 ? 925000 : 850000;
  else if (oa >= 90) amount = 11500000;
  else if (oa >= 85) amount = 9000000;
  else if (oa >= 80) amount = 7000000;
  else if (oa >= 75) amount = 5000000;
  else if (oa >= 70) amount = 3500000;
  else if (oa >= 65) amount = 2200000;
  else if (oa >= 60) amount = 1300000;
  else if (oa >= 55) amount = 950000;
  return { usd:amount, status:"provisional_model_estimate", method:"overall_age_band_v1_not_a_verified_contract_or_salary" };
}
