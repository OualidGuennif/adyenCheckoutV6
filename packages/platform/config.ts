import { parse } from "@std/dotenv";
import { isAbsolute, join, resolve } from "@std/path";
import type { AppId, ProfileSecrets, PublicProfile } from "./types.ts";
import { isTestClientKey, profileIsTestOnly } from "./test-only.ts";

export interface ServerConfig {
  appId: AppId;
  port: number;
  publicOrigin: string;
  databasePath: string;
  signingSecret: string;
  defaultProfile: PublicProfile;
  defaultSecrets: ProfileSecrets;
  agenticRealEnabled: boolean;
}

function parseExportEnv(text: string): Record<string, string> {
  return parse(
    text.split("\n").map((line) => line.replace(/^\s*export\s+/, "")).join("\n"),
  );
}

function readEnvFile(path: string): Record<string, string> {
  try {
    return parseExportEnv(Deno.readTextFileSync(path));
  } catch {
    return {};
  }
}

function environmentWithLocalFallback(): Record<string, string> {
  const values = Deno.env.toObject();
  const explicitLegacy = values.LEGACY_ENV_PATH;
  const candidates = [
    explicitLegacy,
    join(Deno.cwd(), ".env"),
    join(Deno.cwd(), "..", ".env"),
    join(Deno.cwd(), "..", "checkoutPlayground copie", ".env"),
    join(Deno.cwd(), "..", "..", "..", "checkoutPlayground copie", ".env"),
    join(Deno.cwd(), "checkoutPlayground copie", ".env"),
  ].filter((candidate): candidate is string => Boolean(candidate));

  for (const candidate of candidates) {
    const absolute = isAbsolute(candidate) ? candidate : resolve(candidate);
    const fileValues = readEnvFile(absolute);
    for (const [key, value] of Object.entries(fileValues)) {
      if (!values[key]) values[key] = value;
    }
  }
  return values;
}

function secretsFrom(values: Record<string, string>, appId: AppId): ProfileSecrets {
  return {
    apiKey: appId === "ipp"
      ? values.ADYEN_DEVICE_API_KEY ?? values.ADYEN_API_KEY
      : values.ADYEN_API_KEY,
    merchantAccount: appId === "ipp"
      ? values.ADYEN_MERCHANT_ACCOUNT_POS ?? values.ADYEN_MERCHANT_ACCOUNT
      : values.ADYEN_MERCHANT_ACCOUNT,
    clientKey: values.ADYEN_CLIENT_KEY,
    hmacKey: values.ADYEN_HMAC_KEY ?? values.HMAC_KEY,
    terminalId: values.ADYEN_TERMINAL_ID ?? values.TERMINAL_ID ?? values.OMNI_TERMINAL_ID,
    webhookBasicAuthUser: values.WEBHOOK_BASIC_AUTH_USER,
    webhookBasicAuthPassword: values.WEBHOOK_BASIC_AUTH_PASSWORD,
    agenticBearerToken: values.ADYEN_AGENTIC_BEARER_TOKEN ??
      values.AGENTIC_AGENT_BEARER_TOKEN,
  };
}

function requirements(appId: AppId): Array<keyof ProfileSecrets> {
  if (appId === "ipp") return ["apiKey", "merchantAccount", "terminalId"];
  if (appId === "agentic") return ["apiKey", "merchantAccount"];
  if (appId === "styling") return ["apiKey", "merchantAccount", "clientKey"];
  return ["apiKey", "merchantAccount", "clientKey"];
}

export function loadServerConfig(appId: AppId): ServerConfig {
  const values = environmentWithLocalFallback();
  const secrets = secretsFrom(values, appId);
  profileIsTestOnly(secrets);
  const missingFields = requirements(appId).filter((field) => !secrets[field]);
  if (secrets.clientKey && !isTestClientKey(secrets.clientKey)) {
    missingFields.push("clientKey");
  }
  const port = Number(values.PORT || 8000);
  const publicOrigin = values.PUBLIC_ORIGIN || `http://localhost:${port}`;
  const defaultDb = join(Deno.cwd(), "data", `${appId}.sqlite`);

  return {
    appId,
    port,
    publicOrigin,
    databasePath: values.DATABASE_PATH || defaultDb,
    signingSecret: values.SESSION_SIGNING_SECRET ||
      `ephemeral-${appId}-${crypto.randomUUID()}`,
    defaultProfile: {
      id: "default",
      label: "Default TEST profile",
      appId,
      isDefault: true,
      isConfigured: missingFields.length === 0,
      missingFields,
      merchantAccount: secrets.merchantAccount,
      capabilities: appId === "agentic"
        ? [
          "mock-ready",
          secrets.agenticBearerToken ? "real-token-configured" : "real-token-unavailable",
        ]
        : ["adyen-test"],
      updatedAt: new Date().toISOString(),
    },
    defaultSecrets: secrets,
    agenticRealEnabled: values.AGENTIC_REAL_ENABLED === "true" &&
      Boolean(secrets.agenticBearerToken),
  };
}
