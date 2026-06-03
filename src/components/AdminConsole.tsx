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
  XCircle,
} from "lucide-react";
import type { FormEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { accountLoginUrl, accountLogoutUrl, apiUrl, readApiError } from "@/lib/api";
import { fetchAdminProfile, type AdminProfile } from "@/lib/session";
import styles from "./AdminConsole.module.css";

type AppTool = {
  id: string;
  label: string;
  status: "active" | "planned" | "protected";
};

type AdminApp = {
  id: "academy" | "admin" | "flow" | "muzalo" | "quantum";
  name: string;
  origins: string[];
  tools?: AppTool[];
};

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

type ArtistRequestStatus = "all" | "approved" | "pending" | "rejected";

type MuzaloArtistRequest = {
  artistName: string;
  email: string;
  message: string;
  primaryGenre: string;
  requestedAt: string | null;
  requestId: string;
  reviewNote: string;
  reviewedAt: string | null;
  reviewedBy: string;
  spotifyUrl: string;
  status: Exclude<ArtistRequestStatus, "all">;
  uid: string;
  updatedAt: string | null;
  websiteUrl: string;
};

type SessionState =
  | { status: "checking" }
  | { profile: AdminProfile; status: "ready" }
  | { status: "signed-out" };

const fallbackApps: AdminApp[] = [
  {
    id: "flow",
    name: "Flow Mail",
    origins: ["https://flow.chefuinc.com"],
    tools: [{ id: "flow-access-keys", label: "Employee access keys", status: "active" }],
  },
  {
    id: "muzalo",
    name: "Muzalo",
    origins: ["https://muzalo.chefuinc.com"],
    tools: [
      { id: "muzalo-artist-requests", label: "Artist profile requests", status: "active" },
    ],
  },
];

function hasAdminRole(roles: string[]) {
  return roles.some(role => role.trim().toLowerCase() === "admin");
}

function formatDate(value: string | null, fallback = "Not set") {
  if (!value) return fallback;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function appInitial(name: string) {
  return name
    .split(/\s+/)
    .map(part => part.slice(0, 1))
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function statusClass(status: string) {
  if (status === "approved" || status === "active") return styles.active;
  if (status === "rejected" || status === "revoked") return styles.revoked;
  return styles.expired;
}

export function AdminConsole() {
  const [session, setSession] = useState<SessionState>({ status: "checking" });
  const [activeAppId, setActiveAppId] = useState<AdminApp["id"]>("flow");
  const [apps, setApps] = useState<AdminApp[]>([]);
  const [label, setLabel] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [createdKey, setCreatedKey] = useState<CreatedFlowKey | null>(null);
  const [keys, setKeys] = useState<FlowAccessKeySummary[]>([]);
  const [isLoadingApps, setIsLoadingApps] = useState(false);
  const [isLoadingKeys, setIsLoadingKeys] = useState(false);
  const [isCreatingKey, setIsCreatingKey] = useState(false);
  const [revokingKeyId, setRevokingKeyId] = useState("");
  const [artistRequests, setArtistRequests] = useState<MuzaloArtistRequest[]>([]);
  const [artistStatus, setArtistStatus] = useState<ArtistRequestStatus>("pending");
  const [isLoadingArtistRequests, setIsLoadingArtistRequests] = useState(false);
  const [reviewingRequest, setReviewingRequest] = useState("");
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});

  const isAdmin = session.status === "ready";
  const visibleApps = apps.length ? apps : fallbackApps;
  const activeApp = useMemo(
    () => visibleApps.find(app => app.id === activeAppId) || visibleApps[0],
    [activeAppId, visibleApps],
  );

  const loadApps = useCallback(async () => {
    setIsLoadingApps(true);

    try {
      const response = await fetch(apiUrl("/admin/apps"), {
        cache: "no-store",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(await readApiError(response, "Unable to load apps."));
      }

      const data = (await response.json()) as { apps?: AdminApp[] };
      setApps(data.apps || []);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : "Unable to load apps.",
      );
    } finally {
      setIsLoadingApps(false);
    }
  }, []);

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

  const loadArtistRequests = useCallback(
    async (status: ArtistRequestStatus = artistStatus) => {
      setError("");
      setIsLoadingArtistRequests(true);

      try {
        const response = await fetch(
          apiUrl(`/admin/apps/muzalo/artist-requests?status=${status}`),
          {
            cache: "no-store",
            credentials: "include",
          },
        );

        if (!response.ok) {
          throw new Error(
            await readApiError(response, "Unable to load Muzalo artist requests."),
          );
        }

        const data = (await response.json()) as {
          requests?: MuzaloArtistRequest[];
        };
        setArtistRequests(data.requests || []);
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to load Muzalo artist requests.",
        );
      } finally {
        setIsLoadingArtistRequests(false);
      }
    },
    [artistStatus],
  );

  const refreshProfile = useCallback(async () => {
    try {
      const profile = await fetchAdminProfile();
      if (!profile) {
        setSession({ status: "signed-out" });
        return null;
      }

      if (!hasAdminRole(profile.roles)) {
        setSession({ status: "signed-out" });
        setKeys([]);
        setCreatedKey(null);
        window.location.assign(accountLogoutUrl(window.location.origin));
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

    // This effect synchronizes the UI with the backend session cookie.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshProfile().then(profile => {
      if (!active || !profile) return;
      void loadApps();
    });

    return () => {
      active = false;
    };
  }, [loadApps, refreshProfile]);

  useEffect(() => {
    if (!isAdmin) return;
    let active = true;

    queueMicrotask(() => {
      if (!active) return;
      if (activeAppId === "flow") void loadKeys();
      if (activeAppId === "muzalo") void loadArtistRequests();
    });

    return () => {
      active = false;
    };
  }, [activeAppId, isAdmin, loadArtistRequests, loadKeys]);

  const handleSignIn = () => {
    window.location.assign(accountLoginUrl(window.location.href));
  };

  const handleSignOut = () => {
    setError("");
    setNotice("");
    setSession({ status: "signed-out" });
    setKeys([]);
    setCreatedKey(null);
    window.location.assign(accountLogoutUrl(window.location.origin));
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

  const reviewArtistRequest = async (
    request: MuzaloArtistRequest,
    status: "approved" | "rejected",
  ) => {
    setError("");
    setNotice("");
    setReviewingRequest(`${request.email}:${status}`);

    try {
      const response = await fetch(
        apiUrl(
          `/admin/apps/muzalo/artist-requests/${encodeURIComponent(request.email)}`,
        ),
        {
          body: JSON.stringify({
            reviewNote: reviewNotes[request.email] || "",
            status,
          }),
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          method: "PATCH",
        },
      );

      if (!response.ok) {
        throw new Error(await readApiError(response, "Unable to review request."));
      }

      setNotice(
        status === "approved"
          ? "Muzalo artist profile approved."
          : "Muzalo artist request rejected.",
      );
      setReviewNotes(current => {
        const next = { ...current };
        delete next[request.email];
        return next;
      });
      await loadArtistRequests();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to review request.",
      );
    } finally {
      setReviewingRequest("");
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
            <span>Internal operations</span>
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
          <span className={styles.eyebrow}>Apps</span>
          <h1>Manage CheFu apps from one quiet console.</h1>
          <p>
            Pick an app, review its active tools, and keep operational actions
            focused in one place.
          </p>
        </section>

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

        <div className={styles.workspace}>
          <aside className={styles.appRail} aria-label="Apps">
            <div className={styles.panelHeader}>
              <div className={styles.panelTitle}>
                <span className={styles.smallMark} aria-hidden="true">
                  <UserRound size={18} />
                </span>
                <div>
                  <h2>Apps</h2>
                  <p>{isLoadingApps ? "Loading registry..." : "Registered surfaces"}</p>
                </div>
              </div>
              <button
                aria-label="Refresh apps"
                className={styles.iconButton}
                disabled={isLoadingApps}
                onClick={loadApps}
                type="button"
              >
                <RefreshCw
                  className={isLoadingApps ? styles.spin : undefined}
                  size={16}
                />
              </button>
            </div>

            <div className={styles.appList}>
              {visibleApps.map(app => {
                const activeTools = (app.tools || []).filter(
                  tool => tool.status === "active" || tool.status === "protected",
                );

                return (
                  <button
                    className={`${styles.appButton} ${
                      app.id === activeAppId ? styles.appButtonActive : ""
                    }`}
                    key={app.id}
                    onClick={() => setActiveAppId(app.id)}
                    type="button"
                  >
                    <span className={styles.appInitial} aria-hidden="true">
                      {appInitial(app.name)}
                    </span>
                    <span className={styles.appButtonText}>
                      <strong>{app.name}</strong>
                      <span>
                        {activeTools[0]?.label || "No active admin tools yet"}
                      </span>
                    </span>
                    <span className={styles.toolCount}>{activeTools.length}</span>
                  </button>
                );
              })}
            </div>
          </aside>

          <section className={styles.appWorkspace} aria-label="Selected app tools">
            <div className={styles.appHeader}>
              <div>
                <span className={styles.eyebrow}>{activeApp?.id}</span>
                <h2>{activeApp?.name || "App"}</h2>
              </div>
              <div className={styles.originList}>
                {(activeApp?.origins || []).slice(0, 3).map(origin => (
                  <span key={origin}>{origin.replace(/^https?:\/\//, "")}</span>
                ))}
              </div>
            </div>

            {activeAppId === "flow" ? renderFlowTools() : null}
            {activeAppId === "muzalo" ? renderMuzaloTools() : null}
            {activeAppId !== "flow" && activeAppId !== "muzalo"
              ? renderPlannedTools()
              : null}
          </section>
        </div>
      </div>
    </main>
  );

  function renderFlowTools() {
    return (
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
                Expires: {formatDate(createdKey.expiresAt, "No expiry")}
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
                      <span className={`${styles.status} ${statusClass(key.status)}`}>
                        {key.status}
                      </span>
                    </div>
                    <div className={styles.keyMeta}>
                      <span>ID {key.id}</span>
                      <span>Created {formatDate(key.createdAt)}</span>
                      <span>Last used {formatDate(key.lastUsedAt, "Never")}</span>
                      <span>Expires {formatDate(key.expiresAt, "No expiry")}</span>
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
    );
  }

  function renderMuzaloTools() {
    const statuses: ArtistRequestStatus[] = [
      "pending",
      "approved",
      "rejected",
      "all",
    ];

    return (
      <section className={styles.panel} aria-label="Muzalo artist requests">
        <div className={styles.panelHeader}>
          <div className={styles.panelTitle}>
            <span className={styles.smallMark} aria-hidden="true">
              <UserRound size={18} />
            </span>
            <div>
              <h2>Artist profile requests</h2>
              <p>Approve verified artists or send requests back for updates.</p>
            </div>
          </div>

          <div className={styles.panelActions}>
            <div className={styles.segmented} aria-label="Artist request status">
              {statuses.map(status => (
                <button
                  className={artistStatus === status ? styles.segmentActive : ""}
                  key={status}
                  onClick={() => {
                    setArtistStatus(status);
                    void loadArtistRequests(status);
                  }}
                  type="button"
                >
                  {status}
                </button>
              ))}
            </div>

            <button
              className={styles.secondaryButton}
              disabled={!isAdmin || isLoadingArtistRequests}
              onClick={() => loadArtistRequests()}
              type="button"
            >
              <RefreshCw
                className={isLoadingArtistRequests ? styles.spin : undefined}
                size={16}
              />
              Refresh
            </button>
          </div>
        </div>

        <div className={styles.requestList}>
          {artistRequests.length ? (
            artistRequests.map(request => (
              <article className={styles.requestRow} key={request.email}>
                <div className={styles.requestAvatar} aria-hidden="true">
                  {(request.artistName || request.email).slice(0, 1).toUpperCase()}
                </div>

                <div className={styles.requestMain}>
                  <div className={styles.requestHeader}>
                    <div>
                      <strong>{request.artistName || "Unnamed artist"}</strong>
                      <span>{request.email}</span>
                    </div>
                    <span className={`${styles.status} ${statusClass(request.status)}`}>
                      {request.status}
                    </span>
                  </div>

                  <div className={styles.keyMeta}>
                    <span>{request.primaryGenre || "No genre"}</span>
                    <span>
                      Requested {formatDate(request.requestedAt, "date unknown")}
                    </span>
                    {request.reviewedAt ? (
                      <span>Reviewed {formatDate(request.reviewedAt)}</span>
                    ) : null}
                  </div>

                  {request.message ? (
                    <p className={styles.requestMessage}>{request.message}</p>
                  ) : null}

                  <div className={styles.requestLinks}>
                    {request.spotifyUrl ? (
                      <a href={request.spotifyUrl} rel="noreferrer" target="_blank">
                        Spotify
                      </a>
                    ) : null}
                    {request.websiteUrl ? (
                      <a href={request.websiteUrl} rel="noreferrer" target="_blank">
                        Website
                      </a>
                    ) : null}
                  </div>

                  <label className={styles.compactField}>
                    <span>Review note</span>
                    <textarea
                      disabled={Boolean(reviewingRequest)}
                      onChange={event =>
                        setReviewNotes(current => ({
                          ...current,
                          [request.email]: event.target.value,
                        }))
                      }
                      placeholder={
                        request.reviewNote || "Optional note for the account owner"
                      }
                      value={reviewNotes[request.email] || ""}
                    />
                  </label>
                </div>

                <div className={styles.requestActions}>
                  <button
                    className={styles.button}
                    disabled={
                      request.status === "approved" ||
                      reviewingRequest === `${request.email}:approved`
                    }
                    onClick={() => reviewArtistRequest(request, "approved")}
                    type="button"
                  >
                    {reviewingRequest === `${request.email}:approved` ? (
                      <Loader2 className={styles.spin} size={16} />
                    ) : (
                      <BadgeCheck size={16} />
                    )}
                    Approve
                  </button>
                  <button
                    className={styles.dangerButton}
                    disabled={
                      request.status === "rejected" ||
                      reviewingRequest === `${request.email}:rejected`
                    }
                    onClick={() => reviewArtistRequest(request, "rejected")}
                    type="button"
                  >
                    {reviewingRequest === `${request.email}:rejected` ? (
                      <Loader2 className={styles.spin} size={16} />
                    ) : (
                      <XCircle size={16} />
                    )}
                    Reject
                  </button>
                </div>
              </article>
            ))
          ) : (
            <div className={styles.empty}>
              <div>
                <UserRound size={22} />
                <p>
                  {isLoadingArtistRequests
                    ? "Loading artist requests..."
                    : "No artist requests in this view."}
                </p>
              </div>
            </div>
          )}
        </div>
      </section>
    );
  }

  function renderPlannedTools() {
    return (
      <section className={styles.empty}>
        <div>
          <ShieldCheck size={24} />
          <p>Admin tools for this app are not enabled yet.</p>
        </div>
      </section>
    );
  }
}
