import { PageHeader } from "@suite/ui/components.tsx";
import { DigitalLayout } from "../components/Layout.tsx";
import ProfileManager from "../islands/ProfileManager.tsx";
import { define } from "../utils.ts";

export default define.page(function SettingsPage() {
  return (
    <DigitalLayout path="/settings">
      <PageHeader
        eyebrow="Server-side configuration"
        title="Profiles & security"
        description="The default profile is loaded from server environment variables. Custom secrets are encrypted at rest and are never returned by the API."
      />
      <ProfileManager />
    </DigitalLayout>
  );
});
