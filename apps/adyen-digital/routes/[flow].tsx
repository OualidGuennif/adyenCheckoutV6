import { page } from "fresh";
import { PageHeader } from "@suite/ui/components.tsx";
import { api } from "../api.ts";
import { DigitalLayout } from "../components/Layout.tsx";
import FlowWorkbench, { type Bootstrap } from "../islands/FlowWorkbench.tsx";
import { define } from "../utils.ts";

const FLOWS = {
  sessions: {
    title: "Sessions — Drop-in & Components",
    description: "Adyen Web manages 3DS and orchestration from a single /sessions call.",
  },
  advanced: {
    title: "Advanced Flow — Drop-in & Components",
    description:
      "The server owns /paymentMethods, /payments and /payments/details; the browser owns only encrypted component state.",
  },
  "pay-by-link": {
    title: "Pay by Link",
    description:
      "A refusal closes an attempt, not the order. Link validity, successful authorisation and terminal webhooks determine closure.",
  },
  mit: {
    title: "MIT — Merchant Initiated Transactions",
    description:
      "Use a storedPaymentMethodId and non-PII shopperReference with ContAuth. Raw card details are not accepted.",
  },
  "api-only": {
    title: "API Only / PCI",
    description:
      "The Custom Card component encrypts card details in Adyen-controlled iframes before the backend receives them.",
  },
} as const;

type FlowKey = keyof typeof FLOWS;

export const handler = define.handlers({
  async GET(ctx) {
    const flow = ctx.params.flow as FlowKey;
    if (!FLOWS[flow]) {
      return new Response("Not found", { status: 404 });
    }
    // Fetching /api/bootstrap in-process (same Hono app, no real network hop)
    // before the first paint removes the client-side fetch-after-hydration
    // gap that used to flash a "loading" state on every flow page.
    const bootstrapRequest = new Request(new URL("/api/bootstrap", ctx.req.url), {
      headers: ctx.req.headers,
    });
    const bootstrapResponse = await api.fetch(bootstrapRequest);
    const bootstrap = await bootstrapResponse.json() as Bootstrap;
    const headers = new Headers();
    for (const cookie of bootstrapResponse.headers.getSetCookie()) {
      headers.append("set-cookie", cookie);
    }
    const integration: "dropin" | "component" =
      new URL(ctx.req.url).searchParams.get("integration") === "component" ? "component" : "dropin";
    return page({ flow, bootstrap, integration }, { headers });
  },
});

export default define.page<typeof handler>(function FlowPage({ data }) {
  const { flow, bootstrap, integration } = data;
  const content = FLOWS[flow];
  return (
    <DigitalLayout path={`/${flow}`}>
      <PageHeader
        title={content.title}
        description={content.description}
        eyebrow="Online payments"
      />
      <FlowWorkbench flow={flow} initialBootstrap={bootstrap} initialIntegration={integration} />
    </DigitalLayout>
  );
});
