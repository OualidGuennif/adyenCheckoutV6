export type StepStatus = "executed" | "simulated" | "unavailable";

export interface AgenticStep {
  id: string;
  name: string;
  status: StepStatus;
  system: "playground" | "merchant-catalogue" | "agent-provider" | "adyen";
  summary: string;
  payload: Record<string, unknown>;
}

export interface AgenticRun {
  mode: "mock" | "real";
  intent: string;
  selectedOffer: Offer;
  steps: AgenticStep[];
}

export interface Offer {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  available: boolean;
  tags: string[];
}

export const OFFERS: Offer[] = [
  {
    id: "AC-TRAVEL-01",
    name: "Amsterdam weekend rail package",
    description: "Flexible return rail ticket with a centrally located hotel.",
    price: 28900,
    currency: "EUR",
    available: true,
    tags: ["travel", "weekend", "rail", "amsterdam", "hotel"],
  },
  {
    id: "AC-OUTDOOR-02",
    name: "Lightweight trail kit",
    description: "Trail shoes, hydration vest and weatherproof shell.",
    price: 21900,
    currency: "EUR",
    available: true,
    tags: ["running", "outdoor", "trail", "sport"],
  },
  {
    id: "AC-HOME-03",
    name: "Compact espresso setup",
    description: "Manual espresso maker, grinder and starter coffee set.",
    price: 17900,
    currency: "EUR",
    available: true,
    tags: ["coffee", "espresso", "home", "gift"],
  },
];

function chooseOffer(intent: string): Offer {
  const words = intent.toLowerCase().split(/\W+/).filter(Boolean);
  const ranked = OFFERS.map((offer) => ({
    offer,
    score: offer.tags.filter((tag) => words.includes(tag)).length,
  })).sort((left, right) => right.score - left.score);
  return ranked[0].offer;
}

export function runLocalAgenticMock(intent: string): AgenticRun {
  const selectedOffer = chooseOffer(intent);
  return {
    mode: "mock",
    intent,
    selectedOffer,
    steps: [
      {
        id: crypto.randomUUID(),
        name: "Intent capture",
        status: "executed",
        system: "playground",
        summary: "The playground accepted the shopper-authored intent.",
        payload: { intent },
      },
      {
        id: crypto.randomUUID(),
        name: "Merchant policy gate",
        status: "executed",
        system: "playground",
        summary:
          "Local rules checked spend limit, availability and human-confirmation requirement.",
        payload: { maximumMinorUnits: 50000, humanConfirmationRequired: true },
      },
      {
        id: crypto.randomUUID(),
        name: "Offer discovery",
        status: "executed",
        system: "merchant-catalogue",
        summary: "A deterministic local catalogue search selected the best matching offer.",
        payload: { selectedOffer },
      },
      {
        id: crypto.randomUUID(),
        name: "External agent reasoning",
        status: "simulated",
        system: "agent-provider",
        summary:
          "No OpenAI, Copilot, Google or Adyen Agentic endpoint was called. This exchange is an explicit local fixture.",
        payload: {
          simulated: true,
          provider: null,
          proposedAction: "request_human_confirmation",
        },
      },
      {
        id: crypto.randomUUID(),
        name: "Payment handoff",
        status: "unavailable",
        system: "adyen",
        summary:
          "Agentic payment execution is unavailable. A separate human-confirmed Adyen TEST session can be created.",
        payload: { requiresHumanConfirmation: true, agenticPaymentCalled: false },
      },
    ],
  };
}

export function realAgenticUnavailableReason(): string {
  return [
    "No verified public Adyen Agentic Commerce TEST API contract is available for this playground.",
    "Adyen describes provider support as pilot-phase.",
    "A bearer token alone is not sufficient to infer endpoints or request schemas.",
  ].join(" ");
}
