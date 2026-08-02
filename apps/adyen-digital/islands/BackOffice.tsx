import { apiFetch, formatMinorAmount, prettyJson } from "@suite/ui/client.ts";
import { EmptyState, StatusPill } from "@suite/ui/components.tsx";
import { useEffect, useState } from "preact/hooks";

interface Permission {
  allowed: boolean;
  reason: string;
}

interface Order {
  id: string;
  reference: string;
  flow: string;
  state: string;
  amount: { value: number; currency: string };
  paidValue: number;
  createdAt: string;
  attempts: Array<{
    id: string;
    state: string;
    paymentMethod?: string;
    pspReference?: string;
    refusalReason?: string;
  }>;
  permissions: {
    capture: Permission;
    cancel: Permission;
    refund: Permission;
  };
}

interface TimelineEntry {
  id: string;
  kind: string;
  name: string;
  status: string;
  occurredAt: string;
  durationMs?: number;
  payload: unknown;
}

function tone(state: string): "positive" | "warning" | "danger" | "info" | "neutral" {
  if (["paid", "authorised", "hmac-valid"].includes(state)) return "positive";
  if (["open", "payment_pending", "partially_paid", "received"].includes(state)) return "warning";
  if (["failed", "refused", "expired", "cancelled", "hmac-invalid"].includes(state)) {
    return "danger";
  }
  return "neutral";
}

const PAGE_SIZE = 10;
const MAX_PAGES = 7;

