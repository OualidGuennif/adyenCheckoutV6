import { DisclaimerPage } from "@suite/ui/components.tsx";
import { DigitalLayout } from "../components/Layout.tsx";
import { define } from "../utils.ts";

export default define.page(function Disclaimer() {
  return (
    <DigitalLayout path="/disclaimer">
      <DisclaimerPage
        appName="Adyen Digital"
        repositoryUrl="https://github.com/OualidGuennif/adyenCheckoutV6"
      />
    </DigitalLayout>
  );
});
