import { DigitalLayout } from "../components/Layout.tsx";
import { define } from "../utils.ts";

interface FlowCard {
  title: string;
  subtitle: string;
  href: string;
}

const flows: FlowCard[] = [
  {
    title: "Sessions Flow",
    subtitle: "The simplest PCI-conscious integration — Adyen Web manages 3DS and orchestration.",
    href: "/sessions?integration=dropin",
  },
  {
    title: "Advanced Flow",
    subtitle: "Own the /paymentMethods, /payments and /payments/details orchestration.",
    href: "/advanced?integration=dropin",
  },
  {
    title: "API Only / PCI",
    subtitle: "Custom UI with encrypted card fields and full backend orchestration.",
    href: "/api-only",
  },
  {
    title: "MIT — Merchant Initiated Transactions",
    subtitle: "Charge a stored card without shopper interaction using tokenised credentials.",
    href: "/mit",
  },
  {
    title: "Pay by Link",
    subtitle: "Create a payment link via API using the selected country and locale.",
    href: "/pay-by-link",
  },
  {
    title: "E-commerce Back Office",
    subtitle: "Inspect correlated callbacks, API calls, attempts, webhooks and lifecycle actions.",
    href: "/back-office",
  },
];

export default define.page(function Home() {
  return (
    <DigitalLayout path="/">
      <div class="flows-grid">
        {flows.map((flow) => (
          <a class="flow-card-simple" key={flow.href} href={flow.href}>
            <div>
              <h2>{flow.title}</h2>
              <p class="flow-subtitle">{flow.subtitle}</p>
            </div>
            <span class="flow-card-arrow" aria-hidden="true">→</span>
          </a>
        ))}
      </div>
    </DigitalLayout>
  );
});
