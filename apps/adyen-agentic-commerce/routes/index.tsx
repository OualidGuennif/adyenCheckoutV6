import { PageHeader, StatusPill } from "@suite/ui/components.tsx";
import { AgenticLayout } from "../components/Layout.tsx";
import AgenticPlayground from "../islands/AgenticPlayground.tsx";
import { define } from "../utils.ts";

export default define.page(function Home() {
  return (
    <AgenticLayout path="/">
      <PageHeader
        eyebrow="Merchant-controlled AI commerce"
        title="Inspect every delegated decision before payment."
        description="A transparent local agentic mock, a real merchant catalogue, and an optional human-confirmed Adyen TEST checkout, without fabricating provider responses."
        actions={
          <>
            <a class="button button--quiet button--small" href="/history">Run history</a>
            <StatusPill tone="info">Pilot-aware</StatusPill>
          </>
        }
      />
      <AgenticPlayground />
    </AgenticLayout>
  );
});
