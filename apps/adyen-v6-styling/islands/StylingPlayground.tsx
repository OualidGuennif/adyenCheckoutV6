import { AdyenCheckout, Dropin } from "@adyen/adyen-web";
import type { Core } from "@adyen/adyen-web";
import { apiFetch } from "@suite/ui/client.ts";
import { AdyenWordmark, Field } from "@suite/ui/components.tsx";
import {
  detectCountryFromLanguages,
  FALLBACK_COUNTRY,
  localeForCountry,
} from "@suite/platform/markets.ts";
import {
  INSTALLMENT_COUNTRIES,
  isNonFatalWalletError,
  SOCIAL_SECURITY_NUMBER_COUNTRIES,
} from "@suite/ui/paymentMethods.ts";
import "@suite/ui/registerPaymentMethods.ts";
import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { TestCards } from "../components/TestCards.tsx";
import {
  CheckboxDropdown,
  OptionGroup,
  OptionRow,
  SwitchRow,
} from "../components/OptionFields.tsx";
import {
  ADDRESS_FIELDS,
  ADYEN_CSS_URL,
  ADYEN_WEB_VERSION,
  cardConfigObject,
  CSS_RULE_SPECS,
  CSS_TOKEN_GROUPS,
  CSS_TOKEN_SPECS,
  cssPreviewVariables,
  cssRuleSetCount,
  cssText,
  cssTokenSetCount,
  cssTokenSpec,
  DEFAULT_CARD,
  DEFAULT_CSS_RULES,
  DEFAULT_NATIVE,
  DEFAULT_SECURE,
  dropinProps,
  isValidExpiryDate,
  isValidHttpUrl,
  PLACEHOLDER_FIELDS,
  SECURE_GROUPS,
  SECURE_PROPERTY_SPECS,
  SECURE_STATE_META,
  SECURE_STATES,
  secureSetCount,
  storedCardConfigObject,
} from "../components/adyenOptions.ts";
import type {
  BillingAddressMode,
  CardOptions,
  CssRules,
  CssTokens,
  InstantPaymentType,
  NativeOptions,
  PlaceholderKey,
  SecureProperty,
  SecureState,
  SocialSecurityNumberMode,
} from "../components/adyenOptions.ts";

// Roughly most-used first (FR, NL, US fixed as requested), then the rest of
// the countries the platform addresses elsewhere (packages/platform/addresses.ts).
const COUNTRIES = [
  ["FR", "France"],
  ["NL", "Netherlands"],
  ["US", "United States"],
  ["GB", "United Kingdom"],
  ["DE", "Germany"],
  ["BE", "Belgium"],
  ["CA", "Canada"],
  ["ES", "Spain"],
  ["IT", "Italy"],
  ["CH", "Switzerland"],
  ["AT", "Austria"],
  ["PT", "Portugal"],
  ["SE", "Sweden"],
  ["NO", "Norway"],
  ["DK", "Denmark"],
  ["FI", "Finland"],
  ["PL", "Poland"],
  ["CZ", "Czech Republic"],
  ["AU", "Australia"],
  ["NZ", "New Zealand"],
  ["SG", "Singapore"],
  ["HK", "Hong Kong"],
  ["JP", "Japan"],
  ["KR", "South Korea"],
  ["CN", "China"],
  ["IN", "India"],
  ["ID", "Indonesia"],
  ["MY", "Malaysia"],
  ["TH", "Thailand"],
  ["PH", "Philippines"],
  ["VN", "Vietnam"],
  ["BR", "Brazil"],
  ["MX", "Mexico"],
  ["ZA", "South Africa"],
  ["KE", "Kenya"],
  ["AE", "United Arab Emirates"],
] as const;

const LOCALES = [
  ["en-GB", "English"],
  ["en-US", "English"],
  ["fr-FR", "Français"],
  ["nl-NL", "Nederlands"],
  ["nl-BE", "Nederlands"],
  ["zh-CN", "中文"],
  ["de-DE", "Deutsch"],
  ["de-AT", "Deutsch"],
  ["de-CH", "Deutsch"],
  ["es-ES", "Español"],
  ["es-MX", "Español"],
  ["it-IT", "Italiano"],
  ["pt-PT", "Português"],
  ["pt-BR", "Português"],
  ["en-CA", "English"],
  ["en-AU", "English"],
  ["en-NZ", "English"],
  ["sv-SE", "Svenska"],
  ["nb-NO", "Norsk"],
  ["da-DK", "Dansk"],
  ["fi-FI", "Suomi"],
  ["pl-PL", "Polski"],
  ["cs-CZ", "Čeština"],
  ["en-SG", "English"],
  ["zh-HK", "中文"],
  ["ja-JP", "日本語"],
  ["ko-KR", "한국어"],
  ["en-IN", "English"],
  ["id-ID", "Bahasa Indonesia"],
  ["en-MY", "English"],
  ["th-TH", "ไทย"],
  ["en-PH", "English"],
  ["vi-VN", "Tiếng Việt"],
  ["en-ZA", "English"],
  ["en-KE", "English"],
  ["ar-AE", "العربية"],
] as const;

const COUNTRY_ITEMS = COUNTRIES.map(([code, name]): [string, string] => [code, name]);

function flagEmoji(countryCode: string): string {
  return String.fromCodePoint(
    ...countryCode.toUpperCase().split("").map((letter) => 127397 + letter.charCodeAt(0)),
  );
}

