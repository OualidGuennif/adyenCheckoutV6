import { useState } from "preact/hooks";

interface TestCard {
  scheme: string;
  note?: string;
  pan: string;
  expiry: string;
  cvc: string;
}

/**
 * The first four are the everyday schemes; the rest are the ones you only
 * reach for when testing a specific market or flow, so small screens show
 * them behind "Show more".
 */
const PRIMARY_CARD_COUNT = 4;

const TEST_CARDS: TestCard[] = [
  { scheme: "Visa", pan: "4111 1111 1111 1111", expiry: "03/30", cvc: "737" },
  { scheme: "Mastercard", note: "3DS2", pan: "5454 5454 5454 5454", expiry: "03/30", cvc: "737" },
  { scheme: "Amex", pan: "3700 0000 0000 002", expiry: "03/30", cvc: "7373" },
  { scheme: "Cartes Bancaires", pan: "4035 5010 0000 0008", expiry: "03/30", cvc: "737" },
  { scheme: "Bancontact", pan: "6703 4444 4444 4449", expiry: "03/30", cvc: "737" },
  { scheme: "Diners", pan: "3600 6666 3333 44", expiry: "03/30", cvc: "737" },
  { scheme: "Discover", pan: "6011 6011 6011 6611", expiry: "03/30", cvc: "737" },
  { scheme: "UnionPay", pan: "6250 9460 0000 0016", expiry: "03/30", cvc: "737" },
];

interface AltMethod {
  name: string;
  value: string;
  note?: string;
  /** Rendered in italics under the value — for methods you can't fully fake. */
  disclaimer?: { text: string; linkLabel: string; href: string };
}

const ALT_METHODS: AltMethod[] = [
  { name: "Givex", note: "gift card", value: "6036 2800 0000 0000 000" },
  { name: "Klarna — Netherlands", note: "NL", value: "Any NL address · DOB 01/01/1970" },
  { name: "Klarna — Germany", note: "DE", value: "Any DE address · DOB 01/07/1960" },
  { name: "Klarna — United States", note: "US", value: "Any US address · phone 3106683312" },
  {
    name: "Apple Pay",
    value: "Not simulatable from this playground",
    disclaimer: {
      text: "You need your own Apple sandbox account and a verified domain.",
      linkLabel: "Apple Pay sandbox testing",
      href: "https://developer.apple.com/apple-pay/sandbox-testing/",
    },
  },
  {
    name: "PayPal",
    value: "Not simulatable from this playground",
    disclaimer: {
      text: "You need to generate your own PayPal personal (sandbox) account.",
      linkLabel: "PayPal sandbox accounts",
      href: "https://developer.paypal.com/sandbox-testing/accounts",
    },
  },
];

const KLARNA_DOCS =
  "https://docs.klarna.com/resources/developer-tools/sample-data/sample-customer-data/#all-countries";

function useCopy() {
  const [copied, setCopied] = useState<string | null>(null);
  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value.replace(/\s/g, ""));
      setCopied(value);
      globalThis.setTimeout(() => setCopied(null), 1600);
    } catch {
      // Clipboard access is permission-gated; the value stays readable.
    }
  }
  return { copied, copy };
}

/**
 * Test credentials sit one tap away from the Drop-in instead of behind a trip
 * to the docs. Cards are open by default; the alternative methods — which are
 * mostly pointers rather than numbers you paste — start collapsed.
 */
export function TestCards() {
  const [cardsOpen, setCardsOpen] = useState(true);
  const [altOpen, setAltOpen] = useState(false);
  const [showAllCards, setShowAllCards] = useState(false);
  const { copied, copy } = useCopy();

  const hiddenOnMobile = TEST_CARDS.length - PRIMARY_CARD_COUNT;

  return (
    <div class="test-data">
      <section
        class="test-cards"
        data-open={cardsOpen ? "true" : "false"}
        data-expanded={showAllCards ? "true" : "false"}
        aria-label="Card dataset"
      >
        <button
          class="test-cards__toggle"
          type="button"
          aria-expanded={cardsOpen}
          onClick={() => setCardsOpen(!cardsOpen)}
        >
          <span>Card dataset</span>
          <span class="test-cards__chevron" aria-hidden="true">{cardsOpen ? "−" : "+"}</span>
        </button>
        <div class="test-cards__body">
          <div class="test-cards__list">
            {TEST_CARDS.map((card, index) => (
              <button
                class="test-card"
                type="button"
                key={card.pan}
                data-secondary={index >= PRIMARY_CARD_COUNT ? "true" : "false"}
                title={`Copy ${card.pan}`}
                onClick={() => copy(card.pan)}
              >
                <span class="test-card__top">
                  <span class="test-card__scheme">{card.scheme}</span>
                  {card.note ? <span class="test-card__note">{card.note}</span> : null}
                </span>
                <span class="test-card__pan">{card.pan}</span>
                <span class="test-card__bottom">
                  <span>{card.expiry}</span>
                  <span>CVC {card.cvc}</span>
                  <span class="test-card__copy">{copied === card.pan ? "Copied" : "Copy"}</span>
                </span>
              </button>
            ))}
          </div>
          <button
            class="test-cards__more"
            type="button"
            onClick={() => setShowAllCards(!showAllCards)}
          >
            {showAllCards ? "Show less" : `Show ${hiddenOnMobile} more`}
          </button>
        </div>
      </section>

      <section
        class="test-cards"
        data-open={altOpen ? "true" : "false"}
        aria-label="Alternative payment dataset"
      >
        <button
          class="test-cards__toggle test-cards__toggle--always"
          type="button"
          aria-expanded={altOpen}
          onClick={() => setAltOpen(!altOpen)}
        >
          <span>Alternative payment dataset</span>
          <span class="test-cards__chevron" aria-hidden="true">{altOpen ? "−" : "+"}</span>
        </button>
        <div class="test-cards__body">
          <div class="test-cards__list">
            {ALT_METHODS.map((method) => {
              const content = (
                <>
                  <span class="test-card__top">
                    <span class="test-card__scheme">{method.name}</span>
                    {method.note ? <span class="test-card__note">{method.note}</span> : null}
                  </span>
                  <span class="test-card__pan test-card__pan--sm">{method.value}</span>
                  {method.disclaimer
                    ? (
                      <span class="test-card__disclaimer">
                        {method.disclaimer.text}{" "}
                        <a
                          href={method.disclaimer.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(event) => event.stopPropagation()}
                        >
                          {method.disclaimer.linkLabel}
                        </a>
                      </span>
                    )
                    : (
                      <span class="test-card__bottom">
                        <span class="test-card__copy">
                          {copied === method.value ? "Copied" : "Copy"}
                        </span>
                      </span>
                    )}
                </>
              );
              // Only the pasteable ones are buttons; the pointer-only cards
              // would be a button that does nothing.
              return method.disclaimer
                ? <div class="test-card test-card--static" key={method.name}>{content}</div>
                : (
                  <button
                    class="test-card"
                    type="button"
                    key={method.name}
                    title={`Copy ${method.value}`}
                    onClick={() => copy(method.value)}
                  >
                    {content}
                  </button>
                );
            })}
          </div>
          <a
            class="test-cards__more test-cards__more--link"
            href={KLARNA_DOCS}
            target="_blank"
            rel="noopener noreferrer"
          >
            More Klarna shopper data
          </a>
        </div>
      </section>
    </div>
  );
}
