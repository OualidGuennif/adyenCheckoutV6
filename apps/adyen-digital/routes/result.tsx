import { Callout, PageHeader } from "@suite/ui/components.tsx";
import { DigitalLayout } from "../components/Layout.tsx";
import { define } from "../utils.ts";

export default define.page(function ResultPage({ url }) {
  const orderId = url.searchParams.get("orderId") ?? "unknown";
  return (
    <DigitalLayout path="">
      <PageHeader
        eyebrow="Redirect return"
        title="Shopper returned to the playground"
        description="The redirect is part of the payment-method flow. The final business outcome still comes from verified webhooks."
      />
      <Callout title="Correlation">
        <p>
          Order <code>{orderId}</code>{" "}
          is still being observed. Open the Back Office to inspect its timeline.
        </p>
        <a class="button button--secondary" href={`/back-office?orderId=${orderId}`}>
          Open correlated order
        </a>
      </Callout>
    </DigitalLayout>
  );
});