/**
 * Market to open on, guessed from the browser's language preferences and
 * narrowed to the countries this playground actually offers. Returns the
 * shared European fallback during SSR (no navigator) or when the guess isn't
 * one of the offered markets.
 */
function detectInitialCountry(): string {
  if (typeof navigator === "undefined") return FALLBACK_COUNTRY;
  const languages = navigator.languages?.length
    ? navigator.languages
    : [navigator.language].filter(Boolean);
  const guess = detectCountryFromLanguages(languages, FALLBACK_COUNTRY);
  return COUNTRIES.some(([code]) => code === guess) ? guess : FALLBACK_COUNTRY;
}

interface Bootstrap {
  clientKey: string | null;
  profile: { isConfigured: boolean; missingFields: string[] };
}

interface SessionResponse {
  correlationId: string;
  session: { id: string; sessionData: string };
}

interface AvailableMethod {
  type: string;
  name: string;
}

interface Mounted {
  unmount(): void;
}

// Every group starts closed: the panel is a list of what you *can* change, and
// opening one is the reader's choice. Anything open by default is just noise
// between them and the section they came for.
const DEFAULT_OPEN_GROUPS: Record<string, boolean> = {};

const PLACEHOLDERS_HINT = "placeholders — Adyen ships localised placeholders; anything " +
  "set here replaces them.";

const RULES_HINT = "No design token covers these, so they are written against Adyen's own " +
  "class names — review them after every SDK upgrade.";

function download(name: string, content: string, type: string) {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([content], { type }));
  link.download = name;
  link.click();
  URL.revokeObjectURL(link.href);
}

function ResetIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M3 12a9 9 0 1 0 3.5-7.1M3 4v5h5"
        stroke="currentColor"
        stroke-width="2.2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 3v12m0 0-4.5-4.5M12 15l4.5-4.5M4 21h16"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  );
}

function RawOutput(
  props: { content: string; filename: string; mime: string },
) {
  const [copied, setCopied] = useState(false);
  return (
    <div class="raw-output">
      <div class="raw-output__header">
        <span>Raw output</span>
        <div class="raw-output__actions">
          <button
            type="button"
            class="button button--quiet button--small"
            onClick={() => {
              navigator.clipboard?.writeText(props.content).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }).catch(() => undefined);
            }}
          >
            {copied ? "Copied" : "Copy"}
          </button>
          <button
            type="button"
            class="button button--quiet button--small raw-output__icon-btn"
            aria-label="Download"
            title="Download"
            onClick={() => download(props.filename, props.content, props.mime)}
          >
            <DownloadIcon />
          </button>
        </div>
      </div>
      <pre class="code-block raw-output__pre">{props.content}</pre>
    </div>
  );
}

