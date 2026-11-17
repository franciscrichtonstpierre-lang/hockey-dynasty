const REQUIRED_RIGHTS = [
  "commercialUseAllowed",
  "derivedUseAllowed",
  "displayApproved"
];

export function assessDataRights(record = {}) {
  const missing = REQUIRED_RIGHTS.filter(key => record[key] !== true);
  const paid = record.paid === true || record.requiresPayment === true;
  const thirdPartyUnclear = record.thirdPartyRightsVerified === false ||
    record.thirdPartyRightsVerified == null && record.datasetLevelReviewRequired === true;

  const allowed = missing.length === 0 && !paid && !thirdPartyUnclear;
  return {
    allowed,
    status: allowed ? "commercial_free_confirmed" : "blocked",
    missing,
    paid,
    thirdPartyUnclear
  };
}

export function assertCommercialExportAllowed(record, context = "data export") {
  const assessment = assessDataRights(record);
  if (!assessment.allowed) {
    const reasons = [
      assessment.missing.length ? `missing explicit rights: ${assessment.missing.join(", ")}` : null,
      assessment.paid ? "paid source is prohibited by the zero-budget policy" : null,
      assessment.thirdPartyUnclear ? "third-party rights have not been verified for this dataset" : null
    ].filter(Boolean).join("; ");
    throw new Error(`Blocked ${context}: ${reasons}.`);
  }
  return true;
}
