import { AdyenCheckout, CustomCard, Dropin } from "@adyen/adyen-web";
import type { Core } from "@adyen/adyen-web";
import { apiFetch, formatMinorAmount, prettyJson } from "@suite/ui/client.ts";
import { Callout, Field, StatusPill } from "@suite/ui/components.tsx";
import {
  INSTALLMENT_COUNTRIES,
  isNonFatalWalletError,
  paymentMethodsConfiguration,
} from "@suite/ui/paymentMethods.ts";
import "@suite/ui/registerPaymentMethods.ts";
import { useEffect, useRef, useState } from "preact/hooks";

type Flow = "sessions" | "advanced" | "pay-by-link" | "mit" | "api-only";

interface PublicProfile {
  id: string;
  label: string;
  isConfigured: boolean;
  missingFields: string[];
  merchantAccount?: string;
}

interface AvailableComponent {
  type: string;
  name: string;
}

type ComponentConstructor = new (
  checkout: Core,
  props?: Record<string, unknown>,
) => MountedComponent;

export interface Bootstrap {
  profile: PublicProfile;
  profiles: PublicProfile[];
  clientKey: string | null;
  webhookUrl: string;
}

interface TimelineEntry {
  id: string;
  kind: "api_call" | "frontend_callback" | "webhook" | "action" | "state";
  name: string;
  status: string;
  occurredAt: string;
  payload: unknown;
  durationMs?: number;
  hmacValid?: boolean;
  optional?: boolean;
}

// Only these two carry the actual payment outcome — every other frontend
// callback is diagnostic/lifecycle noise that's useful to have but not
// something you need staring at you by default.
const MANDATORY_CALLBACKS = new Set(["onPaymentCompleted", "onPaymentFailed"]);

interface CallbackActions {
  resolve(value?: unknown): void;
  reject(): void;
}

interface MountedComponent {
  mount(el: HTMLElement): void;
  unmount(): void;
}

const MARKETS = [
  ["AE", "United Arab Emirates"],
  ["AT", "Austria"],
  ["AU", "Australia"],
  ["BE", "Belgium"],
  ["BR", "Brazil"],
  ["CA", "Canada"],
  ["CH", "Switzerland"],
  ["CN", "China"],
  ["CZ", "Czech Republic"],
  ["DE", "Germany"],
  ["DK", "Denmark"],
  ["ES", "Spain"],
  ["FI", "Finland"],
  ["FR", "France"],
  ["GB", "United Kingdom"],
  ["HK", "Hong Kong"],
  ["ID", "Indonesia"],
  ["IN", "India"],
  ["IT", "Italy"],
  ["JP", "Japan"],
  ["KE", "Kenya"],
  ["KR", "South Korea"],
  ["MX", "Mexico"],
  ["MY", "Malaysia"],
  ["NL", "Netherlands"],
  ["NO", "Norway"],
  ["NZ", "New Zealand"],
  ["PH", "Philippines"],
  ["PL", "Poland"],
  ["PT", "Portugal"],
  ["SE", "Sweden"],
  ["SG", "Singapore"],
  ["TH", "Thailand"],
  ["US", "United States"],
  ["VN", "Vietnam"],
  ["ZA", "South Africa"],
] as const;

const MARKET_DEFAULTS: Record<string, { locale: string; currency: string }> = {
  AU: { locale: "en-AU", currency: "AUD" },
  CA: { locale: "en-CA", currency: "CAD" },
  DE: { locale: "de-DE", currency: "EUR" },
  FR: { locale: "fr-FR", currency: "EUR" },
  GB: { locale: "en-GB", currency: "GBP" },
  JP: { locale: "ja-JP", currency: "JPY" },
  NL: { locale: "nl-NL", currency: "EUR" },
  PT: { locale: "pt-PT", currency: "EUR" },
  SG: { locale: "en-SG", currency: "SGD" },
  US: { locale: "en-US", currency: "USD" },
};

// JPY has no fractional unit — its minor units equal its major units.
const ZERO_DECIMAL_CURRENCIES = new Set(["JPY"]);

// Not a real conversion — 109.99 reads fine in any 2-decimal currency
// (USD, GBP, CAD...), so it's reused as-is; zero-decimal currencies just
// get a clean round number in the same ballpark instead.
function defaultAmountForCurrency(currency: string): number {
  return ZERO_DECIMAL_CURRENCIES.has(currency) ? 11000 : 10999;
}

const LOCALE_OPTIONS = [
  "fr-FR",
  "en-US",
  "en-GB",
  "en-CA",
  "en-AU",
  "nl-NL",
  "pt-PT",
  "de-DE",
  "ja-JP",
  "en-SG",
];

