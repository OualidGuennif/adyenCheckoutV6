import { AdyenCheckout, Dropin } from "@adyen/adyen-web";
import type { Core } from "@adyen/adyen-web";
import { apiFetch } from "@suite/ui/client.ts";
import { AdyenWordmark, ColorField, Field } from "@suite/ui/components.tsx";
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

// Single source of truth for the loaded @adyen/adyen-web version — update
// this on every SDK bump, everything that needs the version reads it here.
const ADYEN_WEB_VERSION = "6.41.0";
const ADYEN_CSS_URL =
  `https://checkoutshopper-live.cdn.adyen.com/checkoutshopper/sdk/${ADYEN_WEB_VERSION}/adyen.css`;

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
  ["en-GB", "English (GB)"],
  ["en-US", "English (US)"],
  ["fr-FR", "Français (FR)"],
  ["nl-NL", "Nederlands (NL)"],
  ["nl-BE", "Nederlands (BE)"],
  ["zh-CN", "中文 (CN)"],
  ["de-DE", "Deutsch (DE)"],
  ["de-AT", "Deutsch (AT)"],
  ["de-CH", "Deutsch (CH)"],
  ["es-ES", "Español (ES)"],
  ["es-MX", "Español (MX)"],
  ["it-IT", "Italiano (IT)"],
  ["pt-PT", "Português (PT)"],
  ["pt-BR", "Português (BR)"],
  ["en-CA", "English (CA)"],
  ["en-AU", "English (AU)"],
  ["en-NZ", "English (NZ)"],
  ["sv-SE", "Svenska (SE)"],
  ["nb-NO", "Norsk (NO)"],
  ["da-DK", "Dansk (DK)"],
  ["fi-FI", "Suomi (FI)"],
  ["pl-PL", "Polski (PL)"],
  ["cs-CZ", "Čeština (CZ)"],
  ["en-SG", "English (SG)"],
  ["zh-HK", "中文 (HK)"],
  ["ja-JP", "日本語 (JP)"],
  ["ko-KR", "한국어 (KR)"],
  ["en-IN", "English (IN)"],
  ["id-ID", "Bahasa Indonesia (ID)"],
  ["en-MY", "English (MY)"],
  ["th-TH", "ไทย (TH)"],
  ["en-PH", "English (PH)"],
  ["vi-VN", "Tiếng Việt (VN)"],
  ["en-ZA", "English (ZA)"],
  ["en-KE", "English (KE)"],
  ["ar-AE", "العربية (AE)"],
] as const;

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

interface SecureStyles {
  baseColor: string;
  baseFontSize: number;
  baseFontWeight: string;
  baseFontFamily: string;
  lineHeight: number;
  letterSpacing: number;
  background: string;
  caretColor: string;
  textAlign: "left" | "center" | "right";
  errorColor: string;
  placeholderColor: string;
  validatedColor: string;
}

interface CssStyles {
  labelPrimary: string;
  labelSecondary: string;
  backgroundPrimary: string;
  backgroundSecondary: string;
  outlinePrimary: string;
  outlineSecondary: string;
  radiusSmall: number;
  radiusMedium: number;
  borderWidth: number;
  buttonBackground: string;
  buttonText: string;
  methodSpacing: number;
  uppercaseButton: boolean;
  compactMethods: boolean;
}

const DEFAULT_SECURE: SecureStyles = {
  baseColor: "#00112c",
  baseFontSize: 16,
  baseFontWeight: "400",
  baseFontFamily: "Arial, sans-serif",
  lineHeight: 24,
  letterSpacing: 0,
  background: "#ffffff",
  caretColor: "#00112c",
  textAlign: "left",
  errorColor: "#c12435",
  placeholderColor: "#8d95a3",
  validatedColor: "#07883b",
};

