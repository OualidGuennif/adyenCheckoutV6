import { DisclaimerPage } from "@suite/ui/components.tsx";
import { AgenticLayout } from "../components/Layout.tsx";
import { define } from "../utils.ts";

export default define.page(function Disclaimer() {
  return (
    <AgenticLayout path="/disclaimer">
      <DisclaimerPage
        appName="Agentic Commerce"
        repositoryUrl="https://github.com/OualidGuennif/adyenCheckoutV6"
      />
    </AgenticLayout>
  );
});
