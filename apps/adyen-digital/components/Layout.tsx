import { AppShell } from "@suite/ui/components.tsx";
import type { ComponentChildren } from "preact";

export function DigitalLayout(props: {
  path: string;
  children: ComponentChildren;
  ownTestingDataset?: boolean;
}) {
  return (
    <AppShell
      title="Digital Checkout"
      subtitle="Online payment lifecycle"
      currentPath={props.path}
      ownTestingDataset={props.ownTestingDataset}
    >
      {props.children}
    </AppShell>
  );
}
