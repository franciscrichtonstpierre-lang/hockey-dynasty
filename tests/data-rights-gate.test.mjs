import test from "node:test";
import assert from "node:assert/strict";
import { assessDataRights, assertCommercialExportAllowed } from "../scripts/lib/data-rights-gate.mjs";

test("blocks data when commercial or derived rights are missing", () => {
  const result = assessDataRights({
    commercialUseAllowed: true,
    derivedUseAllowed: false,
    displayApproved: true,
    thirdPartyRightsVerified: true
  });
  assert.equal(result.allowed, false);
  assert.deepEqual(result.missing, ["derivedUseAllowed"]);
});

test("blocks paid sources even if their terms permit commercial use", () => {
  assert.throws(() => assertCommercialExportAllowed({
    commercialUseAllowed: true,
    derivedUseAllowed: true,
    displayApproved: true,
    thirdPartyRightsVerified: true,
    paid: true
  }), /paid source/);
});

test("blocks mixed-origin data until dataset-level third-party rights are verified", () => {
  assert.throws(() => assertCommercialExportAllowed({
    commercialUseAllowed: true,
    derivedUseAllowed: true,
    displayApproved: true,
    datasetLevelReviewRequired: true
  }), /third-party rights/);
});

test("allows explicitly verified free commercial data", () => {
  assert.equal(assertCommercialExportAllowed({
    commercialUseAllowed: true,
    derivedUseAllowed: true,
    displayApproved: true,
    thirdPartyRightsVerified: true,
    paid: false
  }), true);
});
