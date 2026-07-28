import { AppShell } from "@suite/ui/components.tsx";
import type { ComponentChildren } from "preact";

export function AgenticLayout(props: { path: string; children: ComponentChildren }) {
  return (
    <AppShell
      title="Agentic Commerce"
      subtitle="Governed commerce orchestration"
      currentPath={props.path}
    >
      {props.children}
    </AppShell>
  );
}
