import { DisclaimerPage } from "@suite/ui/components.tsx";
import { IppLayout } from "../components/Layout.tsx";
import { define } from "../utils.ts";

export default define.page(function Disclaimer() {
  return (
    <IppLayout path="/disclaimer">
      <DisclaimerPage
        appName="Endless Aisle"
        repositoryUrl="https://github.com/OualidGuennif/payments-playground"
      />
    </IppLayout>
  );
});
