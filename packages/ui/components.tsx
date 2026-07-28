import type { ComponentChildren } from "preact";

const TEST_DATA_LINKS = [
  {
    href:
      "https://chromewebstore.google.com/detail/adyen-test-cards/icllkfleeahmemjgoibajcmeoehkeoag",
    label: "Card dataset (Chrome extension)",
  },
  {
    href:
      "https://docs.adyen.com/development-resources/test-cards-and-credentials/test-card-numbers",
    label: "Card dataset (Adyen docs)",
  },
  {
    href:
      "https://docs.adyen.com/development-resources/test-cards-and-credentials/alternative-payment-method-credentials",
    label: "Alt. payment dataset (Adyen docs)",
  },
  {
    href:
      "https://docs.klarna.com/resources/developer-tools/sample-data/sample-customer-data/#all-countries",
    label: "Klarna dataset (phone numbers)",
  },
] as const;

export function TestDataAndTools() {
  return (
    <details class="header-tools">
      <summary class="header-tools__toggle">Test data &amp; tools</summary>
      <div class="header-tools__menu">
        {TEST_DATA_LINKS.map((link) => (
          <a key={link.href} href={link.href} target="_blank" rel="noopener noreferrer">
            {link.label}
          </a>
        ))}
      </div>
    </details>
  );
}

export function TestBanner() {
  return (
    <div class="test-banner" role="note" aria-label="Test environment warning">
      <span class="test-badge">TEST</span>
      <span>
        Test environment only — never use production credentials or live endpoints.
      </span>
    </div>
  );
}

export function AdyenWordmark() {
  return (
    <svg
      class="adyen-wordmark"
      viewBox="0 0 158 51"
      role="img"
      aria-label="Adyen"
    >
      <path
        fill="currentColor"
        fill-rule="evenodd"
        d="M48.501 32.334h-3.018a1.594 1.594 0 0 1-1.59-1.589V11.56h-5.998c-3.058 0-5.56 2.503-5.56 5.561v16.604c0 3.06 2.502 5.562 5.56 5.562h22.166V0H48.5zM22.165 11.56H.397v6.912h14.181c.874 0 1.59.715 1.59 1.589v12.274h-3.02a1.594 1.594 0 0 1-1.589-1.589v-8.818H5.561C2.503 21.927 0 24.43 0 27.488v6.197c0 3.058 2.503 5.561 5.561 5.561h22.165V17.081c0-3.02-2.502-5.522-5.56-5.522m55.691 20.775h3.02V11.56h11.559v33.725c0 3.059-2.503 5.561-5.562 5.561H65.105v-8.103h15.77v-3.456H70.27c-3.058 0-5.56-2.503-5.56-5.561V11.559h11.558v19.186c0 .874.716 1.59 1.59 1.59m41.352-20.775H97.043v22.166c0 3.058 2.502 5.56 5.561 5.56h21.768v-6.91h-14.181a1.594 1.594 0 0 1-1.589-1.59V18.471h3.019c.874 0 1.589.715 1.589 1.589v8.819h5.998c3.058 0 5.561-2.503 5.561-5.562v-6.196c0-3.06-2.503-5.562-5.561-5.562m10.168 0h22.166c3.098 0 5.561 2.503 5.561 5.522v22.165h-11.56V20.06c0-.874-.715-1.589-1.588-1.589h-3.019v20.815h-11.56z"
        clip-rule="evenodd"
      />
    </svg>
  );
}

const PRIMARY_NAV = [
  { href: "/", label: "Home" },
  { href: "/back-office", label: "Back Office" },
  { href: "/wiki", label: "Wiki" },
] as const;

export function AppShell(props: {
  title: string;
  subtitle: string;
  currentPath: string;
  children: ComponentChildren;
  compact?: boolean;
}) {
  return (
    <>
      <a class="skip-link" href="#main-content">Skip to content</a>
      <div class="app-chrome">
        <header class="app-header">
          <div class="app-header__top">
            <a class="brand" href="/" aria-label={props.title}>
              <AdyenWordmark />
              <span class="brand-demo">DEMOS</span>
            </a>
            <nav class="app-nav-inline" aria-label="Main navigation">
              {PRIMARY_NAV.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  aria-current={props.currentPath === item.href ? "page" : undefined}
                >
                  {item.label}
                </a>
              ))}
              <a href="https://docs.adyen.com" target="_blank" rel="noopener noreferrer">
                Documentation
              </a>
            </nav>
            <div class="app-header__actions">
              <span class="environment-state">
                <span aria-hidden="true" />
                TEST connected
              </span>
              <TestDataAndTools />
              <a class="button button--quiet button--small" href="/settings">Settings</a>
            </div>
          </div>
        </header>
        <TestBanner />
      </div>
      <div class={props.compact ? "app-frame app-frame--compact" : "app-frame"}>
        <div class="app-content">
          <main id="main-content" tabindex={-1}>{props.children}</main>
          <footer class="app-footer">
            <span>© 2026 Adyen TEST playgrounds</span>
            <span>{props.subtitle} · Adyen Web 6.41.0 · Checkout API v72</span>
          </footer>
        </div>
      </div>
    </>
  );
}

export function PageHeader(props: {
  eyebrow?: string;
  title: string;
  description: string;
  actions?: ComponentChildren;
}) {
  return (
    <header class="page-header">
      <div>
        {props.eyebrow ? <span class="eyebrow">{props.eyebrow}</span> : null}
        <h1>{props.title}</h1>
        <p>{props.description}</p>
      </div>
      {props.actions ? <div class="page-actions">{props.actions}</div> : null}
    </header>
  );
}

export function StatusPill(props: {
  children: ComponentChildren;
  tone?: "neutral" | "positive" | "warning" | "danger" | "info";
}) {
  return <span class={`status-pill status-pill--${props.tone ?? "neutral"}`}>{props.children}
  </span>;
}

export function EmptyState(props: {
  title: string;
  description: string;
  children?: ComponentChildren;
}) {
  return (
    <div class="empty-state">
      <span class="empty-state__icon" aria-hidden="true">◎</span>
      <h2>{props.title}</h2>
      <p>{props.description}</p>
      {props.children}
    </div>
  );
}

export function Field(props: {
  label: string;
  hint?: string;
  htmlFor: string;
  children: ComponentChildren;
}) {
  return (
    <div class="field">
      <label for={props.htmlFor}>{props.label}</label>
      {props.children}
      {props.hint ? <small>{props.hint}</small> : null}
    </div>
  );
}

export function Callout(props: {
  title: string;
  children: ComponentChildren;
  tone?: "info" | "warning" | "danger";
  compact?: boolean;
}) {
  return (
    <aside
      class={`callout callout--${props.tone ?? "info"}${props.compact ? " callout--compact" : ""}`}
      role="note"
    >
      <strong>{props.title}</strong>
      <div>{props.children}</div>
    </aside>
  );
}
