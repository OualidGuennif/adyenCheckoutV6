import { PageHeader } from "@suite/ui/components.tsx";
import { AgenticLayout } from "../components/Layout.tsx";
import AgenticBackOffice from "../islands/AgenticBackOffice.tsx";
import { define } from "../utils.ts";

export default define.page(function HistoryPage() {
  return (
    <AgenticLayout path="/history">
      <PageHeader
        eyebrow="Audit trail"
        title="Agentic run history"
        description="Every local decision, simulated external exchange and real Adyen TEST handoff is labeled and retained."
      />
      <AgenticBackOffice compact />
    </AgenticLayout>
  );
});