const DEFAULT_CSS: CssStyles = {
  labelPrimary: "#00112c",
  labelSecondary: "#5c687c",
  backgroundPrimary: "#ffffff",
  backgroundSecondary: "#f7f8f9",
  outlinePrimary: "#b9c0ca",
  outlineSecondary: "#d9dde3",
  radiusSmall: 4,
  radiusMedium: 8,
  borderWidth: 1,
  buttonBackground: "#00112c",
  buttonText: "#ffffff",
  methodSpacing: 12,
  uppercaseButton: false,
  compactMethods: false,
};

type InstantPaymentType = "applepay" | "googlepay";

interface NativeOptions {
  openFirstPaymentMethod: boolean;
  openFirstStoredPaymentMethod: boolean;
  openPaymentMethodType: string;
  instantPaymentTypes: InstantPaymentType[];
  disableFinalAnimation: boolean;
  showRadioButton: boolean;
}

const DEFAULT_NATIVE: NativeOptions = {
  openFirstPaymentMethod: false,
  openFirstStoredPaymentMethod: false,
  openPaymentMethodType: "",
  instantPaymentTypes: ["applepay", "googlepay"],
  disableFinalAnimation: false,
  showRadioButton: false,
};

type SocialSecurityNumberMode = "auto" | "show" | "hide";

interface CardOptions {
  hasHolderName: boolean;
  holderNameRequired: boolean;
  billingAddressRequired: boolean;
  hideCVC: boolean;
  maskSecurityCode: boolean;
  socialSecurityNumberMode: SocialSecurityNumberMode;
  showInstallmentAmounts: boolean;
  disclaimerEnabled: boolean;
  disclaimerMessage: string;
  disclaimerLinkText: string;
  disclaimerLink: string;
}

const DEFAULT_CARD: CardOptions = {
  hasHolderName: true,
  holderNameRequired: true,
  billingAddressRequired: false,
  hideCVC: false,
  maskSecurityCode: false,
  socialSecurityNumberMode: "auto",
  showInstallmentAmounts: false,
  disclaimerEnabled: false,
  disclaimerMessage: "",
  disclaimerLinkText: "",
  disclaimerLink: "",
};

