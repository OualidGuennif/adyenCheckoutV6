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

interface Order {
  id: string;
  reference: string;
  flow: string;
  state: string;
  amount: { value: number; currency: string };
  createdAt: string;
  attempts: Array<{ state: string; pspReference?: string }>;
  timeline: Entry[];
}

export default function TerminalBackOffice({ compact = false }: { compact?: boolean }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<{ orders: Order[] }>("/api/ipp/orders").then((response) => {
      setOrders(response.orders);
      const requested = new URLSearchParams(location.search).get("orderId");
      setSelectedId(
        requested && response.orders.some((order) => order.id === requested)
          ? requested
          : response.orders[0]?.id ?? null,
      );
    }).catch((cause) => setError(cause instanceof Error ? cause.message : "Load failed."));
  }, []);

  if (!orders.length && !error) {
    return (
      <EmptyState
        title="No terminal transactions yet"
        description="Create an Endless Aisle basket and run an explicit mock or Real TEST transaction."
      />
    );
  }
  const selected = orders.find((order) => order.id === selectedId);

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
                <th>Reference</th>
                <th>Mode</th>
                <th>Amount</th>
                <th>State</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr>
                  <td>
                    <button
                      class="button button--quiet button--small"
                      type="button"
                      onClick={() => setSelectedId(order.id)}
                    >
                      {order.reference.slice(0, 20)}
                    </button>
                    <div class="mono">{new Date(order.createdAt).toLocaleString()}</div>
                  </td>
                  <td>{order.flow.includes("mock") ? "Local mock" : "Real TEST"}</td>
                  <td>{formatMinorAmount(order.amount.value, order.amount.currency)}</td>
                  <td>
                    <StatusPill tone={order.state === "paid" ? "positive" : "warning"}>
                      {order.state}
                    </StatusPill>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        {!compact && selected
          ? (
            <section class="panel">
              <div class="panel__header">
                <div>
                  <h2>{selected.reference}</h2>
                  <p class="mono">{selected.id}</p>
                </div>
                <StatusPill tone={selected.flow.includes("mock") ? "info" : "warning"}>
                  {selected.flow.includes("mock") ? "Simulated" : "Adyen TEST"}
                </StatusPill>
              </div>
              <div class="timeline">
                {selected.timeline.map((entry) => (
                  <article class="timeline-entry">
                    <header>
                      <strong>{entry.name}</strong>
                      <StatusPill>{entry.kind}</StatusPill>
                    </header>
                    <p>{new Date(entry.occurredAt).toLocaleString()}</p>
                    <details>
                      <summary>Sanitized payload</summary>
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
