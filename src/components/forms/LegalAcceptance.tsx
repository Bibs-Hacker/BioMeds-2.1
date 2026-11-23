import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { rows } from "../../services/supabase";
import { useData, ErrorBox, Loading } from "../common";
export type LegalDocument = {
  id: "privacy" | "terms";
  title: string;
  body: string;
  version: number;
  updated_at: string;
};
export type LegalReceipt = { privacy: number; terms: number };
export function LegalAcceptance({
  onChange,
}: {
  onChange: (v: LegalReceipt | null) => void;
}) {
  const result = useData(
    () => rows<LegalDocument>("legal_documents", "id"),
    ["legal_documents"],
  );
  const [read, setRead] = useState<Record<string, boolean>>({});
  const [accepted, setAccepted] = useState(false);
  const fingerprint = result.data?.map((d) => `${d.id}:${d.version}`).join(",");
  useEffect(() => {
    setRead({});
    setAccepted(false);
    onChange(null);
  }, [fingerprint]);
  const complete = Boolean(
    result.data?.length === 2 &&
      result.data.every((d) => read[`${d.id}:${d.version}`]),
  );
  return (
    <section className="legal-gate">
      <h3>Read before you register</h3>
      <p className="muted">
        Scroll to the end of both documents. Then explicitly agree to activate
        the account creation/registration action.
      </p>
      <ErrorBox error={result.error} />
      {result.loading && <Loading />}
      {result.data?.map((d) => (
        <section key={d.id} className="policy-reader">
          <div className="actions">
            <h4>
              {d.title} · v{d.version}
            </h4>
            <Link to={`/${d.id}`} target="_blank" rel="noopener noreferrer">
              Open full document
            </Link>
          </div>
          <div
            className="policy-scroll"
            tabIndex={0}
            role="region"
            aria-label={`${d.title} reader`}
            onScroll={(e) => {
              const el = e.currentTarget;
              if (el.scrollHeight - el.scrollTop - el.clientHeight <= 4)
                setRead((p) => ({ ...p, [`${d.id}:${d.version}`]: true }));
            }}
          >
            <div className="prewrap">{d.body}</div>
            <b>End of {d.title}</b>
          </div>
          <small
            className={read[`${d.id}:${d.version}`] ? "teal-text" : "muted"}
          >
            {read[`${d.id}:${d.version}`]
              ? "End reached ✓"
              : "Scroll down to the end to continue"}
          </small>
        </section>
      ))}
      <label className="check">
        <input
          type="checkbox"
          checked={accepted}
          disabled={!complete}
          onChange={(e) => {
            setAccepted(e.target.checked);
            const privacy = result.data?.find((d) => d.id === "privacy");
            const terms = result.data?.find((d) => d.id === "terms");
            onChange(
              e.target.checked && privacy && terms
                ? { privacy: privacy.version, terms: terms.version }
                : null,
            );
          }}
        />
        I have reviewed and agree to the Privacy Policy and Terms and
        Conditions.
      </label>
    </section>
  );
}
