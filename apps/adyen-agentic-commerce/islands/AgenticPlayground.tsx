import { AdyenCheckout, Dropin } from "@adyen/adyen-web";
import { apiFetch, formatMinorAmount, prettyJson } from "@suite/ui/client.ts";
import { Callout, Field, StatusPill } from "@suite/ui/components.tsx";
import { isNonFatalWalletError } from "@suite/ui/paymentMethods.ts";
import "@suite/ui/registerPaymentMethods.ts";
import { useEffect, useRef, useState } from "preact/hooks";

interface Profile {
  id: string;
  label: string;
  isConfigured: boolean;
}

interface Bootstrap {
  profile: Profile;
  profiles: Profile[];
  clientKey: string | null;
}

interface Step {
  id: string;
  name: string;
  status: "executed" | "simulated" | "unavailable";
  system: string;
  summary: string;
  payload: Record<string, unknown>;
}

interface Run {
  mode: "mock";
  intent: string;
  selectedOffer: {
    id: string;
    name: string;
    description: string;
    price: number;
    currency: string;
  };
  steps: Step[];
}

interface Mounted {
  unmount(): void;
}

export default function AgenticPlayground() {
  const [bootstrap, setBootstrap] = useState<Bootstrap | null>(null);
  const [profileId, setProfileId] = useState("default");
  const [intent, setIntent] = useState(
    "Find a weekend trip to Amsterdam under EUR 350 with a flexible rail ticket.",
  );
  const [mode, setMode] = useState<"mock" | "real">("mock");
  const [run, setRun] = useState<Run | null>(null);
  const [correlationId, setCorrelationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const checkoutHost = useRef<HTMLDivElement>(null);
  const mounted = useRef<Mounted | null>(null);

  useEffect(() => {
    apiFetch<Bootstrap>("/api/bootstrap").then((response) => {
      setBootstrap(response);
      setProfileId(response.profile.id);
    }).catch((cause) => setError(cause instanceof Error ? cause.message : "Load failed."));
    return () => mounted.current?.unmount();
  }, []);

  async function selectProfile(id: string) {
    await apiFetch("/api/profiles/preferred", {
      method: "POST",
      body: JSON.stringify({ profileId: id }),
    });
    const response = await apiFetch<Bootstrap>("/api/bootstrap");
    setBootstrap(response);
    setProfileId(response.profile.id);
  }

  async function execute() {
    setLoading(true);
    setError(null);
    setRun(null);
    mounted.current?.unmount();
    mounted.current = null;
    try {
      const response = await apiFetch<{ correlationId: string; run: Run }>(
        "/api/agentic/runs",
        {
          method: "POST",
          body: JSON.stringify({ intent, mode }),
        },
        profileId,
      );
      setCorrelationId(response.correlationId);
      setRun(response.run);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Agentic run failed.");
    } finally {
      setLoading(false);
    }
  }

  async function createCheckout() {
    if (!correlationId || !bootstrap?.clientKey || !checkoutHost.current) return;
    setCheckoutLoading(true);
    setError(null);
    try {
      const response = await apiFetch<{
        session: { id: string; sessionData: string };
        boundary: Record<string, unknown>;
      }>(`/api/agentic/runs/${correlationId}/checkout-session`, {
        method: "POST",
        body: JSON.stringify({ confirmed: true }),
      }, profileId);
      const checkout = await AdyenCheckout({
        environment: "test",
        clientKey: bootstrap.clientKey,
        session: response.session,
        countryCode: "FR",
        locale: "en-US",
        analytics: { enabled: false },
        onPaymentCompleted: () => undefined,
        onPaymentFailed: () => undefined,
        onError: (cause) => {
          if (isNonFatalWalletError(cause)) return;
          setError(cause.message);
        },
      });
      mounted.current?.unmount();
      checkoutHost.current.replaceChildren();
      const dropin = new Dropin(checkout, { openFirstPaymentMethod: false });
      dropin.mount(checkoutHost.current);
      mounted.current = dropin;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Checkout session failed.");
    } finally {
      setCheckoutLoading(false);
    }
  }

  const selectedProfile = bootstrap?.profiles.find((profile) => profile.id === profileId);

  return (
    <>
      <Callout title="Execution labels">
        Green means locally executed, blue means explicitly simulated, and unavailable means no
        provider request was attempted. A separate Adyen TEST session is labeled independently.
      </Callout>
      {error
        ? (
          <div class="callout callout--danger" role="alert">
            <strong>Boundary enforced</strong>
            <div>{error}</div>
          </div>
        )
        : null}
      <div class="two-column">
        <section class="panel">
          <div class="panel__header">
            <div>
              <h2>Delegated shopping intent</h2>
              <p>
                Define the goal and choose whether to use the executable mock or inspect real-mode
                availability.
              </p>
            </div>
            <StatusPill tone={mode === "mock" ? "info" : "warning"}>
              {mode === "mock" ? "Local mock" : "Unavailable"}
            </StatusPill>
          </div>
          <details class="scenario-settings">
            <summary>
              <span class="scenario-settings__title">
                <strong>Execution settings</strong>
                <span>
                  {mode === "mock" ? "Executable local mock" : "Real-mode availability check"} ·
                  {" "}
                  {selectedProfile?.label ?? "Loading profile"}
                </span>
              </span>
            </summary>
            <div class="scenario-settings__body">
              <div class="form-grid">
                <Field label="TEST profile" htmlFor="agentic-profile">
                  <select
                    id="agentic-profile"
                    value={profileId}
                    onChange={(event) => selectProfile(event.currentTarget.value)}
                  >
                    {bootstrap?.profiles.map((profile) => (
                      <option key={profile.id} value={profile.id}>{profile.label}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Mode" htmlFor="agentic-mode">
                  <select
                    id="agentic-mode"
                    value={mode}
                    onChange={(event) => setMode(event.currentTarget.value as "mock" | "real")}
                  >
                    <option value="mock">Executable local mock</option>
                    <option value="real">Real Agentic — availability check</option>
                  </select>
                </Field>
              </div>
            </div>
          </details>
          <Field
            label="Shopping intent"
            htmlFor="agentic-intent"
            hint="No prompt is sent to an external model."
          >
            <textarea
              id="agentic-intent"
              value={intent}
              onInput={(event) => setIntent(event.currentTarget.value)}
            />
          </Field>
          <div class="form-actions">
            <button
              class="button button--primary"
              type="button"
              disabled={loading}
              onClick={execute}
            >
              {loading
                ? "Evaluating…"
                : mode === "mock"
                ? "Run governed mock"
                : "Check real availability"}
            </button>
          </div>
          {run
            ? (
              <div class="panel">
                <span class="eyebrow">Selected merchant offer</span>
                <h2>{run.selectedOffer.name}</h2>
                <p>{run.selectedOffer.description}</p>
                <strong>
                  {formatMinorAmount(run.selectedOffer.price, run.selectedOffer.currency)}
                </strong>
              </div>
            )
            : null}
        </section>
        <section class="panel">
          <div class="panel__header">
            <div>
              <h2>Orchestration trace</h2>
              <p>Each system boundary states exactly what ran.</p>
            </div>
          </div>
          {run
            ? (
              <div class="timeline">
                {run.steps.map((step) => (
                  <article class="timeline-entry agent-step" data-status={step.status}>
                    <header>
                      <strong>{step.name}</strong>
                      <StatusPill
                        tone={step.status === "executed"
                          ? "positive"
                          : step.status === "simulated"
                          ? "info"
                          : "warning"}
                      >
                        {step.status}
                      </StatusPill>
                    </header>
                    <p>{step.summary}</p>
                    <details>
                      <summary>{step.system} payload</summary>
                      <pre class="code-block">{prettyJson(step.payload)}</pre>
                    </details>
                  </article>
                ))}
              </div>
            )
            : <p>Run an intent to inspect the governed sequence.</p>}
        </section>
      </div>
      {run
        ? (
          <section class="checkout-shell">
            <div class="checkout-context">
              <div>
                <span class="eyebrow">Separate executable boundary</span>
                <h2>Human-confirmed Adyen TEST checkout</h2>
              </div>
              <StatusPill tone="warning">Not Agentic API</StatusPill>
            </div>
            <p>
              This standard Checkout v72 session is available only after the user reviews the local
              offer. It does not claim to be an Agentic Commerce provider response.
            </p>
            <button
              class="button button--primary"
              type="button"
              disabled={checkoutLoading || !selectedProfile?.isConfigured || !bootstrap?.clientKey}
              onClick={createCheckout}
            >
              {checkoutLoading ? "Creating TEST session…" : "Confirm offer and open Drop-in"}
            </button>
            <div class="dropin-host" ref={checkoutHost} />
          </section>
        )
        : null}
    </>
  );
}
