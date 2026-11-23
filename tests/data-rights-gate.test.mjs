import test from "node:test";
import assert from "node:assert/strict";
import { assessDataRights, assertCommercialExportAllowed } from "../scripts/lib/data-rights-gate.mjs";

const confirmed = {
  commercialUseAllowed:true, derivedUseAllowed:true, displayApproved:true,
  retentionAllowed:true, thirdPartyRightsVerified:true, paid:false,
  attributionRequired:false, attributionSatisfied:true,
  shareAlikeRequired:false, shareAlikeCompliant:true
};

test("allows explicitly verified free commercial data with retention rights", () => {
  assert.equal(assessDataRights(confirmed).status, "commercial_free_confirmed");
  assert.equal(assertCommercialExportAllowed(confirmed), true);
});

test("classifies missing permissions as review_required, not prohibited", () => {
  const result = assessDataRights({commercialUseAllowed:true, derivedUseAllowed:true});
  assert.equal(result.allowed, false);
  assert.equal(result.status, "review_required");
  assert.ok(result.reasons.some(reason => reason.includes("third-party rights")));
  assert.ok(result.reasons.some(reason => reason.includes("retentionAllowed")));
});

test("blocks explicit non-commercial restrictions", () => {
  const result = assessDataRights({...confirmed, commercialUseAllowed:false});
  assert.equal(result.status, "prohibited");
  assert.throws(() => assertCommercialExportAllowed({...confirmed, commercialUseAllowed:false}), /prohibited/);
});

test("blocks paid sources under the zero-budget policy", () => {
  const result = assessDataRights({...confirmed, paid:true});
  assert.equal(result.status, "prohibited");
  assert.throws(() => assertCommercialExportAllowed({...confirmed, paid:true}), /paid source/);
});

test("does not mistake unverified third-party rights for an explicit prohibition", () => {
  const result = assessDataRights({...confirmed, thirdPartyRightsVerified:false});
  assert.equal(result.status, "review_required");
  assert.equal(result.allowed, false);
});

test("blocks data until required attribution is implemented", () => {
  const result = assessDataRights({...confirmed, attributionRequired:true, attributionSatisfied:false});
  assert.equal(result.status, "review_required");
  assert.equal(result.attributionUnclear, true);
  assert.throws(() => assertCommercialExportAllowed({...confirmed, attributionRequired:true, attributionSatisfied:false}), /attribution/);
});

test("blocks share-alike data until downstream licensing is compatible", () => {
  const result = assessDataRights({...confirmed, shareAlikeRequired:true, shareAlikeCompliant:false});
  assert.equal(result.status, "review_required");
  assert.equal(result.shareAlikeUnclear, true);
  assert.throws(() => assertCommercialExportAllowed({...confirmed, shareAlikeRequired:true, shareAlikeCompliant:false}), /share-alike/);
});

test("blocks explicit retention restrictions", () => {
  const result = assessDataRights({...confirmed, retentionAllowed:false});
  assert.equal(result.status, "prohibited");
  assert.throws(() => assertCommercialExportAllowed({...confirmed, retentionAllowed:false}), /retentionAllowed/);
});
