import type { ProfileSecrets } from "./types.ts";
import { assertTestOnly, profileIsTestOnly } from "./test-only.ts";

type Payload = Record<string, unknown>;
type HttpMethod = "GET" | "POST";
type FetchLike = typeof fetch;

const CHECKOUT_BASE_URL = "https://checkout-test.adyen.com/v72";
const DEVICE_BASE_URL = "https://device-api-test.adyen.com/v1";

export class AdyenRequestError extends Error {
  readonly statusCode: number;
  readonly errorCode?: string;

  constructor(message: string, statusCode: number, errorCode?: string) {
    super(message);
    this.name = "AdyenRequestError";
    this.statusCode = statusCode;
    this.errorCode = errorCode;
  }
}

function responseObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

async function parseResponse(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function adyenRequest(input: {
  apiKey: string;
  endpoint: string;
  method?: HttpMethod;
  payload?: Payload;
  idempotencyKey?: string;
  timeoutMs?: number;
  fetchImpl: FetchLike;
}): Promise<unknown> {
  assertTestOnly({ endpoint: input.endpoint });
  const headers = new Headers({
    Accept: "application/json",
    "Content-Type": "application/json",
    "X-API-Key": input.apiKey,
  });
  if (input.idempotencyKey) headers.set("Idempotency-Key", input.idempotencyKey);

  let response: Response;
  try {
    response = await input.fetchImpl(input.endpoint, {
      method: input.method ?? "POST",
      headers,
      body: input.payload === undefined ? undefined : JSON.stringify(input.payload),
      signal: AbortSignal.timeout(input.timeoutMs ?? 45_000),
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "unknown network error";
    throw new AdyenRequestError(`Adyen TEST connection failed: ${detail}`, 502);
  }

  const result = await parseResponse(response);
  if (!response.ok) {
    const candidate = responseObject(result);
    const errorCode = typeof candidate.errorCode === "string" ? candidate.errorCode : undefined;
    const message = typeof candidate.message === "string"
      ? candidate.message
      : `Adyen TEST returned HTTP ${response.status}.`;
    throw new AdyenRequestError(message, response.status, errorCode);
  }
  return result;
}

export class AdyenTestClient {
  readonly #secrets: ProfileSecrets;
  readonly #fetch: FetchLike;

  constructor(secrets: ProfileSecrets, fetchImpl: FetchLike = fetch) {
    profileIsTestOnly(secrets);
    if (!secrets.apiKey) throw new Error("The selected profile has no Adyen TEST API key.");
    this.#secrets = secrets;
    this.#fetch = fetchImpl;
  }

  async sessions(payload: Payload, idempotencyKey: string): Promise<unknown> {
    return await adyenRequest({
      apiKey: this.#secrets.apiKey!,
      endpoint: `${CHECKOUT_BASE_URL}/sessions`,
      payload,
      idempotencyKey,
      fetchImpl: this.#fetch,
    });
  }

  async paymentMethods(payload: Payload): Promise<unknown> {
    return await adyenRequest({
      apiKey: this.#secrets.apiKey!,
      endpoint: `${CHECKOUT_BASE_URL}/paymentMethods`,
      payload,
      fetchImpl: this.#fetch,
    });
  }

  async payments(payload: Payload, idempotencyKey: string): Promise<unknown> {
    return await adyenRequest({
      apiKey: this.#secrets.apiKey!,
      endpoint: `${CHECKOUT_BASE_URL}/payments`,
      payload,
      idempotencyKey,
      fetchImpl: this.#fetch,
    });
  }

  async paymentDetails(payload: Payload, idempotencyKey: string): Promise<unknown> {
    return await adyenRequest({
      apiKey: this.#secrets.apiKey!,
      endpoint: `${CHECKOUT_BASE_URL}/payments/details`,
      payload,
      idempotencyKey,
      fetchImpl: this.#fetch,
    });
  }

  async createPaymentLink(payload: Payload, idempotencyKey: string): Promise<unknown> {
    return await adyenRequest({
      apiKey: this.#secrets.apiKey!,
      endpoint: `${CHECKOUT_BASE_URL}/paymentLinks`,
      payload,
      idempotencyKey,
      fetchImpl: this.#fetch,
    });
  }

  async getPaymentLink(linkId: string): Promise<unknown> {
    return await adyenRequest({
      apiKey: this.#secrets.apiKey!,
      endpoint: `${CHECKOUT_BASE_URL}/paymentLinks/${encodeURIComponent(linkId)}`,
      method: "GET",
      fetchImpl: this.#fetch,
    });
  }

  async createOrder(payload: Payload, idempotencyKey: string): Promise<unknown> {
    return await adyenRequest({
      apiKey: this.#secrets.apiKey!,
      endpoint: `${CHECKOUT_BASE_URL}/orders`,
      payload,
      idempotencyKey,
      fetchImpl: this.#fetch,
    });
  }

  async cancelOrder(payload: Payload, idempotencyKey: string): Promise<unknown> {
    return await adyenRequest({
      apiKey: this.#secrets.apiKey!,
      endpoint: `${CHECKOUT_BASE_URL}/orders/cancel`,
      payload,
      idempotencyKey,
      fetchImpl: this.#fetch,
    });
  }

  async capture(pspReference: string, payload: Payload, idempotencyKey: string): Promise<unknown> {
    return await adyenRequest({
      apiKey: this.#secrets.apiKey!,
      endpoint: `${CHECKOUT_BASE_URL}/payments/${encodeURIComponent(pspReference)}/captures`,
      payload,
      idempotencyKey,
      fetchImpl: this.#fetch,
    });
  }

  async cancel(pspReference: string, payload: Payload, idempotencyKey: string): Promise<unknown> {
    return await adyenRequest({
      apiKey: this.#secrets.apiKey!,
      endpoint: `${CHECKOUT_BASE_URL}/payments/${encodeURIComponent(pspReference)}/cancels`,
      payload,
      idempotencyKey,
      fetchImpl: this.#fetch,
    });
  }

  async refund(pspReference: string, payload: Payload, idempotencyKey: string): Promise<unknown> {
    return await adyenRequest({
      apiKey: this.#secrets.apiKey!,
      endpoint: `${CHECKOUT_BASE_URL}/payments/${encodeURIComponent(pspReference)}/refunds`,
      payload,
      idempotencyKey,
      fetchImpl: this.#fetch,
    });
  }

  async terminalSync(payload: Payload): Promise<unknown> {
    if (!this.#secrets.merchantAccount || !this.#secrets.terminalId) {
      throw new Error("The selected TEST profile requires merchantAccount and terminalId.");
    }
    return await adyenRequest({
      apiKey: this.#secrets.apiKey!,
      endpoint: `${DEVICE_BASE_URL}/merchants/${
        encodeURIComponent(this.#secrets.merchantAccount)
      }/devices/${encodeURIComponent(this.#secrets.terminalId)}/sync`,
      payload,
      timeoutMs: 120_000,
      fetchImpl: this.#fetch,
    });
  }

  async connectedDevices(): Promise<unknown> {
    if (!this.#secrets.merchantAccount) throw new Error("merchantAccount is required.");
    return await adyenRequest({
      apiKey: this.#secrets.apiKey!,
      endpoint: `${DEVICE_BASE_URL}/merchants/${
        encodeURIComponent(this.#secrets.merchantAccount)
      }/connectedDevices`,
      method: "GET",
      fetchImpl: this.#fetch,
    });
  }
}
