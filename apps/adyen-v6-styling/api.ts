import { AdyenTestClient } from "@suite/platform/adyen.ts";
import { buildCheckoutAddresses } from "@suite/platform/addresses.ts";
import { createPlatformContext, selectedSecrets } from "@suite/platform/base-api.ts";
import {
  buildLineItems,
  resolveShopperEmail,
  sessionRiskFields,
} from "@suite/platform/sessionContext.ts";
import { weeklyShopperReference } from "@suite/platform/shopper.ts";

const context = createPlatformContext("styling");
export const api = context.api;

// Side lookup only, used to populate the "pre-select payment method" dropdown
// with the merchant's real available methods for a country — unrelated to
// (and doesn't affect) the /sessions call the Drop-in preview actually uses.
api.post("/api/styling/payment-methods", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as { countryCode?: unknown };
  const countryCode = /^[A-Z]{2}$/.test(String(body.countryCode)) ? String(body.countryCode) : "FR";
  const selected = await selectedSecrets(context, c.req.raw);
  if (!selected.secrets.merchantAccount) {
    return c.json({ error: "The server needs an Adyen TEST merchant account." }, 409);
  }
  const response = await new AdyenTestClient(selected.secrets).paymentMethods({
    merchantAccount: selected.secrets.merchantAccount,
    countryCode,
    amount: { value: 10999, currency: "EUR" },
    channel: "Web",
  });
  const methods = (response as { paymentMethods?: Array<{ type: string; name: string }> })
    .paymentMethods ?? [];
  return c.json({ paymentMethods: methods.map(({ type, name }) => ({ type, name })) });
});

api.post("/api/styling/session", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as {
    countryCode?: unknown;
    shopperLocale?: unknown;
  };
  const countryCode = /^[A-Z]{2}$/.test(String(body.countryCode)) ? String(body.countryCode) : "FR";
  const shopperLocale = /^[a-z]{2}-[A-Z]{2}$/.test(String(body.shopperLocale))
    ? String(body.shopperLocale)
    : "en-US";
  const selected = await selectedSecrets(context, c.req.raw);
  if (!selected.secrets.merchantAccount || !selected.secrets.clientKey) {
    return c.json({
      error: "The server needs ADYEN_API_KEY, ADYEN_MERCHANT_ACCOUNT and a TEST client key.",
    }, 409);
  }
  const order = context.repository.createOrder({
    appId: "styling",
    flow: "v6-styling-dropin",
    amount: { value: 10999, currency: "EUR" },
  });
  const addresses = buildCheckoutAddresses({ countryCode });
  const request = {
    merchantAccount: selected.secrets.merchantAccount,
    amount: order.amount,
    reference: order.reference,
    countryCode,
    shopperLocale,
    shopperReference: weeklyShopperReference(),
    shopperEmail: resolveShopperEmail(),
    // Required for line-item-aware methods (Klarna and other BNPL) to be
    // considered eligible at all — without it they're silently excluded.
    lineItems: buildLineItems(order.amount),
    // Lets the shopper opt in to saving the card (shown as a checkbox in the
    // Card component) so the "save card" / cardOnFile UI can be previewed.
    storePaymentMethodMode: "askForConsent",
    recurringProcessingModel: "CardOnFile",
    channel: "Web",
    returnUrl: `${context.config.publicOrigin}/`,
    billingAddress: addresses.billingAddress,
    deliveryAddress: {
      ...addresses.deliveryAddress,
      firstName: "Test",
      lastName: "Shopper",
    },
    ...sessionRiskFields(countryCode),
  };
  const started = performance.now();
  try {
    const response = await new AdyenTestClient(selected.secrets).sessions(
      request,
      crypto.randomUUID(),
    );
    context.repository.recordApiCall({
      appId: "styling",
      correlationId: order.id,
      name: "Checkout API /sessions",
      method: "POST",
      endpoint: "https://checkout-test.adyen.com/v72/sessions",
      status: 200,
      durationMs: Math.round(performance.now() - started),
      request,
      response,
    });
    context.repository.createSession({
      orderId: order.id,
      kind: "v6-styling-dropin",
      adyenSessionId: String((response as { id?: string }).id ?? ""),
      state: "created",
      expiresAt: String((response as { expiresAt?: string }).expiresAt ?? ""),
    });
    return c.json({ correlationId: order.id, session: response }, 201);
  } catch (error) {
    context.repository.recordApiCall({
      appId: "styling",
      correlationId: order.id,
      name: "Checkout API /sessions",
      method: "POST",
      endpoint: "https://checkout-test.adyen.com/v72/sessions",
      status: 500,
      durationMs: Math.round(performance.now() - started),
      request,
      response: {},
      error: error instanceof Error ? error.message : "Session request failed.",
    });
    throw error;
  }
});