// Reuses Adyen's own shipped CSS classes (imported globally as adyen.css) for
// field box sizing/focus states, same as the legacy playground's hand-rolled
// Secure Fields form — only the wrapper/status/hint below are custom.
const CUSTOM_CARD_MARKUP = `
  <div class="custom-card-form">
    <div class="adyen-checkout__field">
      <label class="adyen-checkout__label" for="customCardHolderName">Cardholder name</label>
      <div class="adyen-checkout__input-wrapper">
        <input
          id="customCardHolderName"
          class="adyen-checkout__input"
          autocomplete="cc-name"
          placeholder="John Doe"
        />
      </div>
    </div>
    <div class="adyen-checkout__field">
      <label class="adyen-checkout__label">Card number</label>
      <div class="adyen-checkout__input-wrapper">
        <span class="adyen-checkout__input" data-cse="encryptedCardNumber"></span>
      </div>
    </div>
    <div class="adyen-checkout__field adyen-checkout__field--two-in-one">
      <div class="adyen-checkout__field">
        <label class="adyen-checkout__label">Expiry date</label>
        <div class="adyen-checkout__input-wrapper">
          <span class="adyen-checkout__input" data-cse="encryptedExpiryDate"></span>
        </div>
      </div>
      <div class="adyen-checkout__field">
        <label class="adyen-checkout__label">CVC</label>
        <div class="adyen-checkout__input-wrapper">
          <span class="adyen-checkout__input" data-cse="encryptedSecurityCode"></span>
        </div>
      </div>
    </div>
    <p class="custom-card-status" data-role="status" aria-live="polite"></p>
    <button
      type="button"
      class="adyen-checkout__button adyen-checkout__button--pay custom-card-submit"
      data-role="submit"
      disabled
    >
      Pay now
    </button>
    <p class="custom-card-hint">
      Card data never touches our server — these fields are Adyen-hosted iframes (Secure
      Fields). Only encrypted blobs reach the backend.
    </p>
  </div>
`;

function flagEmoji(countryCode: string): string {
  return String.fromCodePoint(
    ...countryCode.toUpperCase().split("").map((letter) => 127397 + letter.charCodeAt(0)),
  );
}

// This is a TEST playground: sdkData, sessionData and other frontend
// callback payloads are shown in full — nothing here is a real credential,
// and truncating them just hides useful debug information.
function recordSafe(value: unknown, depth = 0): unknown {
  if (depth > 5) return "[depth limited]";
  if (Array.isArray(value)) return value.slice(0, 30).map((entry) => recordSafe(entry, depth + 1));
  if (!value || typeof value !== "object") return value;
  const output: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    output[key] = recordSafe(entry, depth + 1);
  }
  return output;
}

function timestamp(): string {
  return new Date().toISOString();
}

function extractAdditionalData(value: unknown): { rest: unknown; additionalData: unknown } {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { rest: value, additionalData: null };
  }
  const { additionalData, ...rest } = value as Record<string, unknown>;
  return { rest, additionalData: additionalData ?? null };
}

