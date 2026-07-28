import { PageHeader } from "@suite/ui/components.tsx";
import { IppLayout } from "../components/Layout.tsx";
import IppProfileManager from "../islands/IppProfileManager.tsx";
import { define } from "../utils.ts";

export default define.page(function SettingsPage() {
  return (
    <IppLayout path="/settings">
      <PageHeader
        eyebrow="Terminal credentials"
        title="TEST profiles & webhook"
        description="API credentials, terminal identifiers and optional webhook authentication remain encrypted and server-side."
      />
      <IppProfileManager />
    </IppLayout>
  );
});
