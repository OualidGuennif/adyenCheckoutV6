import { assert, assertEquals } from "@std/assert";
import { addressDataset, buildCheckoutAddresses, SUPPORTED_COUNTRY_CODES } from "./addresses.ts";

Deno.test("every selectable country has separate billing and delivery fixtures", () => {
  assert(SUPPORTED_COUNTRY_CODES.length >= 30);
  for (const country of SUPPORTED_COUNTRY_CODES) {
    const pair = addressDataset(country);
    assertEquals(pair.billingAddress.country, country);
    assertEquals(pair.deliveryAddress.country, country);
    assert(pair.billingAddress.street !== pair.deliveryAddress.street);
  }
});

Deno.test("US and Canada datasets include stateOrProvince", () => {
  for (const country of ["US", "CA"]) {
    const pair = buildCheckoutAddresses({ countryCode: country });
    assert(pair.billingAddress.stateOrProvince);
    assert(pair.deliveryAddress.stateOrProvince);
  }
});

Deno.test("provided countries dynamically select each address dataset", () => {
  const pair = buildCheckoutAddresses({
    countryCode: "FR",
    billingAddress: { country: "CA", city: "Montreal" },
    deliveryAddress: { country: "US", city: "Boston" },
  });
  assertEquals(pair.billingAddress.country, "CA");
  assertEquals(pair.billingAddress.city, "Montreal");
  assertEquals(pair.deliveryAddress.country, "US");
  assertEquals(pair.deliveryAddress.city, "Boston");
});
