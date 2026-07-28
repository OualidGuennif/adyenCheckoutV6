import { apiFetch, formatMinorAmount, prettyJson } from "@suite/ui/client.ts";
import { Callout, StatusPill } from "@suite/ui/components.tsx";
import { useEffect, useMemo, useState } from "preact/hooks";

interface Product {
  id: string;
  name: string;
  price: number;
  currency: string;
  stock: string;
}

interface Profile {
  id: string;
  label: string;
  isConfigured: boolean;
  missingFields: string[];
}

interface Bootstrap {
  profile: Profile;
  profiles: Profile[];
  webhookUrl: string;
}

interface Line {
  productId: string;
  quantity: number;
}

export default function TerminalWorkspace() {
  const [products, setProducts] = useState<Product[]>([]);
  const [bootstrap, setBootstrap] = useState<Bootstrap | null>(null);
  const [profileId, setProfileId] = useState("default");
  const [lines, setLines] = useState<Line[]>([]);
  const [mode, setMode] = useState<"mock" | "real-test">("mock");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [correlationId, setCorrelationId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      apiFetch<{ products: Product[] }>("/api/ipp/catalogue"),
      apiFetch<Bootstrap>("/api/bootstrap"),
    ]).then(([catalogue, boot]) => {
      setProducts(catalogue.products);
      setBootstrap(boot);
      setProfileId(boot.profile.id);
    }).catch((cause) => setError(cause instanceof Error ? cause.message : "Load failed."));
  }, []);

  const total = useMemo(() =>
    lines.reduce((sum, line) => {
      const product = products.find((candidate) => candidate.id === line.productId);
      return sum + (product?.price ?? 0) * line.quantity;
    }, 0), [lines, products]);

  function add(productId: string) {
    setLines((current) => {
      const existing = current.find((line) => line.productId === productId);
      return existing
        ? current.map((line) =>
          line.productId === productId ? { ...line, quantity: line.quantity + 1 } : line
        )
        : [...current, { productId, quantity: 1 }];
    });
  }

  function remove(productId: string) {
    setLines((current) => current.filter((line) => line.productId !== productId));
  }

  async function selectProfile(id: string) {
    await apiFetch("/api/profiles/preferred", {
      method: "POST",
      body: JSON.stringify({ profileId: id }),
    });
    const boot = await apiFetch<Bootstrap>("/api/bootstrap");
    setBootstrap(boot);
    setProfileId(boot.profile.id);
  }

  async function pay() {
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      const response = await apiFetch<{
        correlationId: string;
        response: Record<string, unknown>;
      }>("/api/ipp/payments", {
        method: "POST",
        body: JSON.stringify({ lines, mode }),
      }, profileId);
      setCorrelationId(response.correlationId);
      setResult(response.response);
      setLines([]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Terminal request failed.");
    } finally {
      setLoading(false);
    }
  }

  const selectedProfile = bootstrap?.profiles.find((profile) => profile.id === profileId);

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
      <div class="two-column">
        <section class="panel">
          <div class="panel__header">
            <div>
              <h2>Warehouse catalogue</h2>
              <p>Items unavailable on the shop floor but orderable through Endless Aisle.</p>
            </div>
            <StatusPill>{products.length} products</StatusPill>
          </div>
          <div class="profile-list">
            {products.map((product) => (
              <article class="profile-row">
                <div>
                  <strong>{product.name}</strong>
                  <p>
                    {product.id} · {product.stock} ·{" "}
                    {formatMinorAmount(product.price, product.currency)}
                  </p>
                </div>
                <button
                  class="button button--secondary button--small"
                  type="button"
                  onClick={() => add(product.id)}
                >
                  Add
                </button>
              </article>
            ))}
          </div>
        </section>
        <section class="panel">
          <div class="panel__header">
            <div>
              <h2>Order & terminal</h2>
              <p>Review the basket, then choose an explicit execution mode.</p>
            </div>
            <StatusPill tone={mode === "mock" ? "info" : "warning"}>
              {mode === "mock" ? "Local mock" : "Real TEST"}
            </StatusPill>
          </div>
          <details class="scenario-settings">
            <summary>
              <span class="scenario-settings__title">
                <strong>Terminal &amp; profile settings</strong>
                <span>
                  {mode === "mock" ? "Local realistic mock" : "Real Adyen TEST terminal"} ·{" "}
                  {selectedProfile?.label ?? "Loading profile"}
                </span>
              </span>
            </summary>
            <div class="scenario-settings__body">
              <div class="form-grid">
                <div class="field">
                  <label for="ipp-profile">TEST profile</label>
                  <select
                    id="ipp-profile"
                    value={profileId}
                    onChange={(event) => selectProfile(event.currentTarget.value)}
                  >
                    {bootstrap?.profiles.map((profile) => (
                      <option key={profile.id} value={profile.id}>
                        {profile.label}
                        {profile.isConfigured ? "" : " — incomplete"}
                      </option>
                    ))}
                  </select>
                </div>
                <div class="field">
                  <label for="ipp-mode">Execution mode</label>
                  <select
                    id="ipp-mode"
                    value={mode}
                    onChange={(event) => setMode(event.currentTarget.value as "mock" | "real-test")}
                  >
                    <option value="mock">Local realistic mock</option>
                    <option value="real-test">Real Adyen TEST terminal</option>
                  </select>
                </div>
              </div>
              {mode === "real-test"
                ? (
                  <Callout title="Real TEST call" tone="warning">
                    This sends a synchronous request to the configured TEST terminal and can wait
                    over 150 seconds. It never falls back silently to mock.
                  </Callout>
                )
                : (
                  <Callout title="Simulation boundary">
                    The response is generated locally and labeled{" "}
                    <code>local-terminal-simulator</code>. No Adyen endpoint is called.
                  </Callout>
                )}
            </div>
          </details>
          <div class="profile-list">
            {lines.length
              ? lines.map((line) => {
                const product = products.find((candidate) => candidate.id === line.productId)!;
                return (
                  <article class="profile-row basket-line">
                    <div>
                      <strong>{product.name}</strong>
                      <p>{formatMinorAmount(product.price, product.currency)} each</p>
                    </div>
                    <span>× {line.quantity}</span>
                    <button
                      class="button button--danger button--small"
                      type="button"
                      onClick={() => remove(line.productId)}
                    >
                      Remove
                    </button>
                  </article>
                );
              })
              : <p>Your basket is empty.</p>}
          </div>
          <div class="checkout-context">
            <strong>Total</strong>
            <strong>{formatMinorAmount(total, "EUR")}</strong>
          </div>
          <button
            class="button button--primary"
            type="button"
            disabled={!lines.length || loading ||
              (mode === "real-test" && !selectedProfile?.isConfigured)}
            onClick={pay}
          >
            {loading ? "Waiting for terminal…" : "Start terminal payment"}
          </button>
          {result
            ? (
              <div class="panel">
                <h3>Result</h3>
                <pre class="code-block">{prettyJson(result)}</pre>
                <a class="button button--secondary" href={`/back-office?orderId=${correlationId}`}>
                  Open correlated Back Office
                </a>
              </div>
            )
            : null}
        </section>
      </div>
    </>
  );
}
