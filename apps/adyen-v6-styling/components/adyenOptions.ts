/**
 * Every native option this playground exposes, in one place.
 *
 * The lists are not a hand-picked subset: the secured-field properties are
 * StyleDefinitions, the card/Drop-in options are CardConfiguration and
 * DropinConfiguration (all of them that a merchant is allowed to set), and the
 * CSS custom properties are the ones actually shipped in adyen.css — all read
 * from @adyen/adyen-web 6.41.0. Re-check them on every SDK bump.
 */

import {
  INSTALLMENT_COUNTRIES,
  SOCIAL_SECURITY_NUMBER_COUNTRIES,
} from "@suite/ui/paymentMethods.ts";

export const ADYEN_WEB_VERSION = "6.41.0";
export const ADYEN_CSS_URL =
  `https://checkoutshopper-live.cdn.adyen.com/checkoutshopper/sdk/${ADYEN_WEB_VERSION}/adyen.css`;

export type ControlKind = "color" | "text" | "select" | "range";

export interface ControlSpec {
  kind: ControlKind;
  /** What Adyen itself uses. Shown as the placeholder / slider start value. */
  fallback?: string;
  options?: string[];
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
}

const FONT_WEIGHTS = ["100", "200", "300", "400", "500", "600", "700", "800", "900"];
const FONT_SMOOTHING = ["antialiased", "subpixel-antialiased", "none"];

/* -------------------------------------------------------------------------- */
/* Secured fields: the styles object                                          */
/* -------------------------------------------------------------------------- */

/**
 * The card number, expiry date and security code live in Adyen-hosted
 * iframes, so no page CSS can reach them: they are styled exclusively through
 * this object, and only these four states exist.
 */
export const SECURE_STATES = ["base", "placeholder", "error", "validated"] as const;
export type SecureState = typeof SECURE_STATES[number];

export const SECURE_STATE_META: Record<SecureState, { label: string; hint: string }> = {
  base: {
    label: "Base",
    hint: "Every secured field, at all times. Adyen defaults: #001b2b, 16px, weight 400.",
  },
  error: {
    label: "Error",
    hint: "While the field content is invalid. Adyen default: #001b2b (only the label turns red).",
  },
  placeholder: {
    label: "Placeholder",
    hint: "The placeholder text. Adyen defaults: #90a2bd, weight 200.",
  },
  validated: {
    label: "Validated",
    hint: "Once the field content is valid. Adyen ships no default for this state.",
  },
};

export type SecureProperty =
  | "background"
  | "caretColor"
  | "color"
  | "display"
  | "font"
  | "fontFamily"
  | "fontSize"
  | "fontSizeAdjust"
  | "fontSmoothing"
  | "fontStretch"
  | "fontStyle"
  | "fontVariant"
  | "fontVariantAlternates"
  | "fontVariantCaps"
  | "fontVariantEastAsian"
  | "fontVariantLigatures"
  | "fontVariantNumeric"
  | "fontWeight"
  | "letterSpacing"
  | "lineHeight"
  | "mozOsxFontSmoothing"
  | "mozTransition"
  | "opacity"
  | "outline"
  | "padding"
  | "textAlign"
  | "textShadow"
  | "transition"
  | "webkitFontSmoothing"
  | "webkitTransition"
  | "wordSpacing";

export const SECURE_GROUPS = [
  "Color",
  "Typography",
  "Font variants",
  "Text rendering",
  "Box & motion",
] as const;
export type SecureGroup = typeof SECURE_GROUPS[number];

export interface SecurePropertySpec extends ControlSpec {
  property: SecureProperty;
  label: string;
  group: SecureGroup;
  hint?: string;
}

