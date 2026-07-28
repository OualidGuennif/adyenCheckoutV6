import { PageHeader } from "@suite/ui/components.tsx";
import { AgenticLayout } from "../components/Layout.tsx";
import AgenticProfileManager from "../islands/AgenticProfileManager.tsx";
import { define } from "../utils.ts";

export default define.page(function SettingsPage() {
  return (
    <AgenticLayout path="/settings">
      <PageHeader
        eyebrow="Future-ready configuration"
        title="Profiles & integration boundary"
        description="Store TEST payment credentials and a future pilot bearer server-side. No unverified agentic endpoint is called."
      />
      <AgenticProfileManager />
    </AgenticLayout>
  );
});
