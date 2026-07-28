import { PageHeader, StatusPill } from "@suite/ui/components.tsx";
import { IppLayout } from "../components/Layout.tsx";
import TerminalWorkspace from "../islands/TerminalWorkspace.tsx";
import { define } from "../utils.ts";

export default define.page(function Home() {
  return (
    <IppLayout path="/">
      <PageHeader
        eyebrow="In-person payments"
        title="Endless Aisle checkout"
        description="Build a basket from warehouse inventory, associate a TEST terminal and follow the Cloud Device API request from POS intent to final result."
        actions={
          <>
            <a class="button button--quiet button--small" href="/history">History</a>
            <StatusPill tone="info">Mock + Real TEST</StatusPill>
          </>
        }
      />
      <TerminalWorkspace />
    </IppLayout>
  );
});
