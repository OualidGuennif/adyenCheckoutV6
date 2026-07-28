import { AppShell } from "@suite/ui/components.tsx";
import type { ComponentChildren } from "preact";

export function IppLayout(props: { path: string; children: ComponentChildren }) {
  return (
    <AppShell
      title="IPP Endless Aisle"
      subtitle="Terminal payments"
      currentPath={props.path}
    >
      {props.children}
    </AppShell>
  );
}
