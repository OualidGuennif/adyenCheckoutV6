import { PageHeader } from "@suite/ui/components.tsx";
import { IppLayout } from "../components/Layout.tsx";
import TerminalBackOffice from "../islands/TerminalBackOffice.tsx";
import { define } from "../utils.ts";

export default define.page(function HistoryPage() {
  return (
    <IppLayout path="/history">
      <PageHeader
        eyebrow="Store operations"
        title="Terminal history"
        description="Recent Endless Aisle transactions, including explicit simulation labels and TEST terminal outcomes."
      />
      <TerminalBackOffice compact />
    </IppLayout>
  );
});
