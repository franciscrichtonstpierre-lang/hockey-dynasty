const RIGHTS = ["commercialUseAllowed", "derivedUseAllowed", "displayApproved", "retentionAllowed"];

export function assessDataRights(record = {}) {
  const paid = record.paid === true || record.requiresPayment === true;
  const prohibited = paid || RIGHTS.some(key => record[key] === false);
  const missing = RIGHTS.filter(key => record[key] !== true);
  const thirdPartyUnclear = record.thirdPartyRightsVerified !== true;
  const attributionUnclear =
    typeof record.attributionRequired !== "boolean" ||
    (record.attributionRequired === true && record.attributionSatisfied !== true);
  const shareAlikeUnclear =
    typeof record.shareAlikeRequired !== "boolean" ||
    (record.shareAlikeRequired === true && record.shareAlikeCompliant !== true);

  let status;
  if (prohibited) status = "prohibited";
  else if (missing.length || thirdPartyUnclear || attributionUnclear || shareAlikeUnclear) status = "review_required";
  else status = "commercial_free_confirmed";

  return {
    allowed: status === "commercial_free_confirmed",
    status,
    missing,
    paid,
    thirdPartyUnclear,
    attributionUnclear,
    shareAlikeUnclear,
    reasons: [
      paid ? "paid source is prohibited by the zero-budget policy" : null,
      ...RIGHTS.filter(key => record[key] === false).map(key => key + " is explicitly not permitted"),
      ...missing.filter(key => record[key] == null).map(key => key + " has not been verified"),
      thirdPartyUnclear ? "third-party rights have not been verified for this dataset" : null,
      attributionUnclear ? "attribution requirement or implementation has not been verified" : null,
      shareAlikeUnclear ? "share-alike requirement or downstream compliance has not been verified" : null
    ].filter(Boolean)
  };
}

export function assertCommercialExportAllowed(record, context = "data export") {
  const assessment = assessDataRights(record);
  if (!assessment.allowed) {
    const category = assessment.status === "prohibited" ? "prohibited" : "pending legal review";
    throw new Error("Blocked " + context + " (" + category + "): " + assessment.reasons.join("; ") + ".");
  }
  return true;
}
