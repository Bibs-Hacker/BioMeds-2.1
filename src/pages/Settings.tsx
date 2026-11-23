import { useState } from "react";
import { useAppearance, themes, fonts } from "../contexts/AppearanceContext";
import { useAuth } from "../contexts/AuthContext";
import { supabase, rows, rpc } from "../services/supabase";
import {
  PageTitle,
  useToast,
  Confirm,
  useData,
  ErrorBox,
  Badge,
  Empty,
} from "../components/common";
import { AccountSecurity } from "./Auth";
import { Link } from "react-router-dom";
export type DeletionRequest = {
  id: string;
  user_id: string;
  reason: string;
  status: string;
  review_note: string | null;
  created_at: string;
};
export function SettingsPage() {
  const appearance = useAppearance();
  const { preferences, update } = appearance;
  const auth = useAuth();
  const toast = useToast();
  const [logout, setLogout] = useState<"local" | "global" | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [phrase, setPhrase] = useState("");
  const [password, setPassword] = useState("");
  const [reason, setReason] = useState("");
  const [ack, setAck] = useState(false);
  const [busy, setBusy] = useState(false);
  const requests = useData(async () => {
    const list = await rows<DeletionRequest>("account_deletion_requests");
    return list.filter((x) => x.user_id === auth.session?.user.id);
  }, ["account_deletion_requests"]);
  return (
    <>
      <PageTitle
        title="Settings & preferences"
        description="Make the portal comfortable on any gadget. Appearance preferences stay on this browser."
      />
      <section className="panel form-grid two-col">
        <label>
          Theme
          <select
            aria-label="Theme"
            value={preferences.theme}
            onChange={(e) =>
              update({ theme: e.target.value as keyof typeof themes })
            }
          >
            {Object.entries(themes).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label>
          Font choice
          <select
            aria-label="Font choice"
            value={preferences.font}
            onChange={(e) =>
              update({ font: e.target.value as keyof typeof fonts })
            }
          >
            {Object.entries(fonts).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label>
          Text size
          <select
            aria-label="Text size"
            value={preferences.size}
            onChange={(e) =>
              update({ size: e.target.value as "standard" | "large" })
            }
          >
            <option value="standard">Standard</option>
            <option value="large">Large text</option>
          </select>
        </label>
        <label>
          Layout density
          <select
            aria-label="Layout density"
            value={preferences.density}
            onChange={(e) =>
              update({ density: e.target.value as "comfortable" | "compact" })
            }
          >
            <option value="comfortable">Comfortable</option>
            <option value="compact">Compact</option>
          </select>
        </label>
        <label>
          Motion
          <select
            aria-label="Motion"
            value={preferences.motion}
            onChange={(e) =>
              update({ motion: e.target.value as "system" | "reduced" })
            }
          >
            <option value="system">Respect device preference</option>
            <option value="reduced">Reduce motion</option>
          </select>
        </label>
        <button className="secondary" onClick={appearance.reset}>
          Restore appearance defaults
        </button>
        <p className="full muted">
          Fonts use local system families: no third-party font tracking or
          external font downloads. Membership-card exports keep their fixed
          professional template.
        </p>
      </section>
      <AccountSecurity />
      <section className="panel">
        <h2>Sessions & logout</h2>
        <div className="actions">
          <button className="secondary" onClick={() => setLogout("local")}>
            Log out of this gadget
          </button>
          <button className="danger" onClick={() => setLogout("global")}>
            Log out of all gadgets
          </button>
          <Link className="button secondary" to="/privacy">
            Privacy Policy
          </Link>
          <Link className="button secondary" to="/terms">
            Terms and Conditions
          </Link>
        </div>
        <p className="muted">
          Global logout revokes refresh sessions. Already issued access tokens
          remain valid until their configured expiry.
        </p>
      </section>
      <section className="panel danger-zone">
        <h2>Account termination / deletion</h2>
        <p>
          Deletion ends your portal access and live membership identity. You
          must verify your current password, confirm the consequences and
          request administrator approval. You can cancel while the request is
          pending.
        </p>
        {auth.developer ? (
          <div className="notice">
            Dev Brian’s developer account is protected and cannot be deleted
            through the portal.
          </div>
        ) : (
          <button
            className="danger"
            onClick={() => {
              setDeleting(true);
              setAck(false);
              setPhrase("");
              setPassword("");
              setReason("");
            }}
          >
            Request account deletion
          </button>
        )}
        <ErrorBox error={requests.error} />
        {requests.data?.map((q) => (
          <article className="closure-request" key={q.id}>
            <div className="actions">
              <Badge value={q.status} />
              <time>{new Date(q.created_at).toLocaleString()}</time>
            </div>
            <p>{q.reason}</p>
            {q.review_note && <p>Review: {q.review_note}</p>}
            {q.status === "pending" && (
              <button
                className="secondary"
                onClick={async () => {
                  try {
                    await rpc("cancel_deletion_request", { request_id: q.id });
                    await requests.refresh();
                    toast.notify("Deletion request cancelled.");
                  } catch (e) {
                    toast.notify((e as Error).message, true);
                  }
                }}
              >
                Cancel deletion request
              </button>
            )}
          </article>
        ))}
      </section>
      {logout && (
        <Confirm
          title={
            logout === "local"
              ? "Log out of this gadget?"
              : "Log out of all gadgets?"
          }
          onClose={() => setLogout(null)}
          onConfirm={async () => {
            const { error } = await supabase.auth.signOut({ scope: logout });
            if (error) throw error;
          }}
        >
          <p>
            You will need to sign in again.{" "}
            {logout === "global" ? "All refresh sessions will be revoked." : ""}
          </p>
        </Confirm>
      )}
      {deleting && (
        <div className="modal-wrap">
          <form
            className="modal form-grid"
            role="dialog"
            aria-modal="true"
            aria-label="Request account deletion"
            onSubmit={async (e) => {
              e.preventDefault();
              if (phrase !== "DELETE MY ACCOUNT" || !ack) return;
              setBusy(true);
              try {
                const { data, error } = await supabase.functions.invoke(
                  "account-lifecycle",
                  {
                    body: {
                      action: "request",
                      password,
                      confirmation: phrase,
                      acknowledged: ack,
                      reason,
                    },
                  },
                );
                if (error || data?.error)
                  throw new Error(data?.error || error?.message);
                setDeleting(false);
                await requests.refresh();
                toast.notify(
                  "Deletion request submitted for administrator review.",
                );
              } catch (e) {
                toast.notify((e as Error).message, true);
              } finally {
                setPassword("");
                setBusy(false);
              }
            }}
          >
            <h2>Confirm account deletion request</h2>
            <div className="error">
              This is not a logout. Approved deletion removes your account,
              linked photo and student membership. Previously downloaded copies
              and managed backup expiry are outside this action.
            </div>
            <label>
              Current password
              <input
                required
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            <label>
              Reason
              <textarea
                required
                minLength={5}
                maxLength={1000}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </label>
            <label>
              Type DELETE MY ACCOUNT exactly
              <input
                required
                value={phrase}
                onChange={(e) => setPhrase(e.target.value)}
              />
            </label>
            <label className="check">
              <input
                type="checkbox"
                checked={ack}
                onChange={(e) => setAck(e.target.checked)}
              />
              I understand the consequences and request permanent account
              deletion after administrator review.
            </label>
            <div className="actions">
              <button
                type="button"
                className="secondary"
                disabled={busy}
                onClick={() => {
                  setDeleting(false);
                  setPassword("");
                }}
              >
                Keep my account
              </button>
              <button
                className="danger"
                disabled={
                  busy ||
                  !ack ||
                  phrase !== "DELETE MY ACCOUNT" ||
                  !password ||
                  reason.trim().length < 5
                }
              >
                Submit deletion request
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
export function AccountClosureReview() {
  const result = useData(
    () => rows<DeletionRequest>("account_deletion_requests"),
    ["account_deletion_requests"],
  );
  const [selected, setSelected] = useState<{
    q: DeletionRequest;
    action: "approve" | "reject" | "execute";
  } | null>(null);
  const [note, setNote] = useState("");
  const [phrase, setPhrase] = useState("");
  const toast = useToast();
  return (
    <>
      <PageTitle
        title="Account closure review"
        description="Super-administrator review and confirmed execution. No self-approval or developer deletion."
      />
      <ErrorBox error={result.error} />
      {result.data?.map((q) => (
        <article className="panel" key={q.id}>
          <div className="actions">
            <Badge value={q.status} />
            <small>Account: {q.user_id}</small>
          </div>
          <p>{q.reason}</p>
          <small>{new Date(q.created_at).toLocaleString()}</small>
          {q.review_note && <p>Review: {q.review_note}</p>}
          <div className="actions">
            {q.status === "pending" && (
              <>
                <button
                  onClick={() => {
                    setSelected({ q, action: "approve" });
                    setNote("");
                  }}
                >
                  Approve request
                </button>
                <button
                  className="secondary"
                  onClick={() => {
                    setSelected({ q, action: "reject" });
                    setNote("");
                  }}
                >
                  Reject request
                </button>
              </>
            )}
            {["approved", "processing"].includes(q.status) && (
              <button
                className="danger"
                onClick={() => {
                  setSelected({ q, action: "execute" });
                  setPhrase("");
                }}
              >
                Execute approved deletion
              </button>
            )}
          </div>
        </article>
      ))}
      {!result.loading && !result.data?.length && (
        <Empty text="No account closure requests." />
      )}
      {selected && (
        <Confirm
          title={
            selected.action === "execute"
              ? "Permanently delete approved account?"
              : `${selected.action} account closure request`
          }
          onClose={() => setSelected(null)}
          onConfirm={async () => {
            if (selected.action === "execute") {
              if (phrase !== "DELETE APPROVED ACCOUNT")
                throw new Error("Type DELETE APPROVED ACCOUNT exactly.");
              const { data, error } = await supabase.functions.invoke(
                "account-lifecycle",
                {
                  body: {
                    action: "execute",
                    request_id: selected.q.id,
                    confirmation: phrase,
                  },
                },
              );
              if (error || data?.error)
                throw new Error(data?.error || error?.message);
            } else
              await rpc("review_deletion_request", {
                request_id: selected.q.id,
                approve: selected.action === "approve",
                review_note: note,
              });
            await result.refresh();
            toast.notify("Account closure action completed.");
          }}
        >
          {selected.action === "execute" ? (
            <>
              <div className="error">
                The original reviewer must execute. Portal data removal is
                irreversible. A failed gateway step remains in Processing so you
                can safely retry.
              </div>
              <label>
                Type DELETE APPROVED ACCOUNT
                <input
                  value={phrase}
                  onChange={(e) => setPhrase(e.target.value)}
                />
              </label>
            </>
          ) : (
            <label>
              Review reason
              <textarea
                minLength={5}
                required
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </label>
          )}
        </Confirm>
      )}
    </>
  );
}
