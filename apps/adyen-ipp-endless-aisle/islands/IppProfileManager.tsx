import { apiFetch } from "@suite/ui/client.ts";
import { Callout, Field, StatusPill } from "@suite/ui/components.tsx";
import { useEffect, useState } from "preact/hooks";

interface Profile {
  id: string;
  label: string;
  isDefault: boolean;
  isConfigured: boolean;
  missingFields: string[];
}

interface Bootstrap {
  profile: Profile;
  profiles: Profile[];
  webhookUrl: string;
}

export default function IppProfileManager() {
  const [bootstrap, setBootstrap] = useState<Bootstrap | null>(null);
  const [values, setValues] = useState({
    label: "",
    apiKey: "",
    merchantAccount: "",
    terminalId: "",
    hmacKey: "",
    webhookBasicAuthUser: "",
    webhookBasicAuthPassword: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    setBootstrap(await apiFetch<Bootstrap>("/api/bootstrap"));
  }
  useEffect(() => {
    load().catch((cause) => setError(cause instanceof Error ? cause.message : "Load failed."));
  }, []);

  function update(key: keyof typeof values, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  async function save(event: Event) {
    event.preventDefault();
    setError(null);
    try {
      const { label, ...secrets } = values;
      await apiFetch("/api/profiles", {
        method: "POST",
        body: JSON.stringify({ label, secrets }),
      });
      setValues({
        label: "",
        apiKey: "",
        merchantAccount: "",
        terminalId: "",
        hmacKey: "",
        webhookBasicAuthUser: "",
        webhookBasicAuthPassword: "",
      });
      setMessage("Encrypted TEST terminal profile saved.");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Save failed.");
    }
  }

  async function select(id: string) {
    await apiFetch("/api/profiles/preferred", {
      method: "POST",
      body: JSON.stringify({ profileId: id }),
    });
    await load();
  }

  return (
    <>
      <Callout title="Webhook endpoint">
        Configure <code>{bootstrap?.webhookUrl ?? "…/webhook"}</code>{" "}
        for Terminal API event notifications. Basic Auth and HMAC are enforced only when configured.
      </Callout>
      {error
        ? (
          <div class="callout callout--danger" role="alert">
            <strong>Error</strong>
            <div>{error}</div>
          </div>
        )
        : null}
      {message
        ? (
          <div class="callout">
            <strong>Saved</strong>
            <div>{message}</div>
          </div>
        )
        : null}
      <div class="settings-layout">
        <section class="panel">
          <h2>Available profiles</h2>
          <div class="profile-list">
            {bootstrap?.profiles.map((profile) => (
              <article class="profile-row">
                <div>
                  <strong>{profile.label}</strong>
                  <p>
                    {profile.isConfigured
                      ? "Merchant and terminal configured"
                      : `Missing: ${profile.missingFields.join(", ")}`}
                  </p>
                </div>
                {bootstrap.profile.id === profile.id
                  ? <StatusPill tone="positive">Preferred</StatusPill>
                  : (
                    <button
                      class="button button--secondary button--small"
                      type="button"
                      onClick={() => select(profile.id)}
                    >
                      Use profile
                    </button>
                  )}
              </article>
            ))}
          </div>
        </section>
        <form class="panel" onSubmit={save}>
          <h2>Add encrypted TEST profile</h2>
          <div class="form-grid">
            {([
              ["label", "Profile label", "text"],
              ["apiKey", "API credential", "password"],
              ["merchantAccount", "Merchant account", "text"],
              ["terminalId", "Terminal ID / POIID", "text"],
              ["hmacKey", "Optional HMAC key", "password"],
              ["webhookBasicAuthUser", "Optional Basic Auth user", "text"],
              ["webhookBasicAuthPassword", "Optional Basic Auth password", "password"],
            ] as const).map(([key, label, type]) => (
              <div class="field field--full">
                <Field label={label} htmlFor={`ipp-${key}`}>
                  <input
                    id={`ipp-${key}`}
                    type={type}
                    required={["label", "apiKey", "merchantAccount", "terminalId"].includes(key)}
                    autocomplete={type === "password" ? "new-password" : "off"}
                    value={values[key]}
                    onInput={(event) => update(key, event.currentTarget.value)}
                  />
                </Field>
              </div>
            ))}
          </div>
          <div class="form-actions">
            <button class="button button--primary" type="submit">Save encrypted profile</button>
          </div>
        </form>
      </div>
    </>
  );
}
