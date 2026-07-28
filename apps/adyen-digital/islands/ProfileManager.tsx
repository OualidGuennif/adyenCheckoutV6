import { apiFetch } from "@suite/ui/client.ts";
import { Callout, Field, StatusPill } from "@suite/ui/components.tsx";
import { useEffect, useState } from "preact/hooks";

interface Profile {
  id: string;
  label: string;
  isDefault: boolean;
  isConfigured: boolean;
  missingFields: string[];
  updatedAt: string;
}

interface Bootstrap {
  profile: Profile;
  profiles: Profile[];
  webhookUrl: string;
}

export default function ProfileManager() {
  const [bootstrap, setBootstrap] = useState<Bootstrap | null>(null);
  const [label, setLabel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [merchantAccount, setMerchantAccount] = useState("");
  const [clientKey, setClientKey] = useState("");
  const [hmacKey, setHmacKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setBootstrap(await apiFetch<Bootstrap>("/api/bootstrap"));
  }

  useEffect(() => {
    load().catch((cause) => setError(cause instanceof Error ? cause.message : "Load failed."));
  }, []);

  async function save(event: Event) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await apiFetch("/api/profiles", {
        method: "POST",
        body: JSON.stringify({
          label,
          secrets: { apiKey, merchantAccount, clientKey, hmacKey },
        }),
      });
      setLabel("");
      setApiKey("");
      setMerchantAccount("");
      setClientKey("");
      setHmacKey("");
      setMessage("Profile encrypted and stored on the server.");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function select(id: string) {
    await apiFetch("/api/profiles/preferred", {
      method: "POST",
      body: JSON.stringify({ profileId: id }),
    });
    await load();
  }

  async function remove(id: string) {
    await apiFetch(`/api/profiles/${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <>
      <Callout title="Secret handling">
        The API key and HMAC key are never included in bootstrap, logs or profile responses. The
        Adyen TEST client key is publishable and is sent only to initialize Adyen Web; it is never
        printed in this interface.
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
          <div class="panel__header">
            <div>
              <h2>Available TEST profiles</h2>
              <p>The preferred profile id is remembered in a signed HttpOnly cookie.</p>
            </div>
          </div>
          <div class="profile-list">
            {bootstrap?.profiles.map((profile) => (
              <article class="profile-row">
                <div>
                  <strong>{profile.label}</strong>{" "}
                  {profile.isDefault ? <StatusPill>Environment</StatusPill> : null}
                  <p>
                    {profile.isConfigured
                      ? "Configured for Adyen TEST"
                      : `Missing: ${profile.missingFields.join(", ")}`}
                  </p>
                </div>
                <div class="form-actions">
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
                  {!profile.isDefault
                    ? (
                      <button
                        class="button button--danger button--small"
                        type="button"
                        onClick={() => remove(profile.id)}
                      >
                        Delete
                      </button>
                    )
                    : null}
                </div>
              </article>
            ))}
          </div>
        </section>
        <form class="panel" onSubmit={save}>
          <div class="panel__header">
            <div>
              <h2>Add a server-side profile</h2>
              <p>TEST values only. LIVE-prefixed client keys and LIVE endpoints are rejected.</p>
            </div>
          </div>
          <div class="form-grid">
            <div class="field field--full">
              <Field label="Profile label" htmlFor="profile-label">
                <input
                  id="profile-label"
                  required
                  minlength={2}
                  value={label}
                  onInput={(event) => setLabel(event.currentTarget.value)}
                />
              </Field>
            </div>
            <div class="field field--full">
              <Field label="Adyen TEST API key" htmlFor="api-key">
                <input
                  id="api-key"
                  type="password"
                  required
                  autocomplete="new-password"
                  value={apiKey}
                  onInput={(event) => setApiKey(event.currentTarget.value)}
                />
              </Field>
            </div>
            <div class="field field--full">
              <Field label="Merchant account" htmlFor="merchant-account">
                <input
                  id="merchant-account"
                  required
                  autocomplete="off"
                  value={merchantAccount}
                  onInput={(event) => setMerchantAccount(event.currentTarget.value)}
                />
              </Field>
            </div>
            <div class="field field--full">
              <Field label="TEST client key" htmlFor="client-key" hint="Must start with test_">
                <input
                  id="client-key"
                  type="password"
                  required
                  autocomplete="new-password"
                  value={clientKey}
                  onInput={(event) => setClientKey(event.currentTarget.value)}
                />
              </Field>
            </div>
            <div class="field field--full">
              <Field label="Standard webhook HMAC key" htmlFor="hmac-key">
                <input
                  id="hmac-key"
                  type="password"
                  autocomplete="new-password"
                  value={hmacKey}
                  onInput={(event) => setHmacKey(event.currentTarget.value)}
                />
              </Field>
            </div>
          </div>
          <div class="form-actions">
            <button class="button button--primary" type="submit" disabled={saving}>
              {saving ? "Encrypting…" : "Save encrypted profile"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