export const SECURE_PROPERTY_SPECS: SecurePropertySpec[] = [
  { property: "color", label: "color", group: "Color", kind: "color", fallback: "#001b2b" },
  { property: "background", label: "background", group: "Color", kind: "color" },
  { property: "caretColor", label: "caretColor", group: "Color", kind: "color" },
  {
    property: "opacity",
    label: "opacity",
    group: "Color",
    kind: "range",
    min: 0,
    max: 1,
    step: 0.05,
    fallback: "1",
  },
  {
    property: "fontSize",
    label: "fontSize",
    group: "Typography",
    kind: "range",
    min: 8,
    max: 32,
    step: 1,
    unit: "px",
    fallback: "16px",
  },
  {
    property: "fontWeight",
    label: "fontWeight",
    group: "Typography",
    kind: "select",
    options: FONT_WEIGHTS,
    fallback: "400",
  },
  {
    property: "fontFamily",
    label: "fontFamily",
    group: "Typography",
    kind: "text",
    fallback: "inherited from the page",
  },
  {
    property: "fontStyle",
    label: "fontStyle",
    group: "Typography",
    kind: "select",
    options: ["normal", "italic", "oblique"],
  },
  {
    property: "fontStretch",
    label: "fontStretch",
    group: "Typography",
    kind: "select",
    options: [
      "normal",
      "ultra-condensed",
      "extra-condensed",
      "condensed",
      "semi-condensed",
      "semi-expanded",
      "expanded",
      "extra-expanded",
      "ultra-expanded",
    ],
  },
  {
    property: "fontSizeAdjust",
    label: "fontSizeAdjust",
    group: "Typography",
    kind: "text",
    fallback: "0.5",
  },
  {
    property: "lineHeight",
    label: "lineHeight",
    group: "Typography",
    kind: "range",
    min: 12,
    max: 48,
    step: 1,
    unit: "px",
  },
  {
    property: "letterSpacing",
    label: "letterSpacing",
    group: "Typography",
    kind: "range",
    min: -2,
    max: 8,
    step: 0.1,
    unit: "px",
  },
  {
    property: "wordSpacing",
    label: "wordSpacing",
    group: "Typography",
    kind: "range",
    min: -4,
    max: 16,
    step: 0.5,
    unit: "px",
  },
  {
    property: "font",
    label: "font",
    group: "Typography",
    kind: "text",
    fallback: "italic 500 16px/24px Arial",
    hint: "Shorthand: overrides the individual font properties above.",
  },
  {
    property: "fontVariant",
    label: "fontVariant",
    group: "Font variants",
    kind: "text",
    fallback: "small-caps",
  },
  {
    property: "fontVariantCaps",
    label: "fontVariantCaps",
    group: "Font variants",
    kind: "select",
    options: [
      "normal",
      "small-caps",
      "all-small-caps",
      "petite-caps",
      "all-petite-caps",
      "unicase",
      "titling-caps",
    ],
  },
  {
    property: "fontVariantNumeric",
    label: "fontVariantNumeric",
    group: "Font variants",
    kind: "select",
    options: [
      "normal",
      "ordinal",
      "slashed-zero",
      "lining-nums",
      "oldstyle-nums",
      "proportional-nums",
      "tabular-nums",
    ],
    hint: "tabular-nums keeps the digits from shifting as the shopper types.",
  },
  {
    property: "fontVariantLigatures",
    label: "fontVariantLigatures",
    group: "Font variants",
    kind: "select",
    options: [
      "normal",
      "none",
      "common-ligatures",
      "no-common-ligatures",
      "discretionary-ligatures",
      "historical-ligatures",
      "contextual",
      "no-contextual",
    ],
  },
  {
    property: "fontVariantAlternates",
    label: "fontVariantAlternates",
    group: "Font variants",
    kind: "text",
    fallback: "historical-forms",
  },
  {
    property: "fontVariantEastAsian",
    label: "fontVariantEastAsian",
    group: "Font variants",
    kind: "text",
    fallback: "jis78 full-width",
  },
  {
    property: "textAlign",
    label: "textAlign",
    group: "Text rendering",
    kind: "select",
    options: ["left", "center", "right", "start", "end", "justify"],
  },
  {
    property: "textShadow",
    label: "textShadow",
    group: "Text rendering",
    kind: "text",
    fallback: "0 1px 0 rgba(0, 0, 0, 0.15)",
  },
  {
    property: "fontSmoothing",
    label: "fontSmoothing",
    group: "Text rendering",
    kind: "select",
    options: FONT_SMOOTHING,
  },
  {
    property: "webkitFontSmoothing",
    label: "webkitFontSmoothing",
    group: "Text rendering",
    kind: "select",
    options: FONT_SMOOTHING,
  },
  {
    property: "mozOsxFontSmoothing",
    label: "mozOsxFontSmoothing",
    group: "Text rendering",
    kind: "select",
    options: ["auto", "grayscale", "unset"],
  },
  {
    property: "display",
    label: "display",
    group: "Text rendering",
    kind: "select",
    options: ["block", "inline-block", "flex", "inline-flex", "inline"],
    hint: "The iframe only holds a single input — display: none hides the field.",
  },
  {
    property: "padding",
    label: "padding",
    group: "Box & motion",
    kind: "text",
    fallback: "0 8px",
    hint: "Applied inside the iframe, on the input itself.",
  },
  {
    property: "outline",
    label: "outline",
    group: "Box & motion",
    kind: "text",
    fallback: "1px solid #0070f5",
  },
  {
    property: "transition",
    label: "transition",
    group: "Box & motion",
    kind: "text",
    fallback: "color 150ms ease",
  },
  {
    property: "webkitTransition",
    label: "webkitTransition",
    group: "Box & motion",
    kind: "text",
  },
  {
    property: "mozTransition",
    label: "mozTransition",
    group: "Box & motion",
    kind: "text",
  },
];

