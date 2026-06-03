"use client";

import {
  AlertCircle,
  BadgeCheck,
  Clipboard,
  KeyRound,
  Loader2,
  LockKeyhole,
  LogOut,
  RefreshCw,
  ShieldCheck,
  Trash2,
  UserRound,
} from "lucide-react";
import type { FormEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { accountLoginUrl, apiUrl, readApiError } from "@/lib/api";
import {
  clearAdminSession,
  fetchAdminProfile,
  type AdminProfile,
} from "@/lib/session";
import styles from "./AdminConsole.module.css";

type FlowKeyStatus = "active" | "expired" | "revoked";

type FlowAccessKeySummary = {
  createdAt: string | null;
  createdBy: string | null;
  expiresAt: string | null;
  id: string;
  label: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
  revokedBy: string | null;
  status: FlowKeyStatus;
  updatedAt: string | null;
};

type CreatedFlowKey = {
  accessKey: string;
  expiresAt: string | null;
  keyId: string;
  keyLabel: string;
  status: FlowKeyStatus;
};

type SessionState =
  | { status: "checking" }
  | { profile: AdminProfile; status: "ready" }
  | { status: "signed-out" };

function formatDate(value: string | null) {
  if (!value) return "No expiry";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function AdminConsole() {
  const [session, setSession] = useState<SessionState>({ status: "checking" });
  const [label, setLabel] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [createdKey, setCreatedKey] = useState<CreatedFlowKey | null>(null);
  const [keys, setKeys] = useState<FlowAccessKeySummary[]>([]);
  const [isLoadingKeys, setIsLoadingKeys] = useState(false);
  const [isCreatingKey, setIsCreatingKey] = useState(false);
  const [revokingKeyId, setRevokingKeyId] = useState("");

  const isAdmin = useMemo(
    () =>
      session.status === "ready" &&
      session.profile.roles.some(role => role.toLowerCase() === "admin"),
    [session],
  );

  const loadKeys = useCallback(async () => {
    setError("");
    setIsLoadingKeys(true);

    try {
      const response = await fetch(apiUrl("/flow/admin/access-keys"), {
        cache: "no-store",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(
          await readApiError(response, "Unable to load Flow access keys."),
        );
      }

      const data = (await response.json()) as {
        keys?: FlowAccessKeySummary[];
      };
      setKeys(data.keys || []);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to load Flow access keys.",
      );
    } finally {
      setIsLoadingKeys(false);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    try {
      const profile = await fetchAdminProfile();
      if (!profile) {
        setSession({ status: "signed-out" });
        return null;
      }
      setSession({ profile, status: "ready" });
      return profile;
    } catch {
      setSession({ status: "signed-out" });
      return null;
    }
  }, []);

  useEffect(() => {
    let active = true;

    refreshProfile().then(profile => {
      if (!active) return;
      if (profile?.roles.some(role => role.toLowerCase() === "admin")) {
        void loadKeys();
      }
    });

    return () => {
      active = false;
    };
  }, [loadKeys, refreshProfile]);

  const handleSignIn = () => {
    window.location.assign(accountLoginUrl(window.location.href));
  };

  const handleSignOut = async () => {
    setError("");
    setNotice("");
    await clearAdminSession();
    setSession({ status: "signed-out" });
    setKeys([]);
    setCreatedKey(null);
  };

  const createKey = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setNotice("");
    setCreatedKey(null);
    setIsCreatingKey(true);

    try {
      const response = await fetch(apiUrl("/flow/admin/access-keys"), {
        body: JSON.stringify({
          expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
          label,
        }),
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });

      if (!response.ok) {
        throw new Error(await readApiError(response, "Unable to generate key."));
      }

      const data = (await response.json()) as CreatedFlowKey;
      setCreatedKey(data);
      setLabel("");
      setExpiresAt("");
      setNotice("Flow access key generated.");
      await loadKeys();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to generate key.",
      );
    } finally {
      setIsCreatingKey(false);
    }
  };

  const revokeKey = async (keyId: string) => {
    setError("");
    setNotice("");
    setRevokingKeyId(keyId);

    try {
      const response = await fetch(
        apiUrl(`/flow/admin/access-keys/${keyId}/revoke`),
        {
          credentials: "include",
          method: "POST",
        },
      );

      if (!response.ok) {
        throw new Error(await readApiError(response, "Unable to revoke key."));
      }

      setNotice("Flow access key revoked.");
      await loadKeys();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : "Unable to revoke key.",
      );
    } finally {
      setRevokingKeyId("");
    }
  };

  const copyKey = async () => {
    if (!createdKey) return;
    await navigator.clipboard.writeText(createdKey.accessKey);
    setNotice("Copied Flow key.");
  };

  if (session.status === "checking") {
    return (
      <main className={styles.loginShell}>
        <section className={styles.loginPanel} aria-label="Checking admin session">
          <div className={styles.panelTitle}>
            <span className={styles.brandMark} aria-hidden="true">
              <Loader2 className={styles.spin} size={20} />
            </span>
            <div>
              <h2>Checking admin session</h2>
              <p>CheFu Admin</p>
            </div>
          </div>
        </section>
      </main>
    );
  }

  if (session.status === "signed-out") {
    return (
      <main className={styles.loginShell}>
        <section className={styles.loginPanel} aria-label="Admin sign in required">
          <div className={styles.loginHeader}>
            <span className={styles.brandMark} aria-hidden="true">
              <ShieldCheck size={22} />
            </span>
            <div>
              <span className={styles.eyebrow}>CheFu Admin</span>
              <h1>Admin sign in</h1>
              <p>Continue with a CheFu Account that has the admin role.</p>
            </div>
          </div>

          {error ? (
            <div className={styles.alert}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          ) : null}

          <button className={styles.button} onClick={handleSignIn} type="button">
            <LockKeyhole size={16} />
            Continue with CheFu Account
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className={styles.shell}>
      <header className={styles.topbar}>
        <div className={styles.brand}>
          <span className={styles.brandMark} aria-hidden="true">
            <ShieldCheck size={22} />
          </span>
          <div className={styles.brandText}>
            <strong>CheFu Admin</strong>
            <span>Operations console</span>
          </div>
        </div>

        <div className={styles.session}>
          <div className={styles.sessionUser}>
            <strong>{session.profile.email}</strong>
            <span>{session.profile.roles.join(", ") || "No roles"}</span>
          </div>
          <button className={styles.secondaryButton} onClick={handleSignOut} type="button">
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </header>

      <div className={styles.main}>
        <section className={styles.hero}>
          <span className={styles.eyebrow}>Flow access</span>
          <h1>Generate employee keys for Flow Mail.</h1>
          <p>
            Create a company-issued access key, copy it once, and give it to the
            employee or workspace owner.
          </p>
        </section>

        {!isAdmin ? (
          <div className={styles.alert}>
            <AlertCircle size={18} />
            <span>
              This CheFu Account is signed in, but it does not have the admin role.
            </span>
          </div>
        ) : null}

        {error ? (
          <div className={styles.alert}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        ) : null}

        {notice ? (
          <div className={styles.success}>
            <BadgeCheck size={18} />
            <span>{notice}</span>
          </div>
        ) : null}

        <div className={styles.grid}>
          <section className={styles.panel} aria-label="Generate Flow access key">
            <div className={styles.panelHeader}>
              <div className={styles.panelTitle}>
                <span className={styles.smallMark} aria-hidden="true">
                  <KeyRound size={18} />
                </span>
                <div>
                  <h2>Generate key</h2>
                  <p>Keys are generated by the backend and stored as hashes.</p>
                </div>
              </div>
            </div>

            <form className={styles.form} onSubmit={createKey}>
              <label className={styles.field}>
                <span>Employee or workspace label</span>
                <input
                  disabled={!isAdmin || isCreatingKey}
                  onChange={event => setLabel(event.target.value)}
                  placeholder="Marketing team"
                  value={label}
                />
              </label>

              <label className={styles.field}>
                <span>Expiry</span>
                <input
                  disabled={!isAdmin || isCreatingKey}
                  min={new Date().toISOString().slice(0, 16)}
                  onChange={event => setExpiresAt(event.target.value)}
                  type="datetime-local"
                  value={expiresAt}
                />
              </label>

              <button
                className={styles.button}
                disabled={!isAdmin || isCreatingKey || !label.trim()}
                type="submit"
              >
                {isCreatingKey ? (
                  <Loader2 className={styles.spin} size={16} />
                ) : (
                  <KeyRound size={16} />
                )}
                {isCreatingKey ? "Generating..." : "Generate Flow key"}
              </button>
            </form>

            {createdKey ? (
              <div className={styles.generatedKey}>
                <div className={styles.generatedKeyHeader}>
                  <span>{createdKey.keyLabel}</span>
                  <button className={styles.copyButton} onClick={copyKey} type="button">
                    <Clipboard size={15} />
                    Copy
                  </button>
                </div>
                <code className={styles.keyValue}>{createdKey.accessKey}</code>
                <span className={styles.muted}>
                  Expires: {formatDate(createdKey.expiresAt)}
                </span>
              </div>
            ) : null}
          </section>

          <section className={styles.panel} aria-label="Flow access keys">
            <div className={styles.panelHeader}>
              <div className={styles.panelTitle}>
                <span className={styles.smallMark} aria-hidden="true">
                  <UserRound size={18} />
                </span>
                <div>
                  <h2>Issued keys</h2>
                  <p>Active, expired, and revoked Flow access keys.</p>
                </div>
              </div>
              <button
                className={styles.secondaryButton}
                disabled={!isAdmin || isLoadingKeys}
                onClick={loadKeys}
                type="button"
              >
                <RefreshCw
                  className={isLoadingKeys ? styles.spin : undefined}
                  size={16}
                />
                Refresh
              </button>
            </div>

            <div className={styles.list}>
              {keys.length ? (
                keys.map(key => (
                  <div className={styles.keyRow} key={key.id}>
                    <div className={styles.keyMain}>
                      <div className={styles.keyTitle}>
                        <strong>{key.label}</strong>
                        <span className={`${styles.status} ${styles[key.status]}`}>
                          {key.status}
                        </span>
                      </div>
                      <div className={styles.keyMeta}>
                        <span>ID {key.id}</span>
                        <span>Created {formatDate(key.createdAt)}</span>
                        <span>Last used {formatDate(key.lastUsedAt)}</span>
                        <span>Expires {formatDate(key.expiresAt)}</span>
                      </div>
                    </div>

                    <button
                      className={styles.dangerButton}
                      disabled={
                        !isAdmin ||
                        key.status !== "active" ||
                        revokingKeyId === key.id
                      }
                      onClick={() => revokeKey(key.id)}
                      type="button"
                    >
                      {revokingKeyId === key.id ? (
                        <Loader2 className={styles.spin} size={16} />
                      ) : (
                        <Trash2 size={16} />
                      )}
                      Revoke
                    </button>
                  </div>
                ))
              ) : (
                <div className={styles.empty}>
                  <div>
                    <KeyRound size={22} />
                    <p>{isLoadingKeys ? "Loading keys..." : "No Flow keys yet."}</p>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
