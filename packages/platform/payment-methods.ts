import { PAYMENT_METHOD_CAPABILITIES } from "./lifecycle.ts";

/**
 * Merchant-editable TEST-playground defaults.
 *
 * Keep payment method policy here instead of scattering capability checks
 * through UI or webhook code. Validate changes against current Adyen docs.
 */
export const PAYMENT_METHOD_RULES = {
  defaultCaptureMode: "automatic",
  payByLinkValidityHours: 24,
  maximumPayByLinkValidityDays: 70,
  partialOrderValidityHours: 24,
  methods: PAYMENT_METHOD_CAPABILITIES,
} as const;
