import { useState } from "preact/hooks";

interface TestCard {
  scheme: string;
  note?: string;
  pan: string;
  expiry: string;
  cvc: string;
}

const TEST_CARDS: TestCard[] = [
  { scheme: "Visa", pan: "4111 1111 1111 1111", expiry: "03/30", cvc: "737" },
  { scheme: "Mastercard", note: "3DS2", pan: "5454 5454 5454 5454", expiry: "03/30", cvc: "737" },
  { scheme: "Amex", pan: "3700 0000 0000 002", expiry: "03/30", cvc: "7373" },
  { scheme: "Cartes Bancaires", pan: "4035 5010 0000 0008", expiry: "03/30", cvc: "737" },
];

/**
 * Test PANs sit one tap away from the Drop-in instead of behind a trip to the
 * docs. Collapsed on small screens, where the checkout itself is the page;
 * open next to it everywhere else.
 */
export function TestCards() {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  async function copyPan(card: TestCard) {
    try {
      await navigator.clipboard.writeText(card.pan.replace(/\s/g, ""));
      setCopied(card.pan);
      globalThis.setTimeout(() => setCopied(null), 1600);
    } catch {
      // Clipboard access is permission-gated; the number stays readable.
    }
  }

  return (
    <section class="test-cards" data-open={open ? "true" : "false"} aria-label="Test cards">
      <button
        class="test-cards__toggle"
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <span>Test cards</span>
        <span class="test-cards__chevron" aria-hidden="true">{open ? "−" : "+"}</span>
      </button>
      <div class="test-cards__list">
        {TEST_CARDS.map((card) => (
          <button
            class="test-card"
            type="button"
            key={card.pan}
            title={`Copy ${card.pan}`}
            onClick={() => copyPan(card)}
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
    </section>
  );
}
