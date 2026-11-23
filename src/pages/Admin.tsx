import { StatGrid } from "../components/dashboard";
import { useState } from "react";
import { Link } from "react-router-dom";
import { rows, rpc, supabase } from "../services/supabase";
import {
  decideStudent,
  membershipStatus,
  reviewCorrection,
} from "../services/studentService";
import {
  useData,
  Loading,
  ErrorBox,
  PageTitle,
  Badge,
  Photo,
  Confirm,
  Empty,
  useToast,
} from "../components/common";
import {
  StudentFilters,
  filterStudents,
  emptyFilters,
} from "../components/StudentFilters";
import { AnalyticsChart } from "../components/Analytics";
import { groupBy, summarize, trends } from "../utils/analytics";
import { useAuth } from "../contexts/AuthContext";
import type { Student, Settings, Correction } from "../types";
export function AdminDashboard() {
  const records = useData(
    () => rows<Student>("students"),
    ["students", "membership_cards"],
  );
  const cards = useData(
    () => rows<{ student_id: string }>("membership_cards"),
    ["membership_cards"],
  );
  const settings = useData(async () => {
    const { data, error } = await supabase
      .from("registration_settings")
      .select("*")
      .single();
    if (error) throw error;
    return data as Settings;
  }, ["registration_settings"]);
  const [filters, setFilters] = useState(emptyFilters);
  const s = filterStudents(records.data || [], filters);
  const ids = new Set(s.map((x) => x.id));
  const issued = (cards.data || []).filter((c) => ids.has(c.student_id)).length;
  const expected = settings.data?.expected_population;
  return (
    <>
      <PageTitle
        eyebrow="LIVE CLASS INTELLIGENCE"
        title="Population overview"
        description="An accurate view of your class. Figures update from the database."
      />
      <ErrorBox error={records.error || cards.error || settings.error} />
      {records.loading ? (
        <Loading />
      ) : (
        <>
          <StudentFilters
            students={records.data || []}
            value={filters}
            onChange={setFilters}
          />
          <StatGrid stats={summarize(s, issued)} />
          <div className="chart-grid">
            <AnalyticsChart
              title="Gender distribution"
              data={groupBy(s, "gender")}
              kind="pie"
            />
            <AnalyticsChart
              title="County distribution"
              data={groupBy(s, "county")}
            />
            <AnalyticsChart
              title="Registration trends"
              data={trends(s)}
              kind="line"
            />
            <AnalyticsChart
              title="Approval status"
              data={groupBy(s, "registration_status")}
              kind="pie"
            />
            <AnalyticsChart
              title="Admission year distribution"
              data={groupBy(s, "admission_year")}
            />
            <AnalyticsChart
              title="Membership activity"
              data={groupBy(s, "membership_status")}
            />
          </div>
          <article className="panel">
            <h3>Registration completion progress</h3>
            {expected ? (
              <>
                <progress max={expected} value={Math.min(s.length, expected)} />
                <p>
                  {s.length} matching registrations / {expected} expected class
                  members ({Math.round((s.length / expected) * 100)}%)
                </p>
              </>
            ) : (
              <p className="muted">
                Set an expected population in System Control to measure
                completion. No target is assumed.
              </p>
            )}
          </article>
        </>
      )}
      <p className="muted">Developed and Managed by Dev Brian</p>
    </>
  );
}
export function StudentDirectory() {
  const records = useData(() => rows<Student>("students"), ["students"]);
  const [filters, setFilters] = useState(emptyFilters);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Student | null>(null);
  const [action, setAction] = useState<{
    s: Student;
    status: string;
    kind: string;
  } | null>(null);
  const [reason, setReason] = useState("");
  const auth = useAuth();
  const toast = useToast();
  const filtered = filterStudents(records.data || [], filters);
  const size = 12;
  return (
    <>
      <PageTitle
        title="Student directory"
        description="Authorized access to the official class register."
      />
      <ErrorBox error={records.error} />
      <StudentFilters
        students={records.data || []}
        value={filters}
        onChange={(f) => {
          setFilters(f);
          setPage(1);
        }}
      />
      {records.loading ? (
        <Loading />
      ) : (
        <div className="panel table-wrap">
          <table>
            <thead>
              <tr>
                {[
                  "Student",
                  "Registration no.",
                  "Gender",
                  "Email / phone",
                  "County",
                  "Admission",
                  "Registration",
                  "Membership",
                  "Actions",
                ].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.slice((page - 1) * size, page * size).map((s) => (
                <tr key={s.id}>
                  <td>
                    <div className="table-person">
                      <Photo name={s.full_name} path={s.photo_path} />
                      <b>{s.full_name}</b>
                    </div>
                  </td>
                  <td>{s.registration_number}</td>
                  <td>{s.gender}</td>
                  <td>
                    {s.email}
                    <br />
                    {s.phone}
                  </td>
                  <td>{s.county}</td>
                  <td>{s.admission_year}</td>
                  <td>
                    <Badge value={s.registration_status} />
                  </td>
                  <td>
                    <Badge value={s.membership_status} />
                  </td>
                  <td>
                    <div className="table-actions">
                      <button
                        className="secondary"
                        onClick={() => setSelected(s)}
                      >
                        View
                      </button>
                      {auth.can("approve") && (
                        <>
                          <button
                            onClick={() => {
                              setReason("");
                              setAction({
                                s,
                                status: "approved",
                                kind: "registration",
                              });
                            }}
                          >
                            Approve
                          </button>
                          <button
                            className="danger"
                            onClick={() => {
                              setReason("");
                              setAction({
                                s,
                                status: "rejected",
                                kind: "registration",
                              });
                            }}
                          >
                            Reject
                          </button>
                          {s.registration_status === "approved" && (
                            <select
                              aria-label={`Change membership for ${s.full_name}`}
                              value=""
                              onChange={(e) => {
                                setReason("");
                                setAction({
                                  s,
                                  status: e.target.value,
                                  kind: "membership",
                                });
                              }}
                            >
                              <option value="" disabled>
                                Membership…
                              </option>
                              {[
                                "active",
                                "inactive",
                                "suspended",
                                "revoked",
                              ].map((v) => (
                                <option key={v} value={v}>
                                  {v}
                                </option>
                              ))}
                            </select>
                          )}
                        </>
                      )}
                      {s.registration_status === "approved" &&
                        s.membership_status === "active" && (
                          <Link
                            className="button secondary"
                            to={`/admin/cards/${s.id}`}
                          >
                            Card
                          </Link>
                        )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!filtered.length && <Empty />}
          <div className="pagination">
            <span>{filtered.length} matching students</span>
            <button
              className="secondary"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </button>
            <span>
              Page {page} of {Math.max(1, Math.ceil(filtered.length / size))}
            </span>
            <button
              className="secondary"
              disabled={page * size >= filtered.length}
              onClick={() => setPage(page + 1)}
            >
              Next
            </button>
          </div>
        </div>
      )}
      {selected && (
        <div className="modal-wrap">
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label="Student record"
          >
            <h2>{selected.full_name}</h2>
            {Object.entries(selected)
              .filter(([k]) => !["user_id", "id", "photo_path"].includes(k))
              .map(([k, v]) => (
                <div className="detail-row" key={k}>
                  <span>{k.replaceAll("_", " ")}</span>
                  <b>{String(v ?? "Not provided")}</b>
                </div>
              ))}
            {auth.can("correct") && (
              <Link className="button secondary" to="/admin/corrections">
                Review correction requests
              </Link>
            )}
            <button onClick={() => setSelected(null)}>Close</button>
          </section>
        </div>
      )}
      {action && (
        <Confirm
          title={`${action.status} — ${action.s.full_name}`}
          onClose={() => setAction(null)}
          onConfirm={async () => {
            if (reason.trim().length < 5)
              throw new Error("Enter a reason of at least five characters.");
            if (action.kind === "registration")
              await decideStudent(action.s.id, action.status, reason);
            else await membershipStatus(action.s.id, action.status, reason);
            await records.refresh();
            toast.notify("Student status updated and audit recorded.");
          }}
        >
          <label>
            Decision reason
            <textarea
              minLength={5}
              maxLength={1000}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </label>
          <p>
            Approval generates or rotates the verification token. Old cards must
            be regenerated after reapproval.
          </p>
        </Confirm>
      )}
    </>
  );
}
export function CorrectionReview() {
  const result = useData(
    () => rows<Correction>("correction_requests"),
    ["correction_requests", "students"],
  );
  const students = useData(() => rows<Student>("students"), ["students"]);
  const [selected, setSelected] = useState<{
    r: Correction;
    approve: boolean;
  } | null>(null);
  const [note, setNote] = useState("");
  const toast = useToast();
  return (
    <>
      <PageTitle
        title="Correction review"
        description="Changes are applied only by authorized backend operations and recorded in the audit log."
      />
      <ErrorBox error={result.error || students.error} />
      {result.loading ? (
        <Loading />
      ) : (
        result.data?.map((r) => (
          <article className="panel" key={r.id}>
            <div className="actions">
              <h3>
                {students.data?.find((s) => s.id === r.student_id)?.full_name ||
                  "Student"}{" "}
                · {r.field_name.replaceAll("_", " ")}
              </h3>
              <Badge value={r.status} />
            </div>
            <p>
              <b>Previous:</b> {r.previous_value || "Not provided"} →{" "}
              <b>Requested:</b> {r.requested_value || "Not provided"}
            </p>
            <p>{r.reason}</p>
            <small>{new Date(r.created_at).toLocaleString()}</small>
            {r.review_note && <p>Review: {r.review_note}</p>}
            {r.status === "pending" && (
              <div className="actions">
                <button
                  onClick={() => {
                    setNote("");
                    setSelected({ r, approve: true });
                  }}
                >
                  Approve correction
                </button>
                <button
                  className="danger"
                  onClick={() => {
                    setNote("");
                    setSelected({ r, approve: false });
                  }}
                >
                  Reject correction
                </button>
              </div>
            )}
          </article>
        ))
      )}
      {!result.loading && !result.data?.length && <Empty />}
      {selected && (
        <Confirm
          title={
            selected.approve ? "Authorize correction" : "Reject correction"
          }
          onClose={() => setSelected(null)}
          onConfirm={async () => {
            await reviewCorrection(selected.r.id, selected.approve, note);
            await result.refresh();
            toast.notify("Correction reviewed. Student has been notified.");
          }}
        >
          <label>
            Review reason
            <textarea
              minLength={5}
              required
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>
        </Confirm>
      )}
    </>
  );
}