// Adyen's own DisclaimerMessage component silently renders nothing at all
// (not even the message text) unless every url passed to it is a valid
// http(s) URL — an empty or missing link string means the whole disclaimer
// disappears, message included. Guard against sending a config that would
// silently vanish.
function isValidHttpUrl(value: string): boolean {
  try {
    return ["http:", "https:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

function disclaimerMessageField(card: CardOptions) {
  if (!card.disclaimerEnabled || !card.disclaimerMessage || !isValidHttpUrl(card.disclaimerLink)) {
    return {};
  }
  return {
    disclaimerMessage: {
      message: card.disclaimerMessage,
      linkText: card.disclaimerLinkText,
      link: card.disclaimerLink,
    },
  };
}

function cardConfigObject(styles: SecureStyles, card: CardOptions, country: string) {
  const upperCountry = country.toUpperCase();
  return {
    styles: secureStyleObject(styles),
    hasHolderName: card.hasHolderName,
    holderNameRequired: card.hasHolderName && card.holderNameRequired,
    billingAddressRequired: card.billingAddressRequired,
    hideCVC: card.hideCVC,
    maskSecurityCode: card.maskSecurityCode,
    ...(SOCIAL_SECURITY_NUMBER_COUNTRIES.includes(upperCountry)
      ? { configuration: { socialSecurityNumberMode: card.socialSecurityNumberMode } }
      : {}),
    // installmentOptions itself is NOT set here: for the Sessions flow, Adyen
    // only honors the installment plan baked into the session token at
    // creation time (sent server-side in /api/styling/session, automatically
    // for BR/MX/JP) — a client-side override here is silently ignored.
    // showInstallmentAmounts is a pure Component display toggle, so it's
    // still set client-side.
    ...(INSTALLMENT_COUNTRIES.includes(upperCountry)
      ? { showInstallmentAmounts: card.showInstallmentAmounts }
      : {}),
    ...disclaimerMessageField(card),
  };
}

// storedCard only ever re-collects a CVC — it never renders a holder name,
// billing address or social security number field. Applying
// holderNameRequired/billingAddressRequired to it anyway makes the
// Component report isValid: false with no visible field to fix, so
// clicking "Pay" on a saved card silently does nothing. hideCVC,
// maskSecurityCode and disclaimerMessage all still apply to the CVC field
// it does render, so those are forwarded same as the regular card.
function storedCardConfigObject(styles: SecureStyles, card: CardOptions) {
  return {
    styles: secureStyleObject(styles),
    hideCVC: card.hideCVC,
    maskSecurityCode: card.maskSecurityCode,
    ...disclaimerMessageField(card),
  };
}

function dropinProps(
  native: NativeOptions,
  styles: SecureStyles,
  card: CardOptions,
  country: string,
) {
  return {
    openFirstPaymentMethod: native.openFirstPaymentMethod,
    openFirstStoredPaymentMethod: native.openFirstStoredPaymentMethod,
    ...(native.openPaymentMethodType
      ? { openPaymentMethod: { type: native.openPaymentMethodType } }
      : {}),
    instantPaymentTypes: native.instantPaymentTypes,
    disableFinalAnimation: native.disableFinalAnimation,
    showRadioButton: native.showRadioButton,
    paymentMethodsConfiguration: {
      card: cardConfigObject(styles, card, country),
      storedCard: storedCardConfigObject(styles, card),
    },
  };
}

interface Mounted {
  unmount(): void;
}

function secureStyleObject(styles: SecureStyles) {
  return {
    base: {
      color: styles.baseColor,
      fontSize: `${styles.baseFontSize}px`,
      fontWeight: styles.baseFontWeight,
      fontFamily: styles.baseFontFamily,
      lineHeight: `${styles.lineHeight}px`,
      letterSpacing: `${styles.letterSpacing}px`,
      background: styles.background,
      caretColor: styles.caretColor,
      textAlign: styles.textAlign,
      fontSmoothing: "antialiased",
    },
    error: { color: styles.errorColor },
    placeholder: { color: styles.placeholderColor },
    validated: { color: styles.validatedColor },
  };
}

function cssText(styles: CssStyles): string {
  return `/* Adyen Web 6.41.0 — targeted TEST playground overrides.
 * Import after @adyen/adyen-web/styles/adyen.css.
 * Review selectors after every Adyen Web upgrade.
 */
.adyen-checkout {
  --adyen-sdk-color-label-primary: ${styles.labelPrimary};
  --adyen-sdk-color-label-secondary: ${styles.labelSecondary};
  --adyen-sdk-color-background-primary: ${styles.backgroundPrimary};
  --adyen-sdk-color-background-secondary: ${styles.backgroundSecondary};
  --adyen-sdk-color-outline-primary: ${styles.outlinePrimary};
  --adyen-sdk-color-outline-secondary: ${styles.outlineSecondary};
  --adyen-sdk-border-radius-s: ${styles.radiusSmall}px;
  --adyen-sdk-border-radius-m: ${styles.radiusMedium}px;
  --adyen-sdk-border-width-s: ${styles.borderWidth}px;
}

/* CSS overrides: outside secured-field iframes only. */
.adyen-checkout__button--pay {
  background: ${styles.buttonBackground};
  color: ${styles.buttonText};
  ${styles.uppercaseButton ? "text-transform: uppercase;" : ""}
}

.adyen-checkout__payment-method {
  margin-bottom: ${styles.methodSpacing}px;
}

${
    styles.compactMethods
      ? `.adyen-checkout__payment-method__header {
  padding-block: 8px;
}`
      : ""
  }
`;
}

function download(name: string, content: string, type: string) {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([content], { type }));
  link.download = name;
  link.click();
  URL.revokeObjectURL(link.href);
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
  const [cssStyles, setCssStyles] = useState(DEFAULT_CSS);
  const [nativeOptions, setNativeOptions] = useState(DEFAULT_NATIVE);
  const [cardOptions, setCardOptions] = useState(DEFAULT_CARD);
  // Guessed from the browser's own language preferences on first render, so a
  // Dutch or Japanese visitor lands on their own market instead of a fixed
  // one. Server-side there is no navigator, so the shared European fallback
  // is rendered and the guess is applied on hydration.
  const [country, setCountry] = useState(detectInitialCountry);
  const [locale, setLocale] = useState(() => localeForCountry(detectInitialCountry()));
  const [localeManual, setLocaleManual] = useState(false);
  const [availableMethods, setAvailableMethods] = useState<AvailableMethod[]>([]);
  const [section, setSection] = useState<"official" | "native" | "css">("official");
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
  const generatedCss = useMemo(() => cssText(cssStyles), [cssStyles]);

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
    const checkout = await AdyenCheckout({
      environment: "test",
      clientKey: boot.clientKey,
      session: currentSession.session,
      countryCode,
      locale: shopperLocale,
      analytics: { enabled: false },
      onPaymentCompleted: () => flashSuccess(),
      onPaymentFailed: () => undefined,
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
    if (!checkoutRef.current) {
      await mountDropin();
      return;
    }
    mountDropinElement(checkoutRef.current);
  }

  function updateSecure<K extends keyof SecureStyles>(key: K, value: SecureStyles[K]) {
    setSecureStyles((current) => ({ ...current, [key]: value }));
  }

  function updateCss<K extends keyof CssStyles>(key: K, value: CssStyles[K]) {
    setCssStyles((current) => ({ ...current, [key]: value }));
  }

  function updateNative<K extends keyof NativeOptions>(key: K, value: NativeOptions[K]) {
    setNativeOptions((current) => ({ ...current, [key]: value }));
  }

  function updateCard<K extends keyof CardOptions>(key: K, value: CardOptions[K]) {
    setCardOptions((current) => ({ ...current, [key]: value }));
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
  }

  function updateLocale(nextLocale: string) {
    setLocaleManual(true);
    setLocale(nextLocale);
  }

  function flashSuccess() {
    setSuccessFlash(true);
    setTimeout(() => setSuccessFlash(false), 2500);
  }

  function reset() {
    setSecureStyles(DEFAULT_SECURE);
    setCssStyles(DEFAULT_CSS);
    setNativeOptions(DEFAULT_NATIVE);
    setCardOptions(DEFAULT_CARD);
    setError(null);
    mountDropin(bootstrap, session).catch((cause) =>
      setError(cause instanceof Error ? cause.message : "Remount failed.")
    );
  }

  const previewVariables = {
    "--adyen-sdk-color-label-primary": cssStyles.labelPrimary,
    "--adyen-sdk-color-label-secondary": cssStyles.labelSecondary,
    "--adyen-sdk-color-background-primary": cssStyles.backgroundPrimary,
    "--adyen-sdk-color-background-secondary": cssStyles.backgroundSecondary,
    "--adyen-sdk-color-outline-primary": cssStyles.outlinePrimary,
    "--adyen-sdk-color-outline-secondary": cssStyles.outlineSecondary,
    "--adyen-sdk-border-radius-s": `${cssStyles.radiusSmall}px`,
    "--adyen-sdk-border-radius-m": `${cssStyles.radiusMedium}px`,
    "--adyen-sdk-border-width-s": `${cssStyles.borderWidth}px`,
  };

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
            <label for="preview-country">Country</label>
            <select
              id="preview-country"
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
            <label for="preview-locale">Locale</label>
            <select
              id="preview-locale"
              value={locale}
              onChange={(event) => updateLocale(event.currentTarget.value)}
            >
              {LOCALES.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
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
        </section>
        <aside id="styling-panel" class="styling-panel">
          <button
            class={`styling-reset${successFlash ? " styling-reset--success" : ""}`}
            type="button"
            onClick={reset}
          >
            Reset
          </button>
          <div class="styling-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={section === "official"}
              onClick={() => setSection("official")}
            >
              A · Official styling
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={section === "native"}
              onClick={() => setSection("native")}
            >
              B · Native options
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={section === "css"}
              onClick={() => setSection("css")}
            >
              C · CSS overrides
            </button>
          </div>
          <div class="styling-controls styling-controls--shape">
            <Field label="Small radius" htmlFor="css-radius-s">
              <input
                id="css-radius-s"
                type="range"
                min="0"
                max="24"
                value={cssStyles.radiusSmall}
                onInput={(event) => updateCss("radiusSmall", event.currentTarget.valueAsNumber)}
              />
              <small>{cssStyles.radiusSmall}px</small>
            </Field>
            <Field label="Medium radius" htmlFor="css-radius-m">
              <input
                id="css-radius-m"
                type="range"
                min="0"
                max="32"
                value={cssStyles.radiusMedium}
                onInput={(event) => updateCss("radiusMedium", event.currentTarget.valueAsNumber)}
              />
              <small>{cssStyles.radiusMedium}px</small>
            </Field>
          </div>
          <div class="styling-controls">
            {section === "official"
              ? (
                <>
                  <div class="form-grid">
                    {([
                      ["baseColor", "Input text"],
                      ["background", "Input background"],
                      ["caretColor", "Caret"],
                      ["errorColor", "Invalid state"],
                      ["placeholderColor", "Placeholder"],
                      ["validatedColor", "Validated state"],
                    ] as const).map(([key, label]) => (
                      <ColorField
                        label={label}
                        htmlFor={`secure-${key}`}
                        value={secureStyles[key]}
                        onChange={(value) => updateSecure(key, value)}
                      />
                    ))}
                    <Field label="Font size" htmlFor="secure-font-size">
                      <input
                        id="secure-font-size"
                        type="range"
                        min="12"
                        max="24"
                        value={secureStyles.baseFontSize}
                        onInput={(event) =>
                          updateSecure("baseFontSize", event.currentTarget.valueAsNumber)}
                      />
                      <small>{secureStyles.baseFontSize}px</small>
                    </Field>
                    <Field label="Font weight" htmlFor="secure-weight">
                      <select
                        id="secure-weight"
                        value={secureStyles.baseFontWeight}
                        onChange={(event) =>
                          updateSecure("baseFontWeight", event.currentTarget.value)}
                      >
                        {["200", "300", "400", "500", "600", "700"].map((value) => (
                          <option value={value}>{value}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Font family" htmlFor="secure-family">
                      <select
                        id="secure-family"
                        value={secureStyles.baseFontFamily}
                        onChange={(event) =>
                          updateSecure("baseFontFamily", event.currentTarget.value)}
                      >
                        <option value="Arial, sans-serif">Arial</option>
                        <option value="Georgia, serif">Georgia</option>
                        <option value="Courier New, monospace">Courier New</option>
                        <option value="system-ui, sans-serif">System UI</option>
                      </select>
                    </Field>
                    <Field label="Line height" htmlFor="secure-line-height">
                      <input
                        id="secure-line-height"
                        type="number"
                        min="16"
                        max="40"
                        value={secureStyles.lineHeight}
                        onInput={(event) =>
                          updateSecure("lineHeight", event.currentTarget.valueAsNumber)}
                      />
                    </Field>
                    <Field label="Letter spacing" htmlFor="secure-letter-spacing">
                      <input
                        id="secure-letter-spacing"
                        type="number"
                        min="-2"
                        max="5"
                        step="0.1"
                        value={secureStyles.letterSpacing}
                        onInput={(event) =>
                          updateSecure("letterSpacing", event.currentTarget.valueAsNumber)}
                      />
                    </Field>
                    <Field label="Text align" htmlFor="secure-align">
                      <select
                        id="secure-align"
                        value={secureStyles.textAlign}
                        onChange={(event) =>
                          updateSecure(
                            "textAlign",
                            event.currentTarget.value as "left" | "center" | "right",
                          )}
                      >
                        <option value="left">Left</option>
                        <option value="center">Center</option>
                        <option value="right">Right</option>
                      </select>
                    </Field>
                  </div>
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
              : section === "native"
              ? (
                <>
                  <div class="form-grid">
                    <label class="switch-row">
                      <span>Open first payment method</span>
                      <input
                        type="checkbox"
                        checked={nativeOptions.openFirstPaymentMethod}
                        onChange={(event) =>
                          updateNative("openFirstPaymentMethod", event.currentTarget.checked)}
                      />
                    </label>
                    <label class="switch-row">
                      <span>Open first stored method</span>
                      <input
                        type="checkbox"
                        checked={nativeOptions.openFirstStoredPaymentMethod}
                        onChange={(event) =>
                          updateNative(
                            "openFirstStoredPaymentMethod",
                            event.currentTarget.checked,
                          )}
                      />
                    </label>
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
                      <small>Takes priority over the two toggles above.</small>
                    </Field>
                    <label class="switch-row">
                      <span>Apple Pay on top</span>
                      <input
                        type="checkbox"
                        checked={nativeOptions.instantPaymentTypes.includes("applepay")}
                        onChange={(event) =>
                          toggleInstantPaymentType("applepay", event.currentTarget.checked)}
                      />
                    </label>
                    <label class="switch-row">
                      <span>Google Pay on top</span>
                      <input
                        type="checkbox"
                        checked={nativeOptions.instantPaymentTypes.includes("googlepay")}
                        onChange={(event) =>
                          toggleInstantPaymentType("googlepay", event.currentTarget.checked)}
                      />
                    </label>
                    <label class="switch-row">
                      <span>Skip final animation</span>
                      <input
                        type="checkbox"
                        checked={nativeOptions.disableFinalAnimation}
                        onChange={(event) =>
                          updateNative("disableFinalAnimation", event.currentTarget.checked)}
                      />
                    </label>
                    <label class="switch-row">
                      <span>Show radio buttons</span>
                      <input
                        type="checkbox"
                        checked={nativeOptions.showRadioButton}
                        onChange={(event) =>
                          updateNative("showRadioButton", event.currentTarget.checked)}
                      />
                    </label>
                  </div>
                  <h3 class="styling-subheading">Card component</h3>
                  <div class="form-grid">
                    <label class="switch-row">
                      <span>Show holder name</span>
                      <input
                        type="checkbox"
                        checked={cardOptions.hasHolderName}
                        onChange={(event) =>
                          updateCard("hasHolderName", event.currentTarget.checked)}
                      />
                    </label>
                    <label class="switch-row">
                      <span>Holder name required</span>
                      <input
                        type="checkbox"
                        checked={cardOptions.holderNameRequired}
                        disabled={!cardOptions.hasHolderName}
                        onChange={(event) =>
                          updateCard("holderNameRequired", event.currentTarget.checked)}
                      />
                    </label>
                    <label class="switch-row">
                      <span>Billing address required</span>
                      <input
                        type="checkbox"
                        checked={cardOptions.billingAddressRequired}
                        onChange={(event) =>
                          updateCard("billingAddressRequired", event.currentTarget.checked)}
                      />
                    </label>
                    <label class="switch-row">
                      <span>Hide CVC field</span>
                      <input
                        type="checkbox"
                        checked={cardOptions.hideCVC}
                        onChange={(event) => updateCard("hideCVC", event.currentTarget.checked)}
                      />
                    </label>
                    <label class="switch-row">
                      <span>Mask security code</span>
                      <input
                        type="checkbox"
                        checked={cardOptions.maskSecurityCode}
                        onChange={(event) =>
                          updateCard("maskSecurityCode", event.currentTarget.checked)}
                      />
                    </label>
                    {SOCIAL_SECURITY_NUMBER_COUNTRIES.includes(country)
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
                          <small>Brazil only.</small>
                        </Field>
                      )
                      : null}
                    {INSTALLMENT_COUNTRIES.includes(country)
                      ? (
                        <>
                          <small class="field--full">
                            installmentOptions is automatically sent in the /sessions request for
                            this market (Brazil, Mexico, Japan) — no toggle needed. This only
                            controls whether the per-installment amount is displayed.
                          </small>
                          <label class="switch-row">
                            <span>Show installment amounts</span>
                            <input
                              type="checkbox"
                              checked={cardOptions.showInstallmentAmounts}
                              onChange={(event) =>
                                updateCard(
                                  "showInstallmentAmounts",
                                  event.currentTarget.checked,
                                )}
                            />
                          </label>
                        </>
                      )
                      : null}
                  </div>
                  <h3 class="styling-subheading">Disclaimer message</h3>
                  <div class="form-grid">
                    <label class="switch-row">
                      <span>Enable disclaimer</span>
                      <input
                        type="checkbox"
                        checked={cardOptions.disclaimerEnabled}
                        onChange={(event) =>
                          updateCard("disclaimerEnabled", event.currentTarget.checked)}
                      />
                    </label>
                    {cardOptions.disclaimerEnabled
                      ? (
                        <>
                          <small class="field--full">
                            A valid http(s):// Link URL is required to render the message — add one
                            below even if you don't need clickable link text.
                          </small>
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
                  </div>
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
                  <p class="css-note">CSS selectors may change between versions.</p>
                  <p class="css-cdn-link">
                    Base stylesheet:{" "}
                    <a href={ADYEN_CSS_URL} target="_blank" rel="noopener noreferrer">
                      adyen.css ({ADYEN_WEB_VERSION})
                    </a>
                  </p>
                  <div class="form-grid">
                    {([
                      ["labelPrimary", "Primary label"],
                      ["labelSecondary", "Secondary label"],
                      ["backgroundPrimary", "Primary surface"],
                      ["backgroundSecondary", "Secondary surface"],
                      ["outlinePrimary", "Primary outline"],
                      ["outlineSecondary", "Secondary outline"],
                      ["buttonBackground", "Pay button"],
                      ["buttonText", "Pay button text"],
                    ] as const).map(([key, label]) => (
                      <ColorField
                        label={label}
                        htmlFor={`css-${key}`}
                        value={cssStyles[key]}
                        onChange={(value) => updateCss(key, value)}
                      />
                    ))}
                    <Field label="Border width" htmlFor="css-border">
                      <input
                        id="css-border"
                        type="number"
                        min="0"
                        max="4"
                        value={cssStyles.borderWidth}
                        onInput={(event) =>
                          updateCss("borderWidth", event.currentTarget.valueAsNumber)}
                      />
                    </Field>
                    <Field label="Method spacing" htmlFor="css-spacing">
                      <input
                        id="css-spacing"
                        type="range"
                        min="0"
                        max="32"
                        value={cssStyles.methodSpacing}
                        onInput={(event) =>
                          updateCss("methodSpacing", event.currentTarget.valueAsNumber)}
                      />
                      <small>{cssStyles.methodSpacing}px</small>
                    </Field>
                    <label class="switch-row">
                      <span>Uppercase pay button</span>
                      <input
                        type="checkbox"
                        checked={cssStyles.uppercaseButton}
                        onChange={(event) =>
                          updateCss("uppercaseButton", event.currentTarget.checked)}
                      />
                    </label>
                    <label class="switch-row">
                      <span>Compact method headers</span>
                      <input
                        type="checkbox"
                        checked={cssStyles.compactMethods}
                        onChange={(event) =>
                          updateCss("compactMethods", event.currentTarget.checked)}
                      />
                    </label>
                  </div>
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
