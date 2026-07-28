import { PageHeader } from "@suite/ui/components.tsx";
import { AgenticLayout } from "../components/Layout.tsx";
import AgenticBackOffice from "../islands/AgenticBackOffice.tsx";
import { define } from "../utils.ts";

export default define.page(function BackOfficePage() {
  return (
    <AgenticLayout path="/back-office">
      <PageHeader
        eyebrow="Governance"
        title="Agentic Commerce Back Office"
        description="Correlate intent, merchant rules, catalogue selection, simulated provider steps, human confirmation and payment lifecycle."
      />
      <AgenticBackOffice />
    </AgenticLayout>
  );
});