export default function FlowWorkbench(
  { flow, initialBootstrap, initialIntegration }: {
    flow: Flow;
    initialBootstrap?: Bootstrap;
    initialIntegration?: "dropin" | "component";
  },
) {
  const initialMarket = flow === "pay-by-link" ? "NL" : "FR";
  const hasAutoInit = flow === "sessions" || flow === "advanced" || flow === "api-only";
  const [bootstrap, setBootstrap] = useState<Bootstrap | null>(initialBootstrap ?? null);
  const [profileId, setProfileId] = useState(initialBootstrap?.profile.id ?? "default");
  const [integration, setIntegration] = useState<"dropin" | "component">(
    initialIntegration ?? "dropin",
  );
  const [componentType, setComponentType] = useState("scheme");
  const [availableComponents, setAvailableComponents] = useState<AvailableComponent[]>([]);
  const [amount, setAmount] = useState(10999);
  const [currency, setCurrency] = useState(MARKET_DEFAULTS[initialMarket].currency);
  const [country, setCountry] = useState(initialMarket);
  const [locale, setLocale] = useState(MARKET_DEFAULTS[initialMarket].locale);
  // Whether installments are offered is a property of the market, not a
  // manual preference — always derived from country rather than a toggle.
  const installments = INSTALLMENT_COUNTRIES.includes(country.toUpperCase());
  const [correlationId, setCorrelationId] = useState<string | null>(null);
  const [callbacks, setCallbacks] = useState<TimelineEntry[]>([]);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelTab, setPanelTab] = useState<"callbacks" | "api">("callbacks");
  const [expandedTabs, setExpandedTabs] = useState<{ callbacks: boolean; api: boolean }>({
    callbacks: false,
    api: false,
  });
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());
  const [showOptionalCallbacks, setShowOptionalCallbacks] = useState(false);
  const [showAdditionalData, setShowAdditionalData] = useState(false);
  const [webhooksOpen, setWebhooksOpen] = useState(false);
  const [webhookWaiting, setWebhookWaiting] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<Record<string, unknown> | null>(null);
  const [storedPaymentMethodId, setStoredPaymentMethodId] = useState("");
  const [shopperReference, setShopperReference] = useState("shopper-test-001");
  const [recurringModel, setRecurringModel] = useState<
    "UnscheduledCardOnFile" | "Subscription"
  >("UnscheduledCardOnFile");
  const [validityHours, setValidityHours] = useState(24);
  const [reusable, setReusable] = useState(false);
  const dropinHost = useRef<HTMLDivElement>(null);
  const mounted = useRef<MountedComponent | null>(null);
  const correlationRef = useRef<string | null>(null);
  const checkoutRef = useRef<Core | null>(null);
  const customCardHolderNameRef = useRef<HTMLInputElement | null>(null);

  function updateCorrelation(value: string) {
    correlationRef.current = value;
    setCorrelationId(value);
  }

  useEffect(() => {
    apiFetch<Bootstrap>("/api/bootstrap")
      .then((data) => {
        setBootstrap(data);
        setProfileId(data.profile.id);
      })
      .catch((cause) => setError(cause instanceof Error ? cause.message : "Bootstrap failed."));
    return () => mounted.current?.unmount();
  }, []);

  const autoInitRef = useRef(false);
  useEffect(() => {
    if (!hasAutoInit || autoInitRef.current || !bootstrap?.clientKey) return;
    autoInitRef.current = true;
    start();
  }, [bootstrap]);

  // No "Update settings" button — any change to the scenario reloads the
  // checkout on its own, debounced so typing an amount or flipping through
  // markets doesn't refire on every keystroke.
  const skipFirstAutoRestart = useRef(true);
  useEffect(() => {
    if (!hasAutoInit || !autoInitRef.current) return;
    if (skipFirstAutoRestart.current) {
      skipFirstAutoRestart.current = false;
      return;
    }
    const timeout = setTimeout(() => start({ silent: true }), 500);
    return () => clearTimeout(timeout);
  }, [amount, currency, country, locale, integration, profileId]);

  useEffect(() => {
    if (!correlationId || (!panelOpen && !webhooksOpen)) return;
    let active = true;
    const refresh = async () => {
      try {
        const data = await apiFetch<{ entries: TimelineEntry[] }>(
          `/api/timeline/${correlationId}`,
        );
        if (!active) return;
        setTimeline(data.entries);
        setWebhookWaiting(!data.entries.some((entry) => entry.kind === "webhook"));
      } catch {
        // Inspector polling is best-effort and must not interrupt checkout.
      }
    };
    refresh();
    const interval = globalThis.setInterval(refresh, 2500);
    return () => {
      active = false;
      globalThis.clearInterval(interval);
    };
  }, [correlationId, panelOpen, webhooksOpen]);

  async function switchProfile(nextId: string) {
    setError(null);
    await apiFetch("/api/profiles/preferred", {
      method: "POST",
      body: JSON.stringify({ profileId: nextId }),
    });
    const data = await apiFetch<Bootstrap>("/api/bootstrap");
    setBootstrap(data);
    setProfileId(data.profile.id);
    mounted.current?.unmount();
    mounted.current = null;
    checkoutRef.current = null;
    setAvailableComponents([]);
  }

  function selectMarket(nextCountry: string) {
    setCountry(nextCountry);
    const defaults = MARKET_DEFAULTS[nextCountry];
    if (defaults) {
      setLocale(defaults.locale);
      if (defaults.currency !== currency) {
        setAmount(defaultAmountForCurrency(defaults.currency));
      }
      setCurrency(defaults.currency);
    }
  }

  function selectCurrency(nextCurrency: string) {
    setAmount(defaultAmountForCurrency(nextCurrency));
    setCurrency(nextCurrency);
  }

  function addCallback(name: string, payload: unknown, explicitCorrelation?: string) {
    const safePayload = recordSafe(payload);
    const entry: TimelineEntry = {
      id: crypto.randomUUID(),
      kind: "frontend_callback",
      name,
      status: "received",
      occurredAt: timestamp(),
      payload: safePayload,
      optional: !MANDATORY_CALLBACKS.has(name),
    };
    setCallbacks((current) => [...current, entry]);
    const id = explicitCorrelation ?? correlationId;
    if (id) {
      apiFetch("/api/callbacks", {
        method: "POST",
        body: JSON.stringify({
          correlationId: id,
          name,
          occurredAt: entry.occurredAt,
          payload: safePayload,
        }),
      }, profileId).catch(() => undefined);
    }
  }

  function toggleEntryExpanded(id: string) {
    setExpandedEntries((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function commonConfiguration(extra: Record<string, unknown>) {
    if (!bootstrap?.clientKey) throw new Error("A valid TEST client key is required.");
    return {
      environment: "test",
      clientKey: bootstrap.clientKey,
      countryCode: country,
      locale,
      analytics: { enabled: false },
      showPayButton: true,
      onChange: (state: unknown) => addCallback("onChange", state),
      onPaymentCompleted: (result: unknown) => {
        addCallback("onPaymentCompleted", result);
        setOutcome({ status: "completed", result: recordSafe(result) });
      },
      onPaymentFailed: (result: unknown) => {
        addCallback("onPaymentFailed", result);
        setOutcome({ status: "failed", result: recordSafe(result) });
      },
      onError: (cause: unknown) => {
        addCallback("onError", cause);
        if (isNonFatalWalletError(cause)) return;
        setError(cause instanceof Error ? cause.message : "Adyen Web reported an error.");
      },
      onBinLookup: (data: unknown) => addCallback("onBinLookup", data),
      onBinValue: (data: unknown) => addCallback("onBinValue", data),
      onBrand: (data: unknown) => addCallback("onBrand", data),
      ...extra,
    };
  }

  function mountComponentType(type: string) {
    const checkout = checkoutRef.current;
    if (!checkout || !dropinHost.current) return;
    try {
      const ComponentClass = checkout.getComponent(type) as
        | ComponentConstructor
        | undefined;
      if (!ComponentClass) {
        setError(`No "${type}" component is available in this payment methods response.`);
        return;
      }
      mounted.current?.unmount();
      dropinHost.current.replaceChildren();
      const config = paymentMethodsConfiguration(country, bootstrap?.profile.merchantAccount, {
        enableStoreDetails: flow !== "sessions",
      })[type] as Record<string, unknown> | undefined;
      // Card/PayPal/etc. have dedicated classes whose static `type` is already
      // correct, but every redirect-only method (Alma, Wero, WeChat...) shares
      // the same generic Redirect element — without an explicit `type` here it
      // mounts with no identifiable payment method, so `state.data.paymentMethod`
      // comes back empty and the backend later rejects it as null.
      const instance = new ComponentClass(checkout, { ...config, type });
      instance.mount(dropinHost.current);
      mounted.current = instance;
      setComponentType(type);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : `Could not mount "${type}".`);
    }
  }

  async function mountCheckout(configuration: Record<string, unknown>) {
    mounted.current?.unmount();
    if (!dropinHost.current) return;
    dropinHost.current.replaceChildren();
    const checkout = await AdyenCheckout(configuration as never) as Core;
    checkoutRef.current = checkout;

    if (flow === "api-only") {
      // Bring-your-own-UI: this markup is ours, only the three data-cse spans
      // become Adyen-hosted Secure Fields iframes when CustomCard.mount()
      // scans this container. No prebuilt Card component involved.
      dropinHost.current.innerHTML = CUSTOM_CARD_MARKUP;
      const statusEl = dropinHost.current.querySelector<HTMLElement>('[data-role="status"]');
      const submitBtn = dropinHost.current.querySelector<HTMLButtonElement>(
        '[data-role="submit"]',
      );
      customCardHolderNameRef.current = dropinHost.current.querySelector<HTMLInputElement>(
        "#customCardHolderName",
      );
      const component = new CustomCard(checkout, {
        type: "card",
        autoFocus: true,
        onLoad: () => {
          if (statusEl) statusEl.textContent = "Loading secure fields…";
        },
        onConfigSuccess: () => {
          if (statusEl) statusEl.textContent = "";
          if (submitBtn) submitBtn.disabled = false;
        },
        onBrand: (event: { brand?: string }) => {
          if (statusEl && event?.brand) {
            statusEl.textContent = `Detected network: ${event.brand.toUpperCase()}`;
          }
        },
        onValidationError: (errors: Array<{ fieldType?: string }>) => {
          const first = errors?.[0];
          if (statusEl && first?.fieldType) statusEl.textContent = `Check ${first.fieldType}.`;
        },
      } as never);
      submitBtn?.addEventListener("click", () => component.submit());
      component.mount(dropinHost.current);
      mounted.current = component as MountedComponent;
      return;
    }

    const methods = (checkout.paymentMethodsResponse?.paymentMethods ?? []) as AvailableComponent[];
    setAvailableComponents(methods.map((method) => ({ type: method.type, name: method.name })));

    if (integration === "dropin") {
      const component = new Dropin(checkout, {
        paymentMethodsConfiguration: paymentMethodsConfiguration(
          country,
          bootstrap?.profile.merchantAccount,
          { enableStoreDetails: flow !== "sessions" },
        ),
        openFirstPaymentMethod: false,
        instantPaymentTypes: ["applepay", "googlepay"],
      });
      component.mount(dropinHost.current);
      mounted.current = component as MountedComponent;
      return;
    }

    const nextType = methods.some((method) => method.type === componentType)
      ? componentType
      : (methods[0]?.type ?? "scheme");
    mountComponentType(nextType);
  }

  async function startSession() {
    const data = await apiFetch<{
      correlationId: string;
      session: { id: string; sessionData: string };
    }>("/api/digital/sessions", {
      method: "POST",
      body: JSON.stringify({
        flow: `sessions-${integration}`,
        amount: { value: amount, currency },
        countryCode: country,
        shopperLocale: locale,
        installments,
      }),
    }, profileId);
    updateCorrelation(data.correlationId);
    addCallback("sessionCreated", { id: data.session.id }, data.correlationId);
    await mountCheckout(commonConfiguration({
      session: data.session,
      beforeSubmit: (state: unknown, _component: unknown, actions: CallbackActions) => {
        addCallback("beforeSubmit", state, data.correlationId);
        // beforeSubmit's resolve() is not a plain continue — Adyen Web sends
        // back whatever is passed here as the actual /payments payload. An
        // empty resolve() submits with no paymentMethod at all, which Adyen
        // then rejects as "Required field 'paymentMethod' is null".
        actions.resolve(state);
      },
    }));
  }

  async function startAdvanced() {
    const methods = await apiFetch<{
      correlationId: string;
      paymentMethodsResponse: unknown;
    }>("/api/digital/payment-methods", {
      method: "POST",
      body: JSON.stringify({
        amount: { value: amount, currency },
        countryCode: country,
        shopperLocale: locale,
      }),
    }, profileId);
    updateCorrelation(methods.correlationId);
    await mountCheckout(commonConfiguration({
      amount: { value: amount, currency },
      paymentMethodsResponse: methods.paymentMethodsResponse,
      onSubmit: async (state: unknown, _component: unknown, actions: CallbackActions) => {
        addCallback("onSubmit", state);
        try {
          const stateData = (state as { data?: Record<string, unknown> }).data ?? {};
          const holderName = customCardHolderNameRef.current?.value;
          if (flow === "api-only" && holderName) {
            stateData.paymentMethod = {
              ...(stateData.paymentMethod as Record<string, unknown> ?? {}),
              holderName,
            };
          }
          const response = await apiFetch<{
            correlationId: string;
            result: unknown;
          }>(flow === "api-only" ? "/api/digital/api-only" : "/api/digital/payments", {
            method: "POST",
            body: JSON.stringify({
              flow: flow === "api-only" ? "api-only-pci" : `advanced-${integration}`,
              amount: { value: amount, currency },
              countryCode: country,
              shopperLocale: locale,
              ...stateData,
            }),
          }, profileId);
          updateCorrelation(response.correlationId);
          addCallback("backendPaymentResponse", response.result, response.correlationId);
          actions.resolve(response.result);
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : "Payment request failed.");
          actions.reject();
        }
      },
      onAdditionalDetails: async (
        state: unknown,
        _component: unknown,
        actions: CallbackActions,
      ) => {
        addCallback("onAdditionalDetails", state);
        try {
          const stateData = (state as { data?: Record<string, unknown> }).data ?? {};
          const response = await apiFetch<{ result: unknown }>(
            "/api/digital/payments/details",
            {
              method: "POST",
              body: JSON.stringify({ correlationId: correlationRef.current, ...stateData }),
            },
            profileId,
          );
          actions.resolve(response.result);
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : "Additional details failed.");
          actions.reject();
        }
      },
    }));
  }

  async function createPaymentLink() {
    const response = await apiFetch<{
      correlationId: string;
      paymentLink: Record<string, unknown>;
    }>("/api/digital/payment-links", {
      method: "POST",
      body: JSON.stringify({
        amount: { value: amount, currency },
        countryCode: country,
        shopperLocale: locale,
        validityHours,
        reusable,
      }),
    }, profileId);
    updateCorrelation(response.correlationId);
    setOutcome(response.paymentLink);
    addCallback("paymentLinkCreated", response.paymentLink, response.correlationId);
  }

  async function runMit() {
    const response = await apiFetch<{
      correlationId: string;
      result: Record<string, unknown>;
    }>("/api/digital/mit", {
      method: "POST",
      body: JSON.stringify({
        amount: { value: amount, currency },
        storedPaymentMethodId,
        shopperReference,
        recurringProcessingModel: recurringModel,
      }),
    }, profileId);
    updateCorrelation(response.correlationId);
    setOutcome(response.result);
    addCallback("mitResponse", response.result, response.correlationId);
  }

  async function start(options: { silent?: boolean } = {}) {
    setError(null);
    setOutcome(null);
    setCallbacks([]);
    setTimeline([]);
    setExpandedTabs({ callbacks: false, api: false });
    setExpandedEntries(new Set());
    setLoading(true);
    try {
      if (flow === "sessions") await startSession();
      else if (flow === "advanced" || flow === "api-only") await startAdvanced();
      else if (flow === "pay-by-link") await createPaymentLink();
      else await runMit();
      if (!options.silent) setPanelOpen(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The flow could not start.");
    } finally {
      setLoading(false);
    }
  }

  const EVENT_PREVIEW_COUNT = 5;
  const allEvents = panelTab === "callbacks"
    ? (showOptionalCallbacks ? callbacks : callbacks.filter((entry) => !entry.optional))
    : timeline.filter((entry) => entry.kind === "api_call");
  const isExpanded = expandedTabs[panelTab];
  const visibleEvents = isExpanded ? allEvents : allEvents.slice(-EVENT_PREVIEW_COUNT);
  const hiddenEventCount = allEvents.length - visibleEvents.length;
  const webhookEntries = timeline.filter((entry) => entry.kind === "webhook");
  const selectedProfile = bootstrap?.profiles.find((profile) => profile.id === profileId);

  return (
    <>
      {bootstrap && !selectedProfile?.isConfigured
        ? (
          <Callout title="Profile incomplete" tone="warning">
            Add the missing server-side fields in Settings:{" "}
            {selectedProfile?.missingFields.join(", ") ?? ""}.
          </Callout>
        )
        : null}
      {error
        ? (
          <div class="callout callout--danger" role="alert">
            <strong>Flow stopped</strong>
            <div>{error}</div>
          </div>
        )
        : null}
      <div class="checkout-layout">
        <section class="checkout-shell" aria-busy={loading}>
          <div class="checkout-context">
            <StatusPill
              tone={!bootstrap ? "neutral" : selectedProfile?.isConfigured ? "positive" : "warning"}
            >
              {selectedProfile?.label ?? "Loading profile"}
            </StatusPill>
            <div class="checkout-market">
              <select
                aria-label="Checkout market"
                value={country}
                onChange={(event) => selectMarket(event.currentTarget.value)}
              >
                {MARKETS.map(([code, name]) => (
                  <option key={code} value={code}>{flagEmoji(code)} {name}</option>
                ))}
              </select>
              <select
                aria-label="Shopper language"
                value={locale}
                onChange={(event) => setLocale(event.currentTarget.value)}
              >
                {LOCALE_OPTIONS.map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
            </div>
          </div>

          <details class="scenario-settings">
            <summary>
              <span class="scenario-settings__title">
                <strong>Scenario &amp; Drop-in settings</strong>
                <span>
                  {flow === "pay-by-link"
                    ? "Hosted link"
                    : flow === "mit"
                    ? recurringModel
                    : integration === "dropin"
                    ? "Drop-in"
                    : "Components"} ·{" "}
                  {formatMinorAmount(Number.isFinite(amount) ? amount : 0, currency)} ·{" "}
                  {flagEmoji(country)} {country} · {locale}
                </span>
              </span>
            </summary>
            <div class="scenario-settings__body">
              <div class="form-grid form-grid--three">
                <Field label="Server-side TEST profile" htmlFor="profile">
                  <select
                    id="profile"
                    value={profileId}
                    onChange={(event) => switchProfile(event.currentTarget.value)}
                  >
                    {bootstrap?.profiles.map((profile) => (
                      <option key={profile.id} value={profile.id}>
                        {profile.label}
                        {profile.isConfigured ? "" : " — incomplete"}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field
                  label="Amount (minor units)"
                  htmlFor="amount"
                  hint={`= ${formatMinorAmount(Number.isFinite(amount) ? amount : 0, currency)}`}
                >
                  <input
                    id="amount"
                    type="number"
                    min="1"
                    max="100000000"
                    value={amount}
                    onInput={(event) => setAmount(event.currentTarget.valueAsNumber)}
                  />
                </Field>
                <Field label="Currency" htmlFor="currency">
                  <select
                    id="currency"
                    value={currency}
                    onChange={(event) => selectCurrency(event.currentTarget.value)}
                  >
                    {["EUR", "USD", "CAD", "GBP", "AUD", "JPY", "SGD"].map((value) => (
                      <option key={value} value={value}>{value}</option>
                    ))}
                  </select>
                </Field>
                {flow === "sessions" || flow === "advanced" || flow === "api-only"
                  ? (
                    <div class="field">
                      <span>Frontend integration</span>
                      <div class="segmented-control" aria-label="Frontend integration">
                        <button
                          type="button"
                          aria-pressed={integration === "dropin"}
                          onClick={() => setIntegration("dropin")}
                        >
                          Drop-in
                        </button>
                        <button
                          type="button"
                          aria-pressed={integration === "component"}
                          onClick={() => setIntegration("component")}
                        >
                          Components
                        </button>
                      </div>
                    </div>
                  )
                  : null}
                {integration === "component" && flow !== "api-only" &&
                    availableComponents.length > 0
                  ? (
                    <Field
                      label="Component to test"
                      htmlFor="componentType"
                      hint="Populated from this profile's actual payment methods"
                    >
                      <select
                        id="componentType"
                        value={componentType}
                        onChange={(event) => mountComponentType(event.currentTarget.value)}
                      >
                        {availableComponents.map((method) => (
                          <option key={method.type} value={method.type}>
                            {method.name} ({method.type})
                          </option>
                        ))}
                      </select>
                    </Field>
                  )
                  : null}
                {flow === "sessions" && installments
                  ? (
                    <div class="field">
                      <span>Installments</span>
                      <small>
                        installmentOptions is automatically sent in /sessions for this market
                        (Brazil, Mexico, Japan).
                      </small>
                    </div>
                  )
                  : null}
                {flow === "pay-by-link"
                  ? (
                    <>
                      <Field label="Validity (hours)" htmlFor="validity">
                        <input
                          id="validity"
                          type="number"
                          min="1"
                          max="1680"
                          value={validityHours}
                          onInput={(event) => setValidityHours(event.currentTarget.valueAsNumber)}
                        />
                      </Field>
                      <div class="field">
                        <span>Reusability</span>
                        <label class="switch-row">
                          <span>Reusable link</span>
                          <input
                            type="checkbox"
                            checked={reusable}
                            onChange={(event) => setReusable(event.currentTarget.checked)}
                          />
                        </label>
                      </div>
                    </>
                  )
                  : null}
                {flow === "mit"
                  ? (
                    <>
                      <Field
                        label="storedPaymentMethodId"
                        htmlFor="storedPaymentMethodId"
                        hint="Adyen token, never a PAN"
                      >
                        <input
                          id="storedPaymentMethodId"
                          type="password"
                          autocomplete="off"
                          value={storedPaymentMethodId}
                          onInput={(event) => setStoredPaymentMethodId(event.currentTarget.value)}
                        />
                      </Field>
                      <Field
                        label="Shopper reference"
                        htmlFor="shopperReference"
                        hint="Must not contain PII"
                      >
                        <input
                          id="shopperReference"
                          value={shopperReference}
                          onInput={(event) => setShopperReference(event.currentTarget.value)}
                        />
                      </Field>
                      <Field label="Recurring model" htmlFor="recurringModel">
                        <select
                          id="recurringModel"
                          value={recurringModel}
                          onChange={(event) =>
                            setRecurringModel(
                              event.currentTarget.value as
                                | "UnscheduledCardOnFile"
                                | "Subscription",
                            )}
                        >
                          <option value="UnscheduledCardOnFile">UnscheduledCardOnFile</option>
                          <option value="Subscription">Subscription</option>
                        </select>
                      </Field>
                    </>
                  )
                  : null}
              </div>
              {hasAutoInit
                ? (
                  <div class="form-actions">
                    {loading ? <span class="mono">Reloading checkout…</span> : null}
                    {correlationId
                      ? <span class="mono">Correlation {correlationId.slice(0, 13)}…</span>
                      : null}
                  </div>
                )
                : null}
            </div>
          </details>

          {!hasAutoInit
            ? (
              <div class="form-actions">
                <button
                  class="button button--primary"
                  type="button"
                  disabled={loading || !selectedProfile?.isConfigured}
                  onClick={() => start()}
                >
                  {loading
                    ? "Starting…"
                    : flow === "pay-by-link"
                    ? "Create TEST payment link"
                    : "Run TEST MIT"}
                </button>
                {correlationId
                  ? <span class="mono">Correlation {correlationId.slice(0, 13)}…</span>
                  : null}
              </div>
            )
            : null}

          {flow === "api-only"
            ? (
              <Callout title="PCI boundary" tone="warning">
                Card entry is rendered by Adyen Secured Fields. This application rejects raw PAN,
                CVC and security-code properties at the API boundary and stores only sanitized
                observability data.
              </Callout>
            )
            : null}

          <div class="payment-stage">
            <div class="payment-stage__main">
              <div class="payment-stage__header">
                <div>
                  <span class="eyebrow">
                    {flow === "pay-by-link" ? "Hosted checkout" : "Payment experience"}
                  </span>
                  <h2>
                    {flow === "pay-by-link"
                      ? "Payment link"
                      : flow === "mit"
                      ? "MIT response"
                      : "Select your payment method"}
                  </h2>
                </div>
                <StatusPill>
                  {flow === "pay-by-link"
                    ? "Hosted link"
                    : flow === "mit"
                    ? "API request"
                    : integration === "dropin"
                    ? "Drop-in"
                    : "Component"}
                </StatusPill>
              </div>
              {flow === "pay-by-link" && outcome
                ? (
                  <div class="panel">
                    <h2>Link created</h2>
                    {typeof outcome.url === "string"
                      ? (
                        <p>
                          <a href={outcome.url} target="_blank" rel="noreferrer">
                            Open the Adyen-hosted TEST payment page
                          </a>
                        </p>
                      )
                      : null}
                    <pre class="code-block">{prettyJson(recordSafe(outcome))}</pre>
                  </div>
                )
                : flow === "mit" && outcome
                ? <pre class="code-block">{prettyJson(recordSafe(outcome))}</pre>
                : (
                  <div class="dropin-host" ref={dropinHost} aria-live="polite">
                    {!mounted.current
                      ? (
                        <div class="dropin-placeholder">
                          <p>
                            The scenario is ready. Open settings only if you want to change the
                            profile, market, language, amount or integration.
                          </p>
                        </div>
                      )
                      : null}
                  </div>
                )}
            </div>
            <aside class="order-summary" aria-label="Order summary">
              <h3>Order summary</h3>
              <div class="order-summary__line">
                <span>
                  <span class="order-summary__icon" aria-hidden="true">🛍️</span>
                  Playground order
                </span>
                <strong>{formatMinorAmount(Number.isFinite(amount) ? amount : 0, currency)}</strong>
              </div>
              <div class="order-summary__total">
                <span>Total</span>
                <strong>{formatMinorAmount(Number.isFinite(amount) ? amount : 0, currency)}</strong>
              </div>
              <p class="order-summary__meta">
                {flagEmoji(country)} {MARKETS.find(([code]) => code === country)?.[1]} · {locale}
                <br />
                Billing and delivery addresses use the {country} TEST dataset.
              </p>
            </aside>
          </div>
        </section>

        <aside class="inspector" hidden={!panelOpen} aria-label="Payment observability panel">
          <header class="inspector__header">
            <div class="inspector__tabs" role="tablist" aria-label="Inspector views">
              <button
                type="button"
                role="tab"
                aria-selected={panelTab === "callbacks"}
                onClick={() => setPanelTab("callbacks")}
              >
                Frontend callbacks
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={panelTab === "api"}
                onClick={() => setPanelTab("api")}
              >
                API calls
              </button>
            </div>
            {panelTab === "callbacks"
              ? (
                <label class="switch-row switch-row--inline">
                  <span>Show optional callbacks</span>
                  <input
                    type="checkbox"
                    checked={showOptionalCallbacks}
                    onChange={(event) => setShowOptionalCallbacks(event.currentTarget.checked)}
                  />
                </label>
              )
              : (
                <label class="switch-row switch-row--inline">
                  <span>Show additionalData</span>
                  <input
                    type="checkbox"
                    checked={showAdditionalData}
                    onChange={(event) => setShowAdditionalData(event.currentTarget.checked)}
                  />
                </label>
              )}
            <button
              class="button button--small button--secondary"
              type="button"
              onClick={() => setPanelOpen(false)}
              aria-label="Hide inspector"
            >
              Hide
            </button>
          </header>
          <div class="inspector__body" role="tabpanel">
            {allEvents.length > EVENT_PREVIEW_COUNT
              ? (
                <div class="event-list__toggle">
                  <span class="mono">
                    {isExpanded
                      ? `${allEvents.length} events`
                      : `Showing last ${visibleEvents.length} of ${allEvents.length}`}
                  </span>
                  <button
                    class="button button--quiet button--small"
                    type="button"
                    onClick={() =>
                      setExpandedTabs((current) => ({
                        ...current,
                        [panelTab]: !current[panelTab],
                      }))}
                  >
                    {isExpanded ? "Collapse" : `Expand all (${hiddenEventCount} more)`}
                  </button>
                </div>
              )
              : null}
            {visibleEvents.length
              ? (
                <div class="event-list">
                  {visibleEvents.map((entry) => {
                    const apiPayload = panelTab === "api"
                      ? entry.payload as { request?: unknown; response?: unknown; error?: string }
                      : null;
                    const { rest: responseRest, additionalData } = apiPayload && !apiPayload.error
                      ? extractAdditionalData(apiPayload.response)
                      : { rest: null, additionalData: null };
                    const entryOpen = expandedEntries.has(entry.id);
                    return (
                      <article class="event-row" key={entry.id}>
                        <button
                          type="button"
                          class="event-row__header"
                          aria-expanded={entryOpen}
                          onClick={() => toggleEntryExpanded(entry.id)}
                        >
                          <span class="event-row__meta">
                            <strong>{entry.name}</strong>
                            {entry.optional ? <span class="event-row__badge">optional</span> : null}
                            <time datetime={entry.occurredAt}>
                              {new Date(entry.occurredAt).toLocaleTimeString()}
                              {entry.durationMs ? ` · ${entry.durationMs} ms` : ""}
                            </time>
                          </span>
                          <span class="event-row__caret" aria-hidden="true">
                            {entryOpen ? "−" : "+"}
                          </span>
                        </button>
                        {entryOpen
                          ? apiPayload
                            ? (
                              <>
                                <div class="event-row__section">
                                  <span class="event-row__label">Request</span>
                                  <pre>{prettyJson(apiPayload.request)}</pre>
                                </div>
                                <div class="event-row__section">
                                  <span class="event-row__label">Response</span>
                                  <pre>
                                    {prettyJson(
                                      apiPayload.error
                                        ? { error: apiPayload.error }
                                        : responseRest,
                                    )}
                                  </pre>
                                  {showAdditionalData
                                    ? (
                                      <>
                                        <span class="event-row__label">additionalData</span>
                                        <pre>
                                          {additionalData
                                            ? prettyJson(additionalData)
                                            : "No additionalData in this response."}
                                        </pre>
                                      </>
                                    )
                                    : null}
                                </div>
                              </>
                            )
                            : <pre>{prettyJson(entry.payload)}</pre>
                          : null}
                      </article>
                    );
                  })}
                </div>
              )
              : (
                <p>
                  {panelTab === "callbacks"
                    ? "Callbacks will appear here in chronological order."
                    : "Backend calls will appear after the flow starts."}
                </p>
              )}
          </div>
          <footer class="inspector__footer">
            <span class="mono">
              {webhookWaiting ? "Waiting for webhook" : `${webhookEntries.length} webhook(s)`}
            </span>
            <button
              class="button button--small button--primary"
              type="button"
              onClick={() => setWebhooksOpen(true)}
            >
              Check received webhooks
            </button>
          </footer>
        </aside>
      </div>

      {!panelOpen
        ? (
          <button
            class="inspector-trigger"
            type="button"
            onClick={() => setPanelOpen(true)}
            aria-label="Open payment inspector"
          >
            Open inspector
          </button>
        )
        : null}

      <aside class="webhook-drawer" hidden={!webhooksOpen} aria-label="Received webhooks">
        <div class="panel__header">
          <div>
            <span class="eyebrow">Server-to-server events</span>
            <h2>Received webhooks</h2>
            <p>HMAC status, correlation and sanitized payload are persisted for audit.</p>
          </div>
          <button
            class="button button--secondary"
            type="button"
            onClick={() => setWebhooksOpen(false)}
          >
            Close
          </button>
        </div>
        {webhookWaiting
          ? (
            <Callout title="Awaiting event">
              <span class="waiting-dot" aria-hidden="true" />{" "}
              The application is polling its local audit store. Asynchronous payment methods can
              take longer.
            </Callout>
          )
          : (
            <div class="timeline">
              {webhookEntries.map((entry) => (
                <article class="timeline-entry">
                  <header>
                    <strong>{entry.name}</strong>
                    <StatusPill tone={entry.hmacValid ? "positive" : "danger"}>
                      {entry.hmacValid ? "HMAC valid" : "HMAC invalid"}
                    </StatusPill>
                  </header>
                  <p>{new Date(entry.occurredAt).toLocaleString()}</p>
                  <pre class="code-block">{prettyJson(entry.payload)}</pre>
                </article>
              ))}
            </div>
          )}
      </aside>
    </>
  );
}