export type SecureStateStyles = Partial<Record<SecureProperty, string>>;
export type SecureStyles = Record<SecureState, SecureStateStyles>;

export const DEFAULT_SECURE: SecureStyles = {
  base: {
    color: "#00112c",
    background: "#ffffff",
    caretColor: "#00112c",
    fontSize: "16px",
    fontWeight: "400",
    fontFamily: "Arial, sans-serif",
    lineHeight: "24px",
    textAlign: "left",
    fontSmoothing: "antialiased",
  },
  error: { color: "#c12435" },
  placeholder: { color: "#8d95a3", fontWeight: "200" },
  validated: { color: "#07883b" },
};

/** Drops the properties left at the Adyen default so the output stays paste-able. */
export function secureStyleObject(styles: SecureStyles) {
  const result: Partial<Record<SecureState, SecureStateStyles>> = {};
  for (const state of SECURE_STATES) {
    const set = Object.entries(styles[state]).filter(([, value]) => value !== "");
    if (set.length > 0) result[state] = Object.fromEntries(set);
  }
  return result;
}

export function secureSetCount(styles: SecureStyles, state: SecureState, group?: SecureGroup) {
  return SECURE_PROPERTY_SPECS
    .filter((spec) => !group || spec.group === group)
    .filter((spec) => styles[state][spec.property]).length;
}

/* -------------------------------------------------------------------------- */
/* CSS custom properties                                                      */
/* -------------------------------------------------------------------------- */

export const CSS_TOKEN_GROUPS = [
  "Labels",
  "Surfaces",
  "Outlines & separators",
  "Radius & borders",
  "Focus & shadow",
  "Alerts",
  "Buttons",
  "Toggle",
  "Tooltip",
  "Spacing",
  "Typography",
  "Motion",
] as const;
export type CssTokenGroup = typeof CSS_TOKEN_GROUPS[number];

export interface CssTokenSpec extends ControlSpec {
  /** Without the --adyen-sdk- prefix. */
  token: string;
  label: string;
  group: CssTokenGroup;
  fallback: string;
}

/** Token name → the override the user typed. Absent/empty means "leave to Adyen". */
export type CssTokens = Record<string, string>;

type TokenEntry = [token: string, fallback: string, overrides?: Partial<CssTokenSpec>];

