import { PortalFooter } from "./navigation/PortalFooter";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { supabase, configured } from "../services/supabase";
import { ShieldCheck, Activity, LoaderCircle } from "lucide-react";
export const Footer = PortalFooter;
export const Brand = () => (
  <span className="brand">
    <span className="brand-icon">
      <Activity size={25} />
    </span>
    <span>
      MedEng <b>Y2S1</b>
      <small>KMTC CLASS PORTAL</small>
    </span>
  </span>
);
export const Verified = () => (
  <span className="verified" title="System-verified original developer">
    <ShieldCheck size={16} />
    Verified Developer
  </span>
);
export const Loading = () => (
  <div className="loading-area" role="status">
    <div className="loading">
      <LoaderCircle className="spin" />
      Loading secure workspace…
    </div>
    <div className="skeleton-row" aria-hidden="true">
      <span />
      <span />
      <span />
    </div>
  </div>
);
export const Empty = ({
  text = "No records to display.",
}: {
  text?: string;
}) => <div className="empty">{text}</div>;
export const Badge = ({ value }: { value: string }) => (
  <span className={`badge ${value}`}>{value.replaceAll("_", " ")}</span>
);
export const ErrorBox = ({ error }: { error: string }) =>
  error ? (
    <div className="error" role="alert">
      {error}
    </div>
  ) : null;
type Toast = { notify: (message: string, error?: boolean) => void };
const ToastContext = createContext<Toast>(null!);
export const useToast = () => useContext(ToastContext);
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{
    message: string;
    error: boolean;
  } | null>(null);
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(id);
  }, [toast]);
  return (
    <ToastContext.Provider
      value={{
        notify: (message, error = false) => setToast({ message, error }),
      }}
    >
      {children}
      {toast && (
        <div
          className={`toast ${toast.error ? "error" : "success"}`}
          role={toast.error ? "alert" : "status"}
        >
          {toast.message}
          <button
            className="icon-button"
            aria-label="Dismiss notification"
            onClick={() => setToast(null)}
          >
            ×
          </button>
        </div>
      )}
    </ToastContext.Provider>
  );
}
export function useData<T>(loader: () => Promise<T>, tables: string[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const refresh = async () => {
    if (!configured) {
      setError("Connect your Supabase project to use this feature.");
      setLoading(false);
      return;
    }
    try {
      const result = await loader();
      setData(result);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load data");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void refresh();
    if (!configured) return;
    const ch = supabase.channel(crypto.randomUUID());
    for (const table of tables)
      ch.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        () => void refresh(),
      );
    ch.subscribe();
    const id = setInterval(() => void refresh(), 60000);
    return () => {
      clearInterval(id);
      void supabase.removeChannel(ch);
    };
  }, [tables.join(",")]);
  return { data, error, loading, refresh };
}
export function Confirm({
  title,
  children,
  onConfirm,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <div className="modal-wrap">
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <h2>{title}</h2>
        {children}
        <ErrorBox error={error} />
        <div className="actions">
          <button className="secondary" disabled={busy} onClick={onClose}>
            Cancel
          </button>
          <button
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await onConfirm();
                onClose();
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "Saving…" : "Confirm"}
          </button>
        </div>
      </section>
    </div>
  );
}
export function PageTitle({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="page-title">
      <div>
        <p className="eyebrow">{eyebrow || "CLASS WORKSPACE"}</p>
        <h1>{title}</h1>
        {description && <p className="muted">{description}</p>}
      </div>
      {children}
    </div>
  );
}
export function Photo({ path, name }: { path: string | null; name: string }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    setUrl("");
    if (path)
      supabase.storage
        .from("student-photos")
        .createSignedUrl(path, 180)
        .then(({ data }) => setUrl(data?.signedUrl || ""));
  }, [path]);
  return url ? (
    <img className="avatar" src={url} alt={`${name} profile`} />
  ) : (
    <span className="avatar initials">
      {name
        .split(" ")
        .map((s) => s[0])
        .slice(0, 2)
        .join("")}
    </span>
  );
}
