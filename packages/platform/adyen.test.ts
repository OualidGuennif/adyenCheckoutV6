import { assertEquals, assertRejects } from "@std/assert";
import { AdyenRequestError, AdyenTestClient } from "./adyen.ts";

Deno.test("sessions uses the exact Checkout v72 TEST endpoint and API key header", async () => {
  let capturedUrl = "";
  let capturedInit: RequestInit | undefined;
  const fakeFetch = ((url: string | URL | Request, init?: RequestInit) => {
    capturedUrl = String(url);
    capturedInit = init;
    return Promise.resolve(
      Response.json({ id: "CS_TEST", sessionData: "session-data" }, { status: 201 }),
    );
  }) as typeof fetch;
  const client = new AdyenTestClient({
    apiKey: "test-api-key",
    merchantAccount: "TestMerchant",
  }, fakeFetch);

  const response = await client.sessions({
    merchantAccount: "TestMerchant",
    amount: { currency: "EUR", value: 2599 },
  }, "idem-test");

  assertEquals(capturedUrl, "https://checkout-test.adyen.com/v72/sessions");
  const headers = new Headers(capturedInit?.headers);
  assertEquals(headers.get("X-API-Key"), "test-api-key");
  assertEquals(headers.get("Idempotency-Key"), "idem-test");
  assertEquals(capturedInit?.method, "POST");
  assertEquals(JSON.parse(String(capturedInit?.body)).merchantAccount, "TestMerchant");
  assertEquals(response, { id: "CS_TEST", sessionData: "session-data" });
});

Deno.test("Adyen HTTP errors preserve the upstream status and safe message", async () => {
  const fakeFetch = (() =>
    Promise.resolve(
      Response.json(
        { errorCode: "901", message: "Invalid Merchant Account" },
        { status: 422 },
      ),
    )) as typeof fetch;
  const client = new AdyenTestClient({
    apiKey: "test-api-key",
    merchantAccount: "TestMerchant",
  }, fakeFetch);

  const error = await assertRejects(
    () => client.paymentMethods({ merchantAccount: "TestMerchant" }),
    AdyenRequestError,
    "Invalid Merchant Account",
  );
  assertEquals(error.statusCode, 422);
  assertEquals(error.errorCode, "901");
});