export default function StylingPlayground() {
  const [bootstrap, setBootstrap] = useState<Bootstrap | null>(null);
  const [session, setSession] = useState<SessionResponse | null>(null);
  const [secureStyles, setSecureStyles] = useState(DEFAULT_SECURE);
  const [secureState, setSecureState] = useState<SecureState>("base");
  const [cssTokens, setCssTokens] = useState<CssTokens>({});
  const [cssRules, setCssRules] = useState<CssRules>(DEFAULT_CSS_RULES);
  const [nativeOptions, setNativeOptions] = useState<NativeOptions>(DEFAULT_NATIVE);
  const [cardOptions, setCardOptions] = useState<CardOptions>(() => ({
    ...DEFAULT_CARD,
    showInstallmentAmounts: INSTALLMENT_COUNTRIES.includes(detectInitialCountry()),
  }));
  // Guessed from the browser's own language preferences on first render, so a
  // Dutch or Japanese visitor lands on their own market instead of a fixed
  // one. Server-side there is no navigator, so the shared European fallback
  // is rendered and the guess is applied on hydration.
  const [country, setCountry] = useState(detectInitialCountry);
  const [locale, setLocale] = useState(() => localeForCountry(detectInitialCountry()));
  const [localeManual, setLocaleManual] = useState(false);
  const [availableMethods, setAvailableMethods] = useState<AvailableMethod[]>([]);
  const [section, setSection] = useState<"styling" | "configuration" | "css">("configuration");
  const [openGroups, setOpenGroups] = useState(DEFAULT_OPEN_GROUPS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successFlash, setSuccessFlash] = useState(false);
  const host = useRef<HTMLDivElement>(null);
  const mounted = useRef<Mounted | null>(null);
  // Persisted so most option changes can be applied by re-instantiating just
  // the Dropin element — no need to rebuild the whole Core / hit /sessions.
  const checkoutRef = useRef<Core | null>(null);
  // The country/locale refresh (async, hits /sessions) and the lightweight
  // native/style remount (near-instant) can overlap — dragging a slider right
  // after switching country, for instance. Each mount reserves the next
  // token and any mount whose token has since been superseded discards
  // itself instead of clobbering a newer one, which is what caused the
  // Drop-in to visibly flicker/remount on its own.
  const mountToken = useRef(0);
  // Adyen sessions are single-use: once a payment completes on one, mounting
  // it again fails with "The provided session identifier or data is invalid".
  const sessionSpent = useRef(false);
  const generatedCss = useMemo(() => cssText(cssTokens, cssRules), [cssTokens, cssRules]);
  const previewVariables = useMemo(() => cssPreviewVariables(cssTokens), [cssTokens]);
  const tokenOverrides = cssTokenSetCount(cssTokens);

  useEffect(() => {
    initialize().catch((cause) => {
      setError(cause instanceof Error ? cause.message : "Drop-in initialization failed.");
      setLoading(false);
    });
    return () => mounted.current?.unmount();
  }, []);

  // countryCode and shopperLocale are baked into the session at creation
  // time server-side, so changing either has to fetch a fresh /sessions
  // (not just rebuild the Core against the old one). Debounced so flipping
  // through the dropdowns doesn't refetch on every change.
  const skipFirstAutoRefresh = useRef(true);
  useEffect(() => {
    if (skipFirstAutoRefresh.current) {
      skipFirstAutoRefresh.current = false;
      return;
    }
    const timeout = setTimeout(() => {
      refreshSession().catch((cause) =>
        setError(cause instanceof Error ? cause.message : "Session refresh failed.")
      );
    }, 400);
    return () => clearTimeout(timeout);
  }, [country, locale]);

  // Secure-field styles, native Drop-in options and card component options are
  // all Dropin-construction props — none of them need a new Core / /sessions
  // call, only re-instantiating the Dropin element against the existing Core.
  // Debounced so dragging a slider doesn't remount on every tick.
  const skipFirstNativeRefresh = useRef(true);
  useEffect(() => {
    if (skipFirstNativeRefresh.current) {
      skipFirstNativeRefresh.current = false;
      return;
    }
    const timeout = setTimeout(() => {
      remountDropinOnly().catch((cause) =>
        setError(cause instanceof Error ? cause.message : "Remount failed.")
      );
    }, 400);
    return () => clearTimeout(timeout);
  }, [secureStyles, nativeOptions, cardOptions]);

  // Side lookup only — populates the pre-select dropdown with this
  // merchant's real payment methods for the chosen country. Independent of
  // the /sessions call the preview actually uses.
  useEffect(() => {
    apiFetch<{ paymentMethods: AvailableMethod[] }>("/api/styling/payment-methods", {
      method: "POST",
      body: JSON.stringify({ countryCode: country }),
    })
      .then((response) => setAvailableMethods(response.paymentMethods))
      .catch(() => setAvailableMethods([]));
  }, [country]);

  async function initialize() {
    const boot = await apiFetch<Bootstrap>("/api/bootstrap");
    setBootstrap(boot);
    if (!boot.clientKey || !boot.profile.isConfigured) {
      throw new Error(
        `Complete the default server profile: ${boot.profile.missingFields.join(", ")}.`,
      );
    }
    const created = await apiFetch<SessionResponse>("/api/styling/session", {
      method: "POST",
      body: JSON.stringify({
        countryCode: country,
        shopperLocale: locale,
        installments: INSTALLMENT_COUNTRIES.includes(country.toUpperCase()),
      }),
    });
    setSession(created);
    await mountDropin(boot, created, country, locale);
    setLoading(false);
  }

  // Fetches a brand-new session carrying the current country/locale, then
  // rebuilds the Core against it — used whenever either changes.
  async function refreshSession(countryCode = country, shopperLocale = locale) {
    if (!bootstrap?.clientKey) return;
    setLoading(true);
    try {
      const created = await apiFetch<SessionResponse>("/api/styling/session", {
        method: "POST",
        body: JSON.stringify({
          countryCode,
          shopperLocale,
          installments: INSTALLMENT_COUNTRIES.includes(countryCode.toUpperCase()),
        }),
      });
      setSession(created);
      await mountDropin(bootstrap, created, countryCode, shopperLocale);
    } finally {
      setLoading(false);
    }
  }

  async function mountDropin(
    boot = bootstrap,
    currentSession = session,
    countryCode = country,
    shopperLocale = locale,
  ) {
    if (!boot?.clientKey || !currentSession || !host.current) return;
    const token = ++mountToken.current;
    sessionSpent.current = false;
    const checkout = await AdyenCheckout({
      environment: "test",
      clientKey: boot.clientKey,
      session: currentSession.session,
      countryCode,
      locale: shopperLocale,
      analytics: { enabled: false },
      onPaymentCompleted: () => {
        sessionSpent.current = true;
        flashSuccess();
      },
      onPaymentFailed: () => undefined,
      // Swapping the method list for a 3DS challenge changes the host's
      // height, and on a phone — where the dataset sits above the Drop-in —
      // that leaves the challenge scrolled off screen. Bring it back into
      // view once Adyen has actually rendered the action.
      onActionHandled: () => revealDropin(),
      onError: (cause: Error) => {
        if (isNonFatalWalletError(cause)) return;
        setError(cause.message);
      },
    } as never);
    // A newer mount was requested while this session/Core was being built —
    // discard this one instead of stomping over the one that superseded it.
    if (mountToken.current !== token) return;
    checkoutRef.current = checkout as Core;
    mountDropinElement(checkout as Core, token);
  }

  function mountDropinElement(
    checkout: Core,
    token = ++mountToken.current,
    native = nativeOptions,
    styles = secureStyles,
    card = cardOptions,
    countryCode = country,
  ) {
    if (!host.current || mountToken.current !== token) return;
    mounted.current?.unmount();
    host.current.replaceChildren();
    const dropin = new Dropin(checkout, dropinProps(native, styles, card, countryCode));
    dropin.mount(host.current);
    mounted.current = dropin;
  }

  async function remountDropinOnly() {
    // A session Adyen has already taken a payment on can't be mounted again,
    // so once one is spent every remount has to start from a fresh session
    // instead of reusing the existing Core.
    if (sessionSpent.current || !checkoutRef.current) {
      await refreshSession();
      return;
    }
    mountDropinElement(checkoutRef.current);
  }

  function updateSecure(property: SecureProperty, value: string) {
    setSecureStyles((current) => ({
      ...current,
      [secureState]: { ...current[secureState], [property]: value },
    }));
  }

  function updateToken(token: string, value: string) {
    setCssTokens((current) => ({ ...current, [token]: value }));
  }

  function updateRule<K extends keyof CssRules>(key: K, value: CssRules[K]) {
    setCssRules((current) => ({ ...current, [key]: value }));
  }

  function updateNative<K extends keyof NativeOptions>(key: K, value: NativeOptions[K]) {
    setNativeOptions((current) => ({ ...current, [key]: value }));
  }

  function updateCard<K extends keyof CardOptions>(key: K, value: CardOptions[K]) {
    setCardOptions((current) => ({ ...current, [key]: value }));
  }

  function updatePlaceholder(key: PlaceholderKey, value: string) {
    setCardOptions((current) => ({
      ...current,
      placeholders: { ...current.placeholders, [key]: value },
    }));
  }

  function toggleInstantPaymentType(type: InstantPaymentType, enabled: boolean) {
    setNativeOptions((current) => ({
      ...current,
      instantPaymentTypes: enabled
        ? [...current.instantPaymentTypes, type]
        : current.instantPaymentTypes.filter((entry) => entry !== type),
    }));
  }

  function updateCountry(nextCountry: string) {
    setCountry(nextCountry);
    if (!localeManual) setLocale(localeForCountry(nextCountry));
    // Installments only exist on BR/MX/JP, so showing the per-installment
    // amount is on by default there and off everywhere else. Switching market
    // re-derives it rather than stranding a toggle from the previous country;
    // it stays manually overridable for the market you're on.
    updateCard("showInstallmentAmounts", INSTALLMENT_COUNTRIES.includes(nextCountry));
  }

  function updateLocale(nextLocale: string) {
    setLocaleManual(true);
    setLocale(nextLocale);
  }

  /**
   * Scrolls the Drop-in back under the viewport top. Only does anything on the
   * stacked (phone) layout, where the host can leave the screen; on the
   * side-by-side layout it is already in view and moving the page would be
   * the more surprising behaviour.
   */
  function revealDropin() {
    if (typeof globalThis.matchMedia !== "function") return;
    if (!globalThis.matchMedia("(max-width: 900px)").matches) return;
    // Let Adyen finish swapping the DOM before measuring where it landed.
    requestAnimationFrame(() => {
      host.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function flashSuccess() {
    setSuccessFlash(true);
    setTimeout(() => setSuccessFlash(false), 2500);
  }

  function reset() {
    setSecureStyles(DEFAULT_SECURE);
    setCssTokens({});
    setCssRules(DEFAULT_CSS_RULES);
    setNativeOptions(DEFAULT_NATIVE);
    setCardOptions({
      ...DEFAULT_CARD,
      showInstallmentAmounts: INSTALLMENT_COUNTRIES.includes(country),
    });
    setError(null);
    // A fresh session, not a remount of the current one: an Adyen session is
    // single-use, so once a payment has gone through, reusing it fails with
    // "The provided session identifier or data is invalid". Reset is meant to
    // hand back a checkout you can pay with again.
    refreshSession().catch((cause) =>
      setError(cause instanceof Error ? cause.message : "Reset failed.")
    );
  }

  function selectSection(next: "styling" | "configuration" | "css") {
    setSection(next);
  }

  function groupOpen(key: string): boolean {
    return openGroups[key] === true;
  }

  function setGroupOpen(key: string, open: boolean) {
    setOpenGroups((current) => ({ ...current, [key]: open }));
  }

  const installmentMarket = INSTALLMENT_COUNTRIES.includes(country);
  const socialSecurityMarket = SOCIAL_SECURITY_NUMBER_COUNTRIES.includes(country);

  return (
    <>
      <style>{generatedCss}</style>
      <div class="styling-toolbar">
        <div class="styling-brand">
          <AdyenWordmark />
          <span class="brand-demo">DEMOS</span>
          <small class="styling-brand__sdk">Adyen Web SDK {ADYEN_WEB_VERSION}</small>
        </div>
        <div class="toolbar-markets">
          <div class="toolbar-country">
            <select
              id="preview-country"
              aria-label="Checkout market"
              value={country}
              onChange={(event) => updateCountry(event.currentTarget.value)}
            >
              {COUNTRIES.map(([code, name]) => (
                <option value={code}>
                  {flagEmoji(code)} {name}
                </option>
              ))}
            </select>
          </div>
          <div class="toolbar-country">
            <select
              id="preview-locale"
              aria-label="Shopper locale"
              value={locale}
              onChange={(event) => updateLocale(event.currentTarget.value)}
            >
              {LOCALES.map(([code, name]) => (
                <option key={code} value={code}>{name} ({code})</option>
              ))}
            </select>
          </div>
        </div>
      </div>
      {error
        ? (
          <div class="callout callout--danger" role="alert">
            <strong>Configuration error</strong>
            <div>{error}</div>
          </div>
        )
        : null}
      <div class="styling-layout">
        <section class="styling-preview" style={previewVariables}>
          <div class="dropin-host" ref={host} aria-busy={loading}>
            {loading ? <div class="dropin-placeholder">Loading Adyen TEST Drop-in…</div> : null}
          </div>
          <TestCards />
        </section>
        <aside id="styling-panel" class="styling-panel">
          <div class="styling-panel__bar">
            <span class="styling-panel__title">Customisation</span>
            <button
              class={`styling-reset${successFlash ? " styling-reset--success" : ""}`}
              type="button"
              onClick={reset}
            >
              <ResetIcon />
              {successFlash ? "Reset" : "Reset all"}
            </button>
          </div>
          <div class="styling-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={section === "styling"}
              onClick={() => selectSection("styling")}
            >
              Native Styling
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={section === "configuration"}
              onClick={() => selectSection("configuration")}
            >
              Configuration
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={section === "css"}
              onClick={() => selectSection("css")}
            >
              CSS{tokenOverrides ? ` (${tokenOverrides})` : ""}
            </button>
          </div>
          <div class="styling-controls styling-controls--shape">
            <OptionRow
              id="shape-radius-s"
              label="Small radius"
              spec={cssTokenSpec("border-radius-s")}
              value={cssTokens["border-radius-s"] ?? ""}
              onChange={(value) => updateToken("border-radius-s", value)}
            />
            <OptionRow
              id="shape-radius-m"
              label="Medium radius"
              spec={cssTokenSpec("border-radius-m")}
              value={cssTokens["border-radius-m"] ?? ""}
              onChange={(value) => updateToken("border-radius-m", value)}
            />
          </div>
          <div class="styling-controls">
            {section === "styling"
              ? (
                <>
                  <p class="css-note">
                    The card number, expiry date and security code are rendered inside Adyen-hosted
                    iframes, so no page CSS can reach them: they are styled only through this
                    object. All {SECURE_PROPERTY_SPECS.length}{" "}
                    properties Adyen accepts are below, for each of its four states.
                  </p>
                  <div class="styling-segmented" role="tablist" aria-label="Field state">
                    {SECURE_STATES.map((state) => {
                      const count = secureSetCount(secureStyles, state);
                      return (
                        <button
                          key={state}
                          type="button"
                          role="tab"
                          aria-selected={secureState === state}
                          onClick={() => setSecureState(state)}
                        >
                          {SECURE_STATE_META[state].label}
                          {count ? <span class="styling-segmented__count">{count}</span> : null}
                        </button>
                      );
                    })}
                  </div>
                  <p class="option-group__hint">{SECURE_STATE_META[secureState].hint}</p>
                  {SECURE_GROUPS.map((group) => {
                    const specs = SECURE_PROPERTY_SPECS
                      .filter((spec) => spec.group === group);
                    if (specs.length === 0) return null;
                    const key = `secure:${group}`;
                    return (
                      <OptionGroup
                        key={key}
                        title={group}
                        count={secureSetCount(secureStyles, secureState, group)}
                        open={groupOpen(key)}
                        onToggle={(open) => setGroupOpen(key, open)}
                      >
                        {specs.map((spec) => (
                          <OptionRow
                            key={spec.property}
                            id={`secure-${secureState}-${spec.property}`}
                            label={spec.label}
                            hint={spec.hint}
                            spec={spec}
                            value={secureStyles[secureState][spec.property] ?? ""}
                            onChange={(value) => updateSecure(spec.property, value)}
                          />
                        ))}
                      </OptionGroup>
                    );
                  })}
                  <RawOutput
                    content={JSON.stringify(
                      {
                        card: cardConfigObject(secureStyles, cardOptions, country),
                        storedCard: storedCardConfigObject(secureStyles, cardOptions),
                      },
                      null,
                      2,
                    )}
                    filename="adyen-styling-config.json"
                    mime="application/json"
                  />
                </>
              )
              : section === "configuration"
              ? (
                <>
                  <OptionGroup
                    title="Drop-in"
                    hint="DropinConfiguration: how the payment method list itself behaves."
                    open={groupOpen("config:Drop-in")}
                    onToggle={(open) => setGroupOpen("config:Drop-in", open)}
                  >
                    <SwitchRow
                      label="Show payment methods"
                      hint="showPaymentMethods"
                      checked={nativeOptions.showPaymentMethods}
                      onChange={(value) => updateNative("showPaymentMethods", value)}
                    />
                    <SwitchRow
                      label="Show stored payment methods"
                      hint="showStoredPaymentMethods"
                      checked={nativeOptions.showStoredPaymentMethods}
                      onChange={(value) => updateNative("showStoredPaymentMethods", value)}
                    />
                    <SwitchRow
                      label="Open first payment method"
                      hint="openFirstPaymentMethod"
                      checked={nativeOptions.openFirstPaymentMethod}
                      onChange={(value) => updateNative("openFirstPaymentMethod", value)}
                    />
                    <SwitchRow
                      label="Open first stored method"
                      hint="openFirstStoredPaymentMethod — takes priority over the toggle above"
                      checked={nativeOptions.openFirstStoredPaymentMethod}
                      onChange={(value) => updateNative("openFirstStoredPaymentMethod", value)}
                    />
                    <SwitchRow
                      label="Show radio buttons"
                      hint="showRadioButton"
                      checked={nativeOptions.showRadioButton}
                      onChange={(value) => updateNative("showRadioButton", value)}
                    />
                    <SwitchRow
                      label="Skip final animation"
                      hint="disableFinalAnimation"
                      checked={nativeOptions.disableFinalAnimation}
                      onChange={(value) => updateNative("disableFinalAnimation", value)}
                    />
                    <SwitchRow
                      label="Apple Pay on top"
                      hint="instantPaymentTypes"
                      checked={nativeOptions.instantPaymentTypes.includes("applepay")}
                      onChange={(value) => toggleInstantPaymentType("applepay", value)}
                    />
                    <SwitchRow
                      label="Google Pay on top"
                      hint="instantPaymentTypes"
                      checked={nativeOptions.instantPaymentTypes.includes("googlepay")}
                      onChange={(value) => toggleInstantPaymentType("googlepay", value)}
                    />
                    <Field label="Pre-select method" htmlFor="native-open-type">
                      <select
                        id="native-open-type"
                        value={nativeOptions.openPaymentMethodType}
                        onChange={(event) =>
                          updateNative("openPaymentMethodType", event.currentTarget.value)}
                      >
                        <option value="">None</option>
                        {availableMethods.map(({ type, name }) => (
                          <option value={type}>{name}</option>
                        ))}
                      </select>
                      <small>openPaymentMethod — takes priority over the two toggles above.</small>
                    </Field>
                  </OptionGroup>
                  <OptionGroup
                    title="Card fields"
                    hint="Which fields the card form renders, and how."
                    open={groupOpen("config:Card fields")}
                    onToggle={(open) => setGroupOpen("config:Card fields", open)}
                  >
                    <SwitchRow
                      label="Show holder name"
                      hint="hasHolderName"
                      checked={cardOptions.hasHolderName}
                      onChange={(value) => updateCard("hasHolderName", value)}
                    />
                    <SwitchRow
                      label="Holder name required"
                      hint="holderNameRequired"
                      checked={cardOptions.holderNameRequired}
                      disabled={!cardOptions.hasHolderName}
                      onChange={(value) => updateCard("holderNameRequired", value)}
                    />
                    <SwitchRow
                      label="Holder name on top"
                      hint="positionHolderNameOnTop"
                      checked={cardOptions.positionHolderNameOnTop}
                      disabled={!cardOptions.hasHolderName}
                      onChange={(value) => updateCard("positionHolderNameOnTop", value)}
                    />
                    <Field label="Prefill holder name" htmlFor="card-holder-prefill">
                      <input
                        id="card-holder-prefill"
                        type="text"
                        value={cardOptions.holderNamePrefill}
                        placeholder="J. Smith"
                        disabled={!cardOptions.hasHolderName}
                        onInput={(event) =>
                          updateCard("holderNamePrefill", event.currentTarget.value)}
                      />
                      <small>data.holderName</small>
                    </Field>
                    <SwitchRow
                      label="Hide CVC field"
                      hint="hideCVC"
                      checked={cardOptions.hideCVC}
                      onChange={(value) => updateCard("hideCVC", value)}
                    />
                    <SwitchRow
                      label="Mask security code"
                      hint="maskSecurityCode"
                      checked={cardOptions.maskSecurityCode}
                      onChange={(value) => updateCard("maskSecurityCode", value)}
                    />
                    <SwitchRow
                      label="Show brand icon"
                      hint="showBrandIcon"
                      checked={cardOptions.showBrandIcon}
                      onChange={(value) => updateCard("showBrandIcon", value)}
                    />
                    <SwitchRow
                      label="Show contextual element"
                      hint="showContextualElement — the hint shown next to the logo"
                      checked={cardOptions.showContextualElement}
                      onChange={(value) => updateCard("showContextualElement", value)}
                    />
                  </OptionGroup>
                  <OptionGroup
                    title="Placeholders"
                    hint={PLACEHOLDERS_HINT}
                    count={Object.values(cardOptions.placeholders).filter(Boolean).length}
                    open={groupOpen("config:Placeholders")}
                    onToggle={(open) => setGroupOpen("config:Placeholders", open)}
                  >
                    {PLACEHOLDER_FIELDS.map(([key, label, example]) => (
                      <OptionRow
                        key={key}
                        id={`placeholder-${key}`}
                        label={label}
                        spec={{ kind: "text", fallback: example }}
                        value={cardOptions.placeholders[key] ?? ""}
                        onChange={(value) => updatePlaceholder(key, value)}
                      />
                    ))}
                  </OptionGroup>
                  <OptionGroup
                    title="Billing address"
                    hint="Collected inside the card form and sent with the payment."
                    open={groupOpen("config:Billing address")}
                    onToggle={(open) => setGroupOpen("config:Billing address", open)}
                  >
                    <SwitchRow
                      label="Billing address required"
                      hint="billingAddressRequired"
                      checked={cardOptions.billingAddressRequired}
                      onChange={(value) => updateCard("billingAddressRequired", value)}
                    />
                    {cardOptions.billingAddressRequired
                      ? (
                        <>
                          <Field label="Address mode" htmlFor="card-billing-mode">
                            <select
                              id="card-billing-mode"
                              value={cardOptions.billingAddressMode}
                              onChange={(event) =>
                                updateCard(
                                  "billingAddressMode",
                                  event.currentTarget.value as BillingAddressMode,
                                )}
                            >
                              <option value="full">full — every field</option>
                              <option value="partial">partial — postal code only</option>
                              <option value="none">none — no fields</option>
                            </select>
                            <small>billingAddressMode</small>
                          </Field>
                          <div class="field">
                            <label for="card-billing-required">Required fields</label>
                            <CheckboxDropdown
                              id="card-billing-required"
                              items={ADDRESS_FIELDS}
                              selected={cardOptions.billingAddressRequiredFields}
                              emptyLabel="(empty) no required fields"
                              onChange={(next) => updateCard("billingAddressRequiredFields", next)}
                            />
                            <small>
                              billingAddressRequiredFields — empty means Adyen applies its own
                              per-country schema.
                            </small>
                          </div>
                          <div class="field">
                            <label for="card-billing-countries">Allowed countries</label>
                            <CheckboxDropdown
                              id="card-billing-countries"
                              items={COUNTRY_ITEMS}
                              selected={cardOptions.billingAddressAllowedCountries}
                              emptyLabel="(empty) all countries"
                              onChange={(next) =>
                                updateCard("billingAddressAllowedCountries", next)}
                            />
                            <small>
                              billingAddressAllowedCountries — empty means every country Adyen
                              supports.
                            </small>
                          </div>
                        </>
                      )
                      : null}
                  </OptionGroup>
                  <OptionGroup
                    title="Input behaviour"
                    hint="Focus, formatting and validation of the secured fields."
                    open={groupOpen("config:Input behaviour")}
                    onToggle={(open) => setGroupOpen("config:Input behaviour", open)}
                  >
                    <SwitchRow
                      label="Auto-focus next field"
                      hint="autoFocus"
                      checked={cardOptions.autoFocus}
                      onChange={(value) => updateCard("autoFocus", value)}
                    />
                    <SwitchRow
                      label="iOS keypad fix"
                      hint={"keypadFix — works around an iOS/Safari bug where the keypad " +
                        "stays up after the card field is no longer active."}
                      checked={cardOptions.keypadFix}
                      onChange={(value) => updateCard("keypadFix", value)}
                    />
                    <SwitchRow
                      label="Legacy input mode"
                      hint={"legacyInputMode — gives the fields type=tel instead of " +
                        'type=text inputmode="numeric", for keyboards that ignore inputmode.'}
                      checked={cardOptions.legacyInputMode}
                      onChange={(value) => updateCard("legacyInputMode", value)}
                    />
                    <SwitchRow
                      label="Disable iOS arrow keys"
                      hint={"disableIOSArrowKeys — hides the ‹ › keys above the iOS keyboard, " +
                        "which otherwise jump focus out of the secured field."}
                      checked={cardOptions.disableIOSArrowKeys}
                      onChange={(value) => updateCard("disableIOSArrowKeys", value)}
                    />
                    <SwitchRow
                      label="Expose expiry date"
                      hint={"exposeExpiryDate — the secured field also returns the expiry " +
                        "unencrypted. Only the expiry, never the PAN, so it stays out of " +
                        "PCI scope — but it does leave the iframe in clear."}
                      checked={cardOptions.exposeExpiryDate}
                      onChange={(value) => updateCard("exposeExpiryDate", value)}
                    />
                    <Field label="Minimum expiry date" htmlFor="card-min-expiry">
                      <input
                        id="card-min-expiry"
                        type="text"
                        value={cardOptions.minimumExpiryDate}
                        placeholder="mm/yy"
                        onInput={(event) =>
                          updateCard("minimumExpiryDate", event.currentTarget.value)}
                      />
                      {cardOptions.minimumExpiryDate &&
                          !isValidExpiryDate(cardOptions.minimumExpiryDate)
                        ? <small class="field-warning">Use the mm/yy format.</small>
                        : <small>minimumExpiryDate — rejects cards expiring before this.</small>}
                    </Field>
                  </OptionGroup>
                  {socialSecurityMarket || installmentMarket
                    ? (
                      <OptionGroup
                        title="This market only"
                        hint={`Options Adyen only applies in ${country}.`}
                        open={groupOpen("config:Market")}
                        onToggle={(open) => setGroupOpen("config:Market", open)}
                      >
                        {socialSecurityMarket
                          ? (
                            <Field label="Social security number" htmlFor="card-ssn-mode">
                              <select
                                id="card-ssn-mode"
                                value={cardOptions.socialSecurityNumberMode}
                                onChange={(event) =>
                                  updateCard(
                                    "socialSecurityNumberMode",
                                    event.currentTarget.value as SocialSecurityNumberMode,
                                  )}
                              >
                                <option value="auto">Auto (by card BIN)</option>
                                <option value="show">Always show</option>
                                <option value="hide">Never show</option>
                              </select>
                              <small>configuration.socialSecurityNumberMode — Brazil only.</small>
                            </Field>
                          )
                          : null}
                        {installmentMarket
                          ? (
                            <>
                              <p class="option-note">
                                installmentOptions is automatically sent in the /sessions request
                                for this market (Brazil, Mexico, Japan) — no toggle needed. This
                                only controls whether the per-installment amount is displayed.
                              </p>
                              <SwitchRow
                                label="Show installment amounts"
                                hint="showInstallmentAmounts"
                                checked={cardOptions.showInstallmentAmounts}
                                onChange={(value) => updateCard("showInstallmentAmounts", value)}
                              />
                            </>
                          )
                          : null}
                      </OptionGroup>
                    )
                    : null}
                  <OptionGroup
                    title="Disclaimer message"
                    hint="disclaimerMessage — rendered under the card fields."
                    open={groupOpen("config:Disclaimer")}
                    onToggle={(open) => setGroupOpen("config:Disclaimer", open)}
                  >
                    <SwitchRow
                      label="Enable disclaimer"
                      checked={cardOptions.disclaimerEnabled}
                      onChange={(value) => updateCard("disclaimerEnabled", value)}
                    />
                    {cardOptions.disclaimerEnabled
                      ? (
                        <>
                          <p class="option-note">
                            A valid http(s):// Link URL is required to render the message — add one
                            below even if you don't need clickable link text.
                          </p>
                          <Field label="Message" htmlFor="disclaimer-message">
                            <input
                              id="disclaimer-message"
                              type="text"
                              value={cardOptions.disclaimerMessage}
                              placeholder="By continuing you agree to %{linkText}"
                              onInput={(event) =>
                                updateCard("disclaimerMessage", event.currentTarget.value)}
                            />
                            <small>{"Use %{linkText} to reference the link text below."}</small>
                          </Field>
                          <Field label="Link text" htmlFor="disclaimer-link-text">
                            <input
                              id="disclaimer-link-text"
                              type="text"
                              value={cardOptions.disclaimerLinkText}
                              onInput={(event) =>
                                updateCard("disclaimerLinkText", event.currentTarget.value)}
                            />
                          </Field>
                          <Field label="Link URL" htmlFor="disclaimer-link">
                            <input
                              id="disclaimer-link"
                              type="url"
                              value={cardOptions.disclaimerLink}
                              placeholder="https://example.com/terms"
                              onInput={(event) =>
                                updateCard("disclaimerLink", event.currentTarget.value)}
                            />
                            {cardOptions.disclaimerMessage &&
                                !isValidHttpUrl(cardOptions.disclaimerLink)
                              ? (
                                <small class="field-warning">
                                  Add a valid http(s):// URL above to display the message.
                                </small>
                              )
                              : null}
                          </Field>
                        </>
                      )
                      : null}
                  </OptionGroup>
                  <RawOutput
                    content={JSON.stringify(
                      { card: cardConfigObject(secureStyles, cardOptions, country) },
                      null,
                      2,
                    )}
                    filename="adyen-card-config.json"
                    mime="application/json"
                  />
                </>
              )
              : (
                <>
                  <p class="css-note">
                    The {CSS_TOKEN_SPECS.length}{" "}
                    custom properties below are the ones Adyen Web actually reads, taken from the
                    stylesheet it ships. They are the supported way to theme the Drop-in; the
                    class-name rules at the end are not, and can break on any upgrade.
                  </p>
                  <p class="css-cdn-link">
                    Base stylesheet:{" "}
                    <a href={ADYEN_CSS_URL} target="_blank" rel="noopener noreferrer">
                      adyen.css ({ADYEN_WEB_VERSION})
                    </a>
                  </p>
                  <div class="styling-filter-row">
                    {tokenOverrides
                      ? (
                        <button
                          type="button"
                          class="button button--quiet button--small"
                          onClick={() => setCssTokens({})}
                        >
                          Clear {tokenOverrides}
                        </button>
                      )
                      : null}
                  </div>
                  {CSS_TOKEN_GROUPS.map((group) => {
                    const specs = CSS_TOKEN_SPECS.filter((spec) => spec.group === group);
                    if (specs.length === 0) return null;
                    const key = `css:${group}`;
                    return (
                      <OptionGroup
                        key={key}
                        title={group}
                        count={cssTokenSetCount(cssTokens, group)}
                        open={groupOpen(key)}
                        onToggle={(open) => setGroupOpen(key, open)}
                      >
                        {specs.map((spec) => (
                          <OptionRow
                            key={spec.token}
                            id={`token-${spec.token}`}
                            label={spec.label}
                            hint={`--adyen-sdk-${spec.token}`}
                            spec={spec}
                            value={cssTokens[spec.token] ?? ""}
                            onChange={(value) => updateToken(spec.token, value)}
                          />
                        ))}
                      </OptionGroup>
                    );
                  })}
                  <OptionGroup
                    title="Class-name rules"
                    hint={RULES_HINT}
                    count={cssRuleSetCount(cssRules)}
                    open={groupOpen("css:Rules")}
                    onToggle={(open) => setGroupOpen("css:Rules", open)}
                  >
                    {CSS_RULE_SPECS.map(({ key, label, spec, hint }) => (
                      <OptionRow
                        key={key}
                        id={`rule-${key}`}
                        label={label}
                        hint={hint}
                        spec={spec}
                        value={cssRules[key]}
                        onChange={(value) => updateRule(key, value)}
                      />
                    ))}
                    <SwitchRow
                      label="Uppercase pay button"
                      checked={cssRules.uppercaseButton}
                      onChange={(value) => updateRule("uppercaseButton", value)}
                    />
                    <SwitchRow
                      label="Compact method headers"
                      checked={cssRules.compactMethods}
                      onChange={(value) => updateRule("compactMethods", value)}
                    />
                  </OptionGroup>
                  <RawOutput
                    content={generatedCss}
                    filename="adyen-overrides.css"
                    mime="text/css"
                  />
                </>
              )}
          </div>
        </aside>
      </div>
    </>
  );
}
