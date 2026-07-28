import { PageHeader, StatusPill } from "@suite/ui/components.tsx";
import { DigitalLayout } from "../components/Layout.tsx";
import { define } from "../utils.ts";

interface FlowAction {
  label: string;
  href: string;
  primary?: boolean;
}

interface FlowCard {
  title: string;
  subtitle: string;
  caption: string;
  actions: FlowAction[];
}

const flowRows: FlowCard[][] = [
  [
    {
      title: "Sessions Flow",
      subtitle: "The simplest PCI-conscious integration. Adyen Web manages 3DS and orchestration.",
      caption: "When you want to minimise custom backend logic.",
      actions: [
        { label: "Drop-in", href: "/sessions?integration=dropin", primary: true },
        { label: "Components", href: "/sessions?integration=component" },
      ],
    },
    {
      title: "Advanced Flow",
      subtitle:
        "Own the /paymentMethods, /payments and /payments/details orchestration with callback-level observability.",
      caption: "When you need custom routing, risk logic or advanced UX.",
      actions: [
        { label: "Drop-in", href: "/advanced?integration=dropin", primary: true },
        { label: "Components", href: "/advanced?integration=component" },
      ],
    },
  ],
  [
    {
      title: "API Only / PCI",
      subtitle: "Custom UI with encrypted card fields and full backend orchestration.",
      caption: "For custom card experiences with browser-side encryption.",
      actions: [{ label: "Open API-only demo", href: "/api-only", primary: true }],
    },
    {
      title: "MIT — Merchant Initiated Transactions",
      subtitle: "Charge a stored card without shopper interaction using tokenised credentials.",
      caption: "Useful for MIT, retries and subscription-like flows.",
      actions: [{ label: "Open MIT tool", href: "/mit", primary: true }],
    },
  ],
  [
    {
      title: "Pay by Link",
      subtitle: "Create a payment link via API using the selected country and locale.",
      caption: "Good for invoices, remote payments and quick tests.",
      actions: [{ label: "Create a payment link", href: "/pay-by-link", primary: true }],
    },
    {
      title: "E-commerce Back Office",
      subtitle:
        "Inspect correlated callbacks, API calls, attempts, webhooks and lifecycle actions.",
      caption: "Best for payment monitoring, debugging and operational follow-up.",
      actions: [{ label: "Open Back Office", href: "/back-office", primary: true }],
    },
  ],
];

export default define.page(function Home() {
  return (
    <DigitalLayout path="/">
      <PageHeader
        eyebrow="Payment lifecycle explorer"
        title="Choose a payment scenario"
        description="Pick a flow and an integration type, or explore the commerce demos and admin tools."
        actions={<StatusPill tone="positive">TEST profile ready</StatusPill>}
      />
      <div class="flows-layout">
        {flowRows.map((row, rowIndex) => (
          <div class="flows-row" key={rowIndex}>
            {row.map((card) => (
              <article class="flow-card-simple" key={card.title}>
                <h2>{card.title}</h2>
                <p class="flow-subtitle">{card.subtitle}</p>
                <div
                  class={`flow-actions ${card.actions.length === 1 ? "flow-actions--single" : ""}`}
                >
                  {card.actions.map((action) => (
                    <a
                      key={action.href}
                      href={action.href}
                      class={action.primary ? "flow-link-primary" : "flow-link-secondary"}
                    >
                      {action.label}
                    </a>
                  ))}
                </div>
                <p class="flow-caption">{card.caption}</p>
              </article>
            ))}
          </div>
        ))}
      </div>
    </DigitalLayout>
  );
});
