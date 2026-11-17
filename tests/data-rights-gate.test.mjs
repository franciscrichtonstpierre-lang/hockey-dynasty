import test from "node:test";
import assert from "node:assert/strict";
import { assessDataRights, assertCommercialExportAllowed } from "../scripts/lib/data-rights-gate.mjs";

const confirmed = {
  commercialUseAllowed:true, derivedUseAllowed:true, displayApproved:true,
  thirdPartyRightsVerified:true, paid:false
};

test("allows explicitly verified free commercial data", () => {
  assert.equal(assessDataRights(confirmed).status, "commercial_free_confirmed");
  assert.equal(assertCommercialExportAllowed(confirmed), true);
});

test("classifies missing permissions as review_required, not prohibited", () => {
  const result = assessDataRights({commercialUseAllowed:true, derivedUseAllowed:true});
  assert.equal(result.allowed, false);
  assert.equal(result.status, "review_required");
  assert.ok(result.reasons.some(reason => reason.includes("third-party rights")));
});

test("classifies explicit non-commercial restrictions as prohibited", () => {
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
