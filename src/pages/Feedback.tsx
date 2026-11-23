import { useState } from "react";
import { Star } from "lucide-react";
import { rows, rpc } from "../services/supabase";
import {
  useData,
  Loading,
  ErrorBox,
  PageTitle,
  Badge,
  Empty,
  useToast,
} from "../components/common";
import { useAuth } from "../contexts/AuthContext";
type FeedbackItem = {
  id: string;
  rating: number;
  category: string;
  message: string;
  status: string;
  response: string | null;
  created_at: string;
  user_id: string;
};
export function Feedback({ review = false }: { review?: boolean }) {
  const auth = useAuth();
  const toast = useToast();
  const result = useData(() => rows<FeedbackItem>("feedback"), ["feedback"]);
  const [rating, setRating] = useState(0);
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState("General");
  const [busy, setBusy] = useState(false);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [status, setStatus] = useState("all");
  const manage = review && auth.can("feedback");
  const filtered = (result.data || []).filter(
    (f) => status === "all" || f.status === status,
  );
  const average = result.data?.length
    ? result.data.reduce((a, f) => a + f.rating, 0) / result.data.length
    : null;
  return (
    <>
      <PageTitle
        title={manage ? "Feedback & ratings review" : "Feedback & ratings"}
        description={
          manage
            ? "Private feedback from the class. Responses notify the author."
            : "Tell us what works and what could be better. Your feedback is private to authorized reviewers."
        }
      />
      <ErrorBox error={result.error} />
      {!manage && (
        <form
          className="panel form-grid narrow"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!rating) return;
            setBusy(true);
            try {
              await rpc("send_feedback", { rating, category, message });
              setMessage("");
              setRating(0);
              await result.refresh();
              toast.notify("Thank you — your feedback has been submitted.");
            } catch (e) {
              toast.notify((e as Error).message, true);
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>Rate your portal experience (required)</label>
          <div
            className="rating-stars"
            role="radiogroup"
            aria-label="Portal experience rating"
          >
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={rating === n}
                aria-label={`${n} star${n > 1 ? "s" : ""}`}
                className={n <= rating ? "selected" : ""}
                onClick={() => setRating(n)}
              >
                <Star fill={n <= rating ? "currentColor" : "none"} />
              </button>
            ))}
          </div>
          <label>
            Category
            <select
              aria-label="Category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {[
                "General",
                "Interface",
                "Bug report",
                "Academic",
                "Suggestion",
              ].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label>
            Your feedback
            <textarea
              required
              minLength={5}
              maxLength={2000}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Share a helpful suggestion or describe an issue…"
            />
          </label>
          <small>
            No passwords, sensitive medical details or other people's private
            information. Up to five submissions per day.
          </small>
          <button disabled={busy || !rating}>Submit feedback</button>
        </form>
      )}
      {manage && (
        <div className="panel actions">
          <span>
            Average rating:{" "}
            <b>{average ? average.toFixed(1) + " / 5" : "No ratings yet"}</b> ·{" "}
            {result.data?.length || 0} responses
          </span>
          <label>
            Review filter
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              {["all", "open", "reviewed", "resolved"].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
        </div>
      )}
      {result.loading ? (
        <Loading />
      ) : (
        filtered.map((f) => (
          <article className="panel" key={f.id}>
            <div className="actions">
              <b>
                {"★".repeat(f.rating)}
                {"☆".repeat(5 - f.rating)}
              </b>
              <Badge value={f.status} />
              <span className="badge">{f.category}</span>
            </div>
            <p className="prewrap">{f.message}</p>
            <small>{new Date(f.created_at).toLocaleString()}</small>
            {f.response && (
              <div className="notice prewrap">
                <b>Administrator response:</b> {f.response}
              </div>
            )}
            {manage && (
              <form
                className="form-grid"
                onSubmit={async (e) => {
                  e.preventDefault();
                  setBusy(true);
                  try {
                    await rpc("respond_feedback", {
                      feedback_id: f.id,
                      response: responses[f.id] || "",
                      new_status: "resolved",
                    });
                    await result.refresh();
                    toast.notify("Response sent; feedback resolved.");
                  } catch (e) {
                    toast.notify((e as Error).message, true);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <label>
                  Review response
                  <textarea
                    minLength={3}
                    maxLength={2000}
                    required
                    value={responses[f.id] || ""}
                    onChange={(e) =>
                      setResponses({ ...responses, [f.id]: e.target.value })
                    }
                  />
                </label>
                <div className="actions">
                  <button disabled={busy}>Respond and resolve</button>
                  <button
                    type="button"
                    className="secondary"
                    disabled={busy || (responses[f.id] || "").trim().length < 3}
                    onClick={async () => {
                      setBusy(true);
                      try {
                        await rpc("respond_feedback", {
                          feedback_id: f.id,
                          response: responses[f.id],
                          new_status: "reviewed",
                        });
                        await result.refresh();
                        toast.notify("Feedback reviewed.");
                      } catch (e) {
                        toast.notify((e as Error).message, true);
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    Mark reviewed with response
                  </button>
                </div>
              </form>
            )}
          </article>
        ))
      )}
      {!result.loading && !filtered.length && (
        <Empty text="No feedback to display yet." />
      )}
    </>
  );
}
