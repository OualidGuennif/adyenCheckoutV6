import type { ProfileSecrets } from "./types.ts";

const LIVE_HOST_PATTERN = /(?:checkout|pal|device-api|terminal-api)-live(?:[.-]|$)/i;

export function assertTestOnly(input: {
  endpoint?: string;
  environment?: string;
  clientKey?: string;
}): void {
  if (input.environment && input.environment.toLowerCase() !== "test") {
    throw new Error("Only the Adyen TEST environment is allowed.");
  }
  if (input.endpoint && LIVE_HOST_PATTERN.test(input.endpoint)) {
    throw new Error("Adyen LIVE endpoints are blocked by this playground.");
  }
  if (input.clientKey?.toLowerCase().startsWith("live_")) {
    throw new Error("A LIVE client key cannot be used in this playground.");
  }
}

export function profileIsTestOnly(secrets: ProfileSecrets): void {
  assertTestOnly({ environment: "test", clientKey: secrets.clientKey });
  for (const value of Object.values(secrets)) {
    if (typeof value === "string" && LIVE_HOST_PATTERN.test(value)) {
      throw new Error("A value that looks like an Adyen LIVE endpoint was rejected.");
    }
  }
}

export function isTestClientKey(value: string | undefined): boolean {
  return Boolean(value && value.startsWith("test_"));
}
