import { apiFetch, formatMinorAmount, prettyJson } from "@suite/ui/client.ts";
import { EmptyState, StatusPill } from "@suite/ui/components.tsx";
import { useEffect, useState } from "preact/hooks";

interface Entry {
  id: string;
  kind: string;
  name: string;
  status: string;
  occurredAt: string;
  payload: unknown;
}

interface Run {
  id: string;
  reference: string;
  flow: string;
  state: string;
  amount: { value: number; currency: string };
  createdAt: string;
  timeline: Entry[];
}

export default function AgenticBackOffice({ compact = false }: { compact?: boolean }) {
  const [runs, setRuns] = useState<Run[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<{ runs: Run[] }>("/api/agentic/runs").then((response) => {
      setRuns(response.runs);
      setSelectedId(response.runs[0]?.id ?? null);
    }).catch((cause) => setError(cause instanceof Error ? cause.message : "Load failed."));
  }, []);

  if (!runs.length && !error) {
    return (
      <EmptyState
        title="No agentic runs yet"
        description="Run a governed local mock. Its boundaries and optional Adyen TEST handoff will be retained here."
      />
    );
  }
  const selected = runs.find((run) => run.id === selectedId);
  return (
    <>
      {error
        ? (
          <div class="callout callout--danger" role="alert">
            <strong>Error</strong>
            <div>{error}</div>
          </div>
        )
        : null}
      <div class={compact ? "" : "two-column"}>
        <section class="table-shell">
          <table>
            <thead>
              <tr>
                <th>Run</th>
                <th>Amount</th>
                <th>Mode</th>
                <th>State</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => (
                <tr>
                  <td>
                    <button
                      class="button button--quiet button--small"
                      type="button"
                      onClick={() => setSelectedId(run.id)}
                    >
                      {run.reference.slice(0, 19)}
                    </button>
                    <div class="mono">{new Date(run.createdAt).toLocaleString()}</div>
                  </td>
                  <td>{formatMinorAmount(run.amount.value, run.amount.currency)}</td>
                  <td>
                    <StatusPill tone="info">Local mock</StatusPill>
                  </td>
                  <td>
                    <StatusPill tone="warning">{run.state}</StatusPill>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        {!compact && selected
          ? (
            <section class="panel">
              <h2>{selected.reference}</h2>
              <div class="timeline">
                {selected.timeline.map((entry) => (
                  <article class="timeline-entry">
                    <header>
                      <strong>{entry.name}</strong>
                      <StatusPill
                        tone={entry.status === "200"
                          ? "positive"
                          : entry.status === "501"
                          ? "warning"
                          : "neutral"}
                      >
                        {entry.kind}
                      </StatusPill>
                    </header>
                    <p>{new Date(entry.occurredAt).toLocaleString()}</p>
                    <details>
                      <summary>Recorded exchange</summary>
                      <pre class="code-block">{prettyJson(entry.payload)}</pre>
                    </details>
                  </article>
                ))}
              </div>
            </section>
          )
          : null}
      </div>
    </>
  );
}
