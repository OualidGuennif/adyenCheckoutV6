import { AppShell } from "@suite/ui/components.tsx";
import type { ComponentChildren } from "preact";

export function DigitalLayout(props: {
  path: string;
  children: ComponentChildren;
}) {
  return (
    <AppShell
      title="Adyen Digital"
      subtitle="Online payment lifecycle"
      currentPath={props.path}
    >
      {props.children}
    </AppShell>
  );
}