export default function BackOffice() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  async function refresh() {
    const response = await apiFetch<{ orders: Order[] }>("/api/digital/orders");
    setOrders(response.orders);
    const queryId = new URLSearchParams(globalThis.location.search).get("orderId");
    setSelectedId((current) =>
      current ??
        (queryId && response.orders.some((order) => order.id === queryId)
          ? queryId
          : response.orders[0]?.id ?? null)
    );
    if (queryId) {
      const index = response.orders.findIndex((order) => order.id === queryId);
      if (index >= 0) setPage(Math.floor(index / PAGE_SIZE) + 1);
    }
  }

  useEffect(() => {
    refresh()
      .catch((cause) => setError(cause instanceof Error ? cause.message : "Load failed."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    apiFetch<{ entries: TimelineEntry[] }>(`/api/timeline/${selectedId}`)
      .then((response) => setTimeline(response.entries))
      .catch((cause) => setError(cause instanceof Error ? cause.message : "Timeline failed."));
  }, [selectedId, orders]);

  async function runAction(action: "capture" | "cancel" | "refund") {
    if (!selectedId) return;
    setActionLoading(action);
    setError(null);
    try {
      await apiFetch(`/api/digital/orders/${selectedId}/actions/${action}`, {
        method: "POST",
        headers: { "Idempotency-Key": crypto.randomUUID() },
        body: JSON.stringify({}),
      });
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Action failed.");
    } finally {
      setActionLoading(null);
    }
  }

  const selected = orders.find((order) => order.id === selectedId);
  const paidOrders = orders.filter((order) => order.state === "paid").length;
  const openOrders =
    orders.filter((order) => ["open", "payment_pending", "partially_paid"].includes(order.state))
      .length;
  const refusedAttempts =
    orders.flatMap((order) => order.attempts).filter((attempt) => attempt.state === "refused")
      .length;
  const pageCount = Math.min(MAX_PAGES, Math.max(1, Math.ceil(orders.length / PAGE_SIZE)));
  const safePage = Math.min(page, pageCount);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const pageOrders = orders.slice(pageStart, pageStart + PAGE_SIZE);

  if (loading) return <p aria-live="polite">Loading correlated payment records…</p>;
  if (!orders.length) {
    return (
      <EmptyState
        title="No payment records yet"
        description="Start a Sessions, Advanced, Pay by Link, MIT or API Only flow. It will appear here without redirecting the shopper."
      >
        <a class="button button--primary" href="/sessions">Start a Sessions flow</a>
      </EmptyState>
    );
  }

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
      <div class="metrics">
        <div class="metric">
          <span>Total orders</span>
          <strong>{orders.length}</strong>
        </div>
        <div class="metric">
          <span>Open / pending</span>
          <strong>{openOrders}</strong>
        </div>
        <div class="metric">
          <span>Paid</span>
          <strong>{paidOrders}</strong>
        </div>
        <div class="metric">
          <span>Refused attempts</span>
          <strong>{refusedAttempts}</strong>
        </div>
      </div>
      <div class="two-column">
        <section class="panel orders-panel">
          <div class="panel__header orders-panel__header">
            <div>
              <span class="eyebrow">Orders</span>
              <h2>
                {pageStart + 1}–{Math.min(pageStart + PAGE_SIZE, orders.length)} of {orders.length}
              </h2>
            </div>
          </div>
          <div class="table-shell">
            <table>
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Flow</th>
                  <th>Amount</th>
                  <th>State</th>
                </tr>
              </thead>
              <tbody>
                {pageOrders.map((order) => (
                  <tr
                    class={selectedId === order.id ? "is-selected" : undefined}
                    onClick={() => setSelectedId(order.id)}
                  >
                    <td>
                      <button
                        class="button button--quiet button--small"
                        type="button"
                        onClick={() => setSelectedId(order.id)}
                        aria-pressed={selectedId === order.id}
                      >
                        {order.reference.slice(0, 18)}
                      </button>
                      <div class="mono">{new Date(order.createdAt).toLocaleString()}</div>
                    </td>
                    <td>{order.flow}</td>
                    <td>{formatMinorAmount(order.amount.value, order.amount.currency)}</td>
                    <td>
                      <StatusPill tone={tone(order.state)}>{order.state}</StatusPill>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {pageCount > 1
            ? (
              <nav class="pagination" aria-label="Orders pagination">
                <button
                  class="button button--quiet button--small"
                  type="button"
                  disabled={safePage === 1}
                  onClick={() => setPage(safePage - 1)}
                >
                  Previous
                </button>
                <div class="pagination__pages">
                  {Array.from({ length: pageCount }, (_, index) => index + 1).map((number) => (
                    <button
                      key={number}
                      class="button button--quiet button--small pagination__page"
                      type="button"
                      aria-current={number === safePage ? "page" : undefined}
                      onClick={() => setPage(number)}
                    >
                      {number}
                    </button>
                  ))}
                </div>
                <button
                  class="button button--quiet button--small"
                  type="button"
                  disabled={safePage === pageCount}
                  onClick={() => setPage(safePage + 1)}
                >
                  Next
                </button>
              </nav>
            )
            : null}
        </section>
        {selected
          ? (
            <section class="panel digital-order-detail">
              <div class="panel__header">
                <div>
                  <span class="eyebrow">Correlated order</span>
                  <h2>{selected.reference}</h2>
                  <p class="mono">{selected.id}</p>
                </div>
                <StatusPill tone={tone(selected.state)}>{selected.state}</StatusPill>
              </div>
              <div class="three-column">
                {(["capture", "cancel", "refund"] as const).map((action) => {
                  const permission = selected.permissions[action];
                  return (
                    <button
                      class="button button--secondary"
                      type="button"
                      disabled={!permission.allowed || Boolean(actionLoading)}
                      title={permission.reason}
                      aria-describedby={`${action}-reason`}
                      onClick={() => runAction(action)}
                    >
                      {actionLoading === action ? "Submitting…" : action}
                      <span id={`${action}-reason`} class="sr-only">{permission.reason}</span>
                    </button>
                  );
                })}
              </div>
              <div>
                <h3>Attempts</h3>
                <div class="table-shell">
                  <table>
                    <thead>
                      <tr>
                        <th>Method</th>
                        <th>PSP reference</th>
                        <th>State</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selected.attempts.map((attempt) => (
                        <tr>
                          <td>{attempt.paymentMethod ?? ", "}</td>
                          <td class="mono">{attempt.pspReference ?? "pending"}</td>
                          <td>
                            <StatusPill tone={tone(attempt.state)}>{attempt.state}</StatusPill>
                            {attempt.refusalReason ? <div>{attempt.refusalReason}</div> : null}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div>
                <h3>Lifecycle timeline</h3>
                <div class="timeline">
                  {timeline.map((entry) => (
                    <article class="timeline-entry">
                      <header>
                        <strong>{entry.name}</strong>
                        <StatusPill tone={tone(entry.status)}>{entry.kind}</StatusPill>
                      </header>
                      <p>
                        {new Date(entry.occurredAt).toLocaleString()}
                        {entry.durationMs ? ` · ${entry.durationMs} ms` : ""}
                      </p>
                      <details>
                        <summary>Sanitized payload</summary>
                        <pre class="code-block">{prettyJson(entry.payload)}</pre>
                      </details>
                    </article>
                  ))}
                </div>
              </div>
            </section>
          )
          : null}
      </div>
    </>
  );
}
