import { apiFetch } from "@suite/ui/client.ts";
import { Callout, Field, StatusPill } from "@suite/ui/components.tsx";
import { useEffect, useState } from "preact/hooks";

interface Profile {
  id: string;
  label: string;
  isDefault: boolean;
  isConfigured: boolean;
  missingFields: string[];
  capabilities: string[];
}

interface Bootstrap {
  profile: Profile;
  profiles: Profile[];
}

export default function AgenticProfileManager() {
  const [bootstrap, setBootstrap] = useState<Bootstrap | null>(null);
  const [values, setValues] = useState({
    label: "",
    apiKey: "",
    merchantAccount: "",
    clientKey: "",
    hmacKey: "",
    agenticBearerToken: "",
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
        clientKey: "",
        hmacKey: "",
        agenticBearerToken: "",
      });
      setMessage("Profile encrypted. No agentic endpoint was called.");
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
      <Callout title="Bearer token boundary" tone="warning">
        The optional field prepares a future server adapter. The current app will not infer or call
        an undocumented Agentic Commerce endpoint, even when a token is present.
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
          <h2>Profiles</h2>
          <div class="profile-list">
            {bootstrap?.profiles.map((profile) => (
              <article class="profile-row">
                <div>
                  <strong>{profile.label}</strong>
                  <p>{profile.capabilities.join(" · ")}</p>
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
          <h2>Add encrypted profile</h2>
          <div class="form-grid">
            {([
              ["label", "Profile label", "text", true],
              ["apiKey", "Adyen TEST API key", "password", true],
              ["merchantAccount", "Merchant account", "text", true],
              ["clientKey", "Adyen TEST client key", "password", true],
              ["hmacKey", "Webhook HMAC key", "password", false],
              ["agenticBearerToken", "Future pilot bearer token", "password", false],
            ] as const).map(([key, label, type, required]) => (
              <div class="field field--full">
                <Field label={label} htmlFor={`agentic-${key}`}>
                  <input
                    id={`agentic-${key}`}
                    type={type}
                    required={required}
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
