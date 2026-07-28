import { PageHeader } from "@suite/ui/components.tsx";
import { DigitalLayout } from "../components/Layout.tsx";
import BackOffice from "../islands/BackOffice.tsx";
import { define } from "../utils.ts";

export default define.page(function BackOfficePage() {
  return (
    <DigitalLayout path="/back-office">
      <PageHeader
        eyebrow="Operations"
        title="E-commerce Back Office"
        description="A correlated, auditable view of each order, attempt, payment part, callback, API call, webhook and permitted lifecycle action."
      />
      <BackOffice />
    </DigitalLayout>
  );
});