function humanize(name: string): string {
  const words = name.replace(/-/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** A hex value is a swatch, a single length is a slider, everything else is free text. */
function inferKind(fallback: string): ControlKind {
  if (/^#[0-9a-f]{3,8}$/i.test(fallback)) return "color";
  if (/^-?\d*\.?\d+(px|rem|s)$/.test(fallback)) return "range";
  return "text";
}

function inferRange(fallback: string): Partial<ControlSpec> {
  const unit = fallback.replace(/^-?\d*\.?\d+/, "");
  if (unit === "rem") return { unit, min: 0.5, max: 3, step: 0.0625 };
  if (unit === "s") return { unit, min: 0, max: 1, step: 0.05 };
  return { unit: "px", min: 0, max: 64, step: 1 };
}

function tokenGroup(
  group: CssTokenGroup,
  labelPrefix: string,
  entries: TokenEntry[],
  shared: Partial<CssTokenSpec> = {},
): CssTokenSpec[] {
  return entries.map(([token, fallback, overrides]) => ({
    token,
    fallback,
    group,
    label: humanize(token.slice(labelPrefix.length)),
    kind: inferKind(fallback),
    ...inferRange(fallback),
    ...shared,
    ...overrides,
  }));
}

const WEIGHT_TOKEN: Partial<CssTokenSpec> = { kind: "select", options: FONT_WEIGHTS };

export const CSS_TOKEN_SPECS: CssTokenSpec[] = [
  ...tokenGroup("Labels", "color-label-", [
    ["color-label-primary", "#00112c"],
    ["color-label-secondary", "#5c687c"],
    ["color-label-tertiary", "#5c687c"],
    ["color-label-disabled", "#8d95a3"],
    ["color-label-highlight", "#0070f5"],
    ["color-label-critical", "#c72727"],
    ["color-label-success", "#07893c"],
    ["color-label-on-color", "#ffffff"],
    ["color-label-on-background-highlight-weak", "#0063d7"],
  ]),
  ...tokenGroup("Surfaces", "color-background-", [
    ["color-background-primary", "#ffffff"],
    ["color-background-primary-hover", "#f7f7f8"],
    ["color-background-secondary", "#f7f7f8"],
    ["color-background-secondary-hover", "#eeeff1"],
    ["color-background-secondary-active", "#e3e5e9"],
    ["color-background-tertiary", "#eeeff1"],
    ["color-background-quaternary", "#c0c5cc"],
    ["color-background-disabled", "#eeeff1"],
    ["color-background-inverse-primary", "#00112c"],
    ["color-background-inverse-primary-hover", "#5c687c"],
    ["color-background-always-dark", "#00112c"],
    ["color-background-always-dark-active", "#8d95a3"],
    ["color-background-critical-strong", "#e22d2d"],
  ]),
  ...tokenGroup("Outlines & separators", "color-", [
    ["color-outline-primary", "#dbdee2"],
    ["color-outline-primary-hover", "#c9cdd3"],
    ["color-outline-primary-active", "#00112c"],
    ["color-outline-secondary", "#c9cdd3"],
    ["color-outline-tertiary", "#848d96"],
    ["color-outline-tertiary-hover", "#00112c"],
    ["color-outline-tertiary-active", "#00112c"],
    ["color-outline-critical", "#e22d2d"],
    ["color-outline-disabled", "#dbdee2"],
    ["color-separator-primary", "#dbdee2"],
    ["color-separator-secondary", "#c9cdd3"],
  ]),
  ...tokenGroup("Radius & borders", "border-", [
    ["border-radius-xs", "2px"],
    ["border-radius-s", "4px"],
    ["border-radius-m", "8px"],
    ["border-radius-l", "12px"],
    ["border-width-s", "1px", { max: 12 }],
    ["border-width-l", "3px", { max: 12 }],
  ], { max: 32 }),
  ...tokenGroup("Focus & shadow", "", [
    ["focus-ring-color", "rgba(0, 112, 245, 0.8)"],
    ["focus-ring-outline", "3px", { max: 12 }],
    ["focus-ring-spacer", "1px", { max: 12 }],
    ["shadow-low", "0 2px 4px rgba(0, 17, 44, 0.04), 0 1px 2px rgba(0, 17, 44, 0.02)"],
  ]),
  ...tokenGroup("Alerts", "alert-", [
    ["alert-critical-background-color", "#fef4f4"],
    ["alert-warning-background-color", "#fff5e9"],
    ["alert-success-background-color", "#edfaf3"],
    ["alert-highlight-background-color", "#f2f8ff"],
  ]),
  ...tokenGroup("Buttons", "button-", [
    ["button-tertiary-color", "#00112c"],
    ["button-tertiary-active-color", "#8d95a3"],
    ["button-tertiary-active-background-color", "rgba(0, 0, 0, 0)"],
    ["button-tertiary-box-shadow", "inset 0 0 0 1px rgba(0, 0, 0, 0)"],
    ["button-icon-only-padding", "10px", { max: 32 }],
  ]),
  ...tokenGroup("Toggle", "toggle-", [
    ["toggle-track-background-color", "#ffffff"],
    ["toggle-track-border", "1px solid #8d95a3"],
    ["toggle-track-border-radius", "12px", { max: 32 }],
    ["toggle-track-width", "36px"],
    ["toggle-track-height", "20px"],
    ["toggle-track-padding", "2px 4px"],
    ["toggle-track-hover-background-color", "#f7f7f8"],
    ["toggle-track-hover-border-color", "#6d7789"],
    ["toggle-track-active-background-color", "#eeeff1"],
    ["toggle-track-active-border-color", "#00112c"],
    ["toggle-track-disabled-background-color", "#f7f7f8"],
    ["toggle-track-disabled-border-color", "#dbdee2"],
    ["toggle-track-readonly-background-color", "#f7f7f8"],
    ["toggle-track-readonly-border-color", "#dbdee2"],
    ["toggle-track-toggled-background-color", "#00112c"],
    ["toggle-track-toggled-border", "0"],
    ["toggle-track-toggled-padding", "2px"],
    ["toggle-track-toggled-hover-background-color", "#5c687c"],
    ["toggle-track-toggled-active-background-color", "#8d95a3"],
    ["toggle-track-toggled-disabled-background-color", "#c0c5cc"],
    ["toggle-track-toggled-readonly-background-color", "#c0c5cc"],
    ["toggle-handle-background-color", "#00112c"],
    ["toggle-handle-border-radius", "12px", { max: 32 }],
    ["toggle-handle-width", "12px"],
    ["toggle-handle-height", "12px"],
    ["toggle-handle-transition", "transform 0.15s cubic-bezier(0.2, 0, 0.4, 0.9)"],
    ["toggle-handle-disabled-background-color", "#8d95a3"],
    ["toggle-handle-toggled-background-color", "#ffffff"],
    ["toggle-handle-toggled-color", "#00112c"],
    ["toggle-handle-toggled-width", "16px"],
    ["toggle-handle-toggled-height", "16px"],
    ["toggle-handle-toggled-disabled-background-color", "#eeeff1"],
    ["toggle-handle-toggled-disabled-color", "#8d95a3"],
    ["toggle-handle-toggled-readonly-background-color", "#eeeff1"],
    ["toggle-label-padding", "16px", { max: 48 }],
    ["toggle-description-color", "#5c687c"],
    ["toggle-description-padding", "4px", { max: 48 }],
  ]),
  ...tokenGroup("Tooltip", "tooltip-", [
    ["tooltip-background-color", "#00112c"],
    ["tooltip-color", "#ffffff"],
    ["tooltip-border-radius", "4px", { max: 32 }],
    ["tooltip-padding", "4px 8px"],
    ["tooltip-z-index", "5"],
  ]),
  ...tokenGroup("Spacing", "", [
    ["spacer-000", "0"],
    ["spacer-010", "2px"],
    ["spacer-020", "4px"],
    ["spacer-030", "6px"],
    ["spacer-040", "8px"],
    ["spacer-050", "10px"],
    ["spacer-060", "12px"],
    ["spacer-070", "16px"],
    ["spacer-080", "20px"],
    ["spacer-090", "24px"],
    ["spacer-100", "32px"],
    ["spacer-110", "40px"],
    ["spacer-120", "48px"],
    ["spacer-130", "56px"],
    ["spacer-140", "64px"],
  ], { kind: "range", unit: "px", min: 0, max: 96, step: 1 }),
  ...tokenGroup("Typography", "text-", [
    ["text-body-font-size", "0.875rem"],
    ["text-body-font-weight", "400", WEIGHT_TOKEN],
    ["text-body-line-height", "20px", { max: 60 }],
    ["text-body-wide-line-height", "24px", { max: 60 }],
    ["text-body-stronger-font-weight", "500", WEIGHT_TOKEN],
    ["text-body-strongest-font-weight", "600", WEIGHT_TOKEN],
    ["text-caption-font-size", "0.75rem"],
    ["text-caption-font-weight", "400", WEIGHT_TOKEN],
    ["text-caption-line-height", "18px", { max: 60 }],
    ["text-caption-stronger-font-weight", "500", WEIGHT_TOKEN],
    ["text-subtitle-font-size", "1rem"],
    ["text-subtitle-font-weight", "500", WEIGHT_TOKEN],
    ["text-subtitle-line-height", "26px", { max: 60 }],
    ["text-subtitle-stronger-font-weight", "600", WEIGHT_TOKEN],
    ["text-title-font-size", "1rem"],
    ["text-title-font-weight", "600", WEIGHT_TOKEN],
    ["text-title-line-height", "26px", { max: 60 }],
    ["text-title-m-font-size", "1.25rem", { label: "Title M font size" }],
    ["text-title-m-font-weight", "600", { ...WEIGHT_TOKEN, label: "Title M font weight" }],
    ["text-title-m-line-height", "30px", { label: "Title M line height", max: 60 }],
    ["text-title-l-font-size", "1.5rem", { label: "Title L font size" }],
    ["text-title-l-font-weight", "600", { ...WEIGHT_TOKEN, label: "Title L font weight" }],
    ["text-title-l-line-height", "34px", { label: "Title L line height", max: 60 }],
  ]),
  ...tokenGroup("Motion", "animation-", [
    ["animation-duration-fast", "0.1s"],
    ["animation-duration-moderate", "0.15s"],
    ["animation-easing-standard", "cubic-bezier(0.2, 0, 0.4, 0.9)"],
    ["animation-easing-linear", "linear"],
  ]),
];

export function cssTokenSpec(token: string): CssTokenSpec {
  const spec = CSS_TOKEN_SPECS.find((entry) => entry.token === token);
  if (!spec) throw new Error(`Unknown Adyen CSS token: ${token}`);
  return spec;
}

export function cssTokenSetCount(tokens: CssTokens, group?: CssTokenGroup) {
  return CSS_TOKEN_SPECS
    .filter((spec) => !group || spec.group === group)
    .filter((spec) => tokens[spec.token]).length;
}

/**
 * Rules that have no design token behind them, so they have to be written as
 * plain CSS against Adyen's class names. Those class names are internal and
 * can change on any SDK upgrade — unlike the tokens above.
 */
export interface CssRules {
  payButtonBackground: string;
  payButtonColor: string;
  methodSpacing: string;
  uppercaseButton: boolean;
  compactMethods: boolean;
}

export const DEFAULT_CSS_RULES: CssRules = {
  payButtonBackground: "",
  payButtonColor: "",
  methodSpacing: "",
  uppercaseButton: false,
  compactMethods: false,
};

export const CSS_RULE_SPECS: {
  key: "payButtonBackground" | "payButtonColor" | "methodSpacing";
  label: string;
  spec: ControlSpec;
  hint?: string;
}[] = [
  {
    key: "payButtonBackground",
    label: "Pay button background",
    spec: { kind: "color", fallback: "#00112c" },
    hint: "Prefer the token: color-background-inverse-primary.",
  },
  {
    key: "payButtonColor",
    label: "Pay button label",
    spec: { kind: "color", fallback: "#ffffff" },
    hint: "Prefer the token: color-label-on-color.",
  },
  {
    key: "methodSpacing",
    label: "Space between methods",
    spec: { kind: "range", fallback: "0px", unit: "px", min: 0, max: 32, step: 1 },
  },
];

export function cssRuleSetCount(rules: CssRules) {
  return CSS_RULE_SPECS.filter(({ key }) => rules[key]).length +
    (rules.uppercaseButton ? 1 : 0) + (rules.compactMethods ? 1 : 0);
}

const NOTHING_SET = "/* Nothing overridden yet — the Drop-in runs Adyen's own values. */";

const CSS_HEADER = `/* Adyen Web ${ADYEN_WEB_VERSION} — TEST playground overrides.
 * Import after @adyen/adyen-web/styles/adyen.css.
 * Design tokens are stable; the class-name rules are not — review them
 * after every Adyen Web upgrade.
 */
`;

export function cssText(tokens: CssTokens, rules: CssRules): string {
  const blocks: string[] = [];
  const overrides = CSS_TOKEN_SPECS
    .filter((spec) => tokens[spec.token])
    .map((spec) => `  --adyen-sdk-${spec.token}: ${tokens[spec.token]};`);
  if (overrides.length > 0) blocks.push(`.adyen-checkout {\n${overrides.join("\n")}\n}`);

  const button = [
    rules.payButtonBackground ? `  background: ${rules.payButtonBackground};` : "",
    rules.payButtonColor ? `  color: ${rules.payButtonColor};` : "",
    rules.uppercaseButton ? "  text-transform: uppercase;" : "",
  ].filter(Boolean);
  if (button.length > 0) {
    blocks.push(`.adyen-checkout__button--pay {\n${button.join("\n")}\n}`);
  }
  if (rules.methodSpacing) {
    blocks.push(`.adyen-checkout__payment-method {\n  margin-bottom: ${rules.methodSpacing};\n}`);
  }
  if (rules.compactMethods) {
    blocks.push(".adyen-checkout__payment-method__header {\n  padding-block: 8px;\n}");
  }
  if (blocks.length === 0) return `${CSS_HEADER}\n${NOTHING_SET}\n`;
  return `${CSS_HEADER}\n${blocks.join("\n\n")}\n`;
}

/**
 * The same overrides as inline custom properties, so the page around the
 * Drop-in (its own background, card radius) follows the theme too.
 */
// Keyed on `--${string}` rather than string so the result stays assignable to
// the JSX style prop, which only tolerates custom properties as extra keys.
export function cssPreviewVariables(tokens: CssTokens): Record<`--${string}`, string> {
  const variables: Record<`--${string}`, string> = {};
  for (const spec of CSS_TOKEN_SPECS) {
    if (tokens[spec.token]) variables[`--adyen-sdk-${spec.token}`] = tokens[spec.token];
  }
  return variables;
}

/* -------------------------------------------------------------------------- */
/* Drop-in options (DropinConfiguration)                                      */
/* -------------------------------------------------------------------------- */

export type InstantPaymentType = "applepay" | "googlepay";

export interface NativeOptions {
  openFirstPaymentMethod: boolean;
  openFirstStoredPaymentMethod: boolean;
  openPaymentMethodType: string;
  instantPaymentTypes: InstantPaymentType[];
  showPaymentMethods: boolean;
  showStoredPaymentMethods: boolean;
  showRadioButton: boolean;
  disableFinalAnimation: boolean;
}

export const DEFAULT_NATIVE: NativeOptions = {
  openFirstPaymentMethod: false,
  openFirstStoredPaymentMethod: false,
  openPaymentMethodType: "",
  instantPaymentTypes: ["applepay", "googlepay"],
  showPaymentMethods: true,
  showStoredPaymentMethods: true,
  showRadioButton: false,
  disableFinalAnimation: false,
};

/* -------------------------------------------------------------------------- */
/* Card options (CardConfiguration)                                           */
/* -------------------------------------------------------------------------- */

export type SocialSecurityNumberMode = "auto" | "show" | "hide";
export type BillingAddressMode = "full" | "partial" | "none";

/** Adyen's own address schema, used for billingAddressRequiredFields. */
export const ADDRESS_FIELDS: [string, string][] = [
  ["street", "Street"],
  ["houseNumberOrName", "House number"],
  ["postalCode", "Postal code"],
  ["city", "City"],
  ["stateOrProvince", "State / province"],
  ["country", "Country"],
];

export type PlaceholderKey =
  | "holderName"
  | "cardNumber"
  | "expiryDate"
  | "expiryMonth"
  | "expiryYear"
  | "securityCodeThreeDigits"
  | "securityCodeFourDigits"
  | "password";

export const PLACEHOLDER_FIELDS: [PlaceholderKey, string, string][] = [
  ["holderName", "holderName", "J. Smith"],
  ["cardNumber", "cardNumber", "1234 5678 9012 3456"],
  ["expiryDate", "expiryDate", "MM/YY"],
  ["expiryMonth", "expiryMonth", "MM"],
  ["expiryYear", "expiryYear", "YY"],
  ["securityCodeThreeDigits", "securityCodeThreeDigits", "123"],
  ["securityCodeFourDigits", "securityCodeFourDigits", "1234"],
  ["password", "password", "Korean cards only"],
];

export interface CardOptions {
  hasHolderName: boolean;
  holderNameRequired: boolean;
  positionHolderNameOnTop: boolean;
  holderNamePrefill: string;
  hideCVC: boolean;
  maskSecurityCode: boolean;
  showBrandIcon: boolean;
  showContextualElement: boolean;
  placeholders: Partial<Record<PlaceholderKey, string>>;
  billingAddressRequired: boolean;
  billingAddressMode: BillingAddressMode;
  billingAddressAllowedCountries: string[];
  billingAddressRequiredFields: string[];
  autoFocus: boolean;
  keypadFix: boolean;
  legacyInputMode: boolean;
  disableIOSArrowKeys: boolean;
  trimTrailingSeparator: boolean;
  exposeExpiryDate: boolean;
  enableStoreDetails: boolean;
  minimumExpiryDate: string;
  socialSecurityNumberMode: SocialSecurityNumberMode;
  showInstallmentAmounts: boolean;
  disclaimerEnabled: boolean;
  disclaimerMessage: string;
  disclaimerLinkText: string;
  disclaimerLink: string;
}

export const DEFAULT_CARD: CardOptions = {
  hasHolderName: true,
  holderNameRequired: true,
  positionHolderNameOnTop: false,
  holderNamePrefill: "",
  hideCVC: false,
  maskSecurityCode: false,
  showBrandIcon: true,
  showContextualElement: true,
  placeholders: {},
  billingAddressRequired: false,
  billingAddressMode: "full",
  billingAddressAllowedCountries: [],
  billingAddressRequiredFields: [],
  autoFocus: true,
  keypadFix: true,
  legacyInputMode: false,
  disableIOSArrowKeys: false,
  trimTrailingSeparator: true,
  exposeExpiryDate: false,
  enableStoreDetails: false,
  minimumExpiryDate: "",
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
export function isValidHttpUrl(value: string): boolean {
  try {
    return ["http:", "https:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

export function isValidExpiryDate(value: string): boolean {
  return /^(0[1-9]|1[0-2])\/\d{2}$/.test(value);
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

function placeholdersField(card: CardOptions) {
  const set = Object.entries(card.placeholders).filter(([, value]) => value);
  return set.length > 0 ? { placeholders: Object.fromEntries(set) } : {};
}

/** Options that apply to a re-entered CVC as much as to a full card form. */
function sharedFieldOptions(styles: SecureStyles, card: CardOptions) {
  return {
    styles: secureStyleObject(styles),
    hideCVC: card.hideCVC,
    maskSecurityCode: card.maskSecurityCode,
    showBrandIcon: card.showBrandIcon,
    showContextualElement: card.showContextualElement,
    autoFocus: card.autoFocus,
    keypadFix: card.keypadFix,
    legacyInputMode: card.legacyInputMode,
    disableIOSArrowKeys: card.disableIOSArrowKeys,
    ...placeholdersField(card),
    ...disclaimerMessageField(card),
  };
}

export function cardConfigObject(styles: SecureStyles, card: CardOptions, country: string) {
  const upperCountry = country.toUpperCase();
  return {
    ...sharedFieldOptions(styles, card),
    hasHolderName: card.hasHolderName,
    holderNameRequired: card.hasHolderName && card.holderNameRequired,
    positionHolderNameOnTop: card.positionHolderNameOnTop,
    ...(card.hasHolderName && card.holderNamePrefill
      ? { data: { holderName: card.holderNamePrefill } }
      : {}),
    billingAddressRequired: card.billingAddressRequired,
    ...(card.billingAddressRequired
      ? {
        billingAddressMode: card.billingAddressMode,
        ...(card.billingAddressAllowedCountries.length > 0
          ? { billingAddressAllowedCountries: card.billingAddressAllowedCountries }
          : {}),
        ...(card.billingAddressRequiredFields.length > 0
          ? { billingAddressRequiredFields: card.billingAddressRequiredFields }
          : {}),
      }
      : {}),
    trimTrailingSeparator: card.trimTrailingSeparator,
    exposeExpiryDate: card.exposeExpiryDate,
    // Only sent when on: an explicit false can suppress the "save card"
    // checkbox the session itself asked for.
    ...(card.enableStoreDetails ? { enableStoreDetails: true } : {}),
    ...(isValidExpiryDate(card.minimumExpiryDate)
      ? { minimumExpiryDate: card.minimumExpiryDate }
      : {}),
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
  };
}

// storedCard only ever re-collects a CVC — it never renders a holder name,
// billing address or social security number field. Applying
// holderNameRequired/billingAddressRequired to it anyway makes the
// Component report isValid: false with no visible field to fix, so
// clicking "Pay" on a saved card silently does nothing. Everything that
// applies to the CVC field it does render is forwarded.
export function storedCardConfigObject(styles: SecureStyles, card: CardOptions) {
  return sharedFieldOptions(styles, card);
}

export function dropinProps(
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
    showPaymentMethods: native.showPaymentMethods,
    showStoredPaymentMethods: native.showStoredPaymentMethods,
    showRadioButton: native.showRadioButton,
    disableFinalAnimation: native.disableFinalAnimation,
    paymentMethodsConfiguration: {
      card: cardConfigObject(styles, card, country),
      storedCard: storedCardConfigObject(styles, card),
    },
  };
}
