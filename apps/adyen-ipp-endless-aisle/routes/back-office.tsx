import { PageHeader } from "@suite/ui/components.tsx";
import { IppLayout } from "../components/Layout.tsx";
import TerminalBackOffice from "../islands/TerminalBackOffice.tsx";
import { define } from "../utils.ts";

export default define.page(function BackOfficePage() {
  return (
    <IppLayout path="/back-office">
      <PageHeader
        eyebrow="Reconciliation"
        title="IPP Back Office"
        description="Correlate Cloud Device API requests, sanitized responses, asynchronous terminal notifications and operator actions."
      />
      <TerminalBackOffice />
    </IppLayout>
  );
});
