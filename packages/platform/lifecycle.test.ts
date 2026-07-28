import { assertEquals, assertStringIncludes } from "@std/assert";
import { actionPermissions, capabilitiesFor } from "./lifecycle.ts";

Deno.test("scheme authorisation can be captured or cancelled before capture", () => {
  const permissions = actionPermissions("payment_pending", "scheme");
  assertEquals(permissions.capture.allowed, true);
  assertEquals(permissions.cancel.allowed, true);
  assertEquals(permissions.refund.allowed, false);
});

Deno.test("iDEAL and MB WAY are settlement-only with explicit explanations", () => {
  for (const method of ["ideal", "mbway"]) {
    const permissions = actionPermissions("payment_pending", method);
    assertEquals(permissions.capture.allowed, false);
    assertEquals(permissions.cancel.allowed, false);
    assertStringIncludes(permissions.capture.reason, "separate capture");
  }
});

Deno.test("PayPal playground default is settlement only", () => {
  const capability = capabilitiesFor("paypal");
  assertEquals(capability.settlementOnly, true);
  assertEquals(actionPermissions("payment_pending", "paypal").capture.allowed, false);
});

Deno.test("captured methods expose refunds and disable capture", () => {
  const permissions = actionPermissions("paid", "scheme");
  assertEquals(permissions.capture.allowed, false);
  assertEquals(permissions.cancel.allowed, false);
  assertEquals(permissions.refund.allowed, true);
});
