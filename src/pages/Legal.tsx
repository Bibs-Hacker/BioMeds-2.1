import { useState } from "react";
import { useParams } from "react-router-dom";
import { supabase, rpc } from "../services/supabase";
import {
  useData,
  PageTitle,
  ErrorBox,
  Loading,
  useToast,
} from "../components/common";
import { useAuth } from "../contexts/AuthContext";
import type { LegalDocument } from "../components/forms/LegalAcceptance";
export function LegalPage({
  document = "privacy",
}: {
  document?: "privacy" | "terms";
}) {
  const { kind } = useParams();
  const id =
    kind === "terms" ? "terms" : kind === "privacy" ? "privacy" : document;
  const result = useData(async () => {
    const { data, error } = await supabase
      .from("legal_documents")
      .select("*")
      .eq("id", id)
      .single();
    if (error) throw error;
    return data as LegalDocument;
  }, ["legal_documents"]);
  const auth = useAuth();
  const [body, setBody] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  return (
    <section className="section narrow">
      <PageTitle
        title={
          result.data?.title ||
          (id === "privacy" ? "Privacy Policy" : "Terms and Conditions")
        }
        description="Available to every visitor and registered user."
      />
      <ErrorBox error={result.error} />
      {result.loading ? (
        <Loading />
      ) : (
        result.data && (
          <article className="panel">
            <span className="badge">Version {result.data.version}</span>
            <p className="muted">
              Updated {new Date(result.data.updated_at).toLocaleDateString()}
            </p>
            <div className="prewrap legal-body">{result.data.body}</div>
            {auth.can("settings") && (
              <form
                className="form-grid"
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (
                    !window.confirm(
                      "Publish a new policy version? New registrants must accept the updated version.",
                    )
                  )
                    return;
                  setBusy(true);
                  try {
                    await rpc("save_legal_document", {
                      document_id: id,
                      body: body ?? result.data!.body,
                    });
                    setBody(null);
                    await result.refresh();
                    toast.notify("New policy version published.");
                  } catch (e) {
                    toast.notify((e as Error).message, true);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <h3>Administrator policy editor</h3>
                <label>
                  Reviewed policy content
                  <textarea
                    minLength={100}
                    maxLength={20000}
                    required
                    value={body ?? result.data.body}
                    onChange={(e) => setBody(e.target.value)}
                  />
                </label>
                <button disabled={busy}>Publish new version</button>
                <p className="notice">
                  Obtain a responsible controller/legal review before
                  publication. The default policies are operational drafts, not
                  a legal certification.
                </p>
              </form>
            )}
          </article>
        )
      )}
    </section>
  );
}
