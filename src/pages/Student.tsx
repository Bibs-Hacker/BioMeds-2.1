import { QuickAction } from "../components/dashboard";
import { BookOpen, MessageSquare, Settings } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { CreditCard, FilePenLine, Megaphone } from "lucide-react";
import { myStudent, requestCorrection } from "../services/studentService";
import { rpc, rows } from "../services/supabase";
import {
  useData,
  Loading,
  ErrorBox,
  PageTitle,
  Badge,
  Photo,
  Empty,
  useToast,
} from "../components/common";
import { AnnouncementList } from "./Public";
import { editableFields } from "../utils/validation";
import type { Correction } from "../types";
export const lockNotice =
  "Your submitted student information is locked to preserve the accuracy and integrity of the official class register. If any information is incorrect, please submit a correction request for administrator review.";
export function StudentDashboard() {
  const { data: s, error, loading } = useData(myStudent, ["students"]);
  const notifications = useData(
    () =>
      rows<{
        id: string;
        message: string;
        read_at: string | null;
        created_at: string;
      }>("notifications"),
    ["notifications"],
  );
  const toast = useToast();
  return (
    <>
      <PageTitle
        title={
          s
            ? `Welcome, ${s.full_name.split(" ")[0]}`
            : "Welcome to your class portal"
        }
        description="Your class record, membership and announcements in one place."
      />
      <ErrorBox error={error} />
      {loading ? (
        <Loading />
      ) : s ? (
        <>
          <div className="panel profile-summary">
            <Photo path={s.photo_path} name={s.full_name} />
            <div>
              <h2>{s.full_name}</h2>
              <p>
                {s.registration_number} · Medical Engineering · Year 2 Semester
                1
              </p>
              <Badge value={s.registration_status} />{" "}
              <Badge value={s.membership_status} />
            </div>
          </div>
          <div className="feature-grid">
            <QuickAction
              to="/student/academics"
              title="Lecturers & teaching units"
              description="Meet your lecturers and find the units they teach."
              icon={BookOpen}
            />
            <QuickAction
              to="/student/feedback"
              title="Feedback & ratings"
              description="Share an experience, suggestion or bug report privately."
              icon={MessageSquare}
            />
            <QuickAction
              to="/student/settings"
              title="Personalize your portal"
              description="Choose a theme, font and accessibility preferences."
              icon={Settings}
            />
            <Link className="panel quick-link" to="/student/card">
              <CreditCard />
              <h3>Your membership card</h3>
              <p>
                {s.membership_status === "active"
                  ? "Your approved card is ready to download."
                  : "Card downloads become available after approval and activation."}
              </p>
            </Link>
            <Link className="panel quick-link" to="/student/corrections">
              <FilePenLine />
              <h3>Information corrections</h3>
              <p>Request a reviewed change to your locked student record.</p>
            </Link>
            <Link className="panel quick-link" to="/student/announcements">
              <Megaphone />
              <h3>Class announcements</h3>
              <p>Read the latest academic and registration notices.</p>
            </Link>
          </div>
          <div className="notice">{lockNotice}</div>
        </>
      ) : (
        <div className="panel">
          <h2>Complete your class registration</h2>
          <p>
            Your account is ready. Register to establish your class identity.
          </p>
          <Link className="button" to="/student/setup">
            Start registration
          </Link>
        </div>
      )}
      <div className="page-title">
        <h2>Notifications</h2>
        {notifications.data?.some((n) => !n.read_at) && (
          <button
            className="secondary"
            onClick={async () => {
              try {
                await rpc("mark_notifications_read");
                await notifications.refresh();
              } catch (e) {
                toast.notify((e as Error).message, true);
              }
            }}
          >
            Mark all read
          </button>
        )}
      </div>
      <ErrorBox error={notifications.error} />
      {notifications.data?.map((n) => (
        <div
          key={n.id}
          className={`notification ${!n.read_at ? "unread" : ""}`}
        >
          <p>{n.message}</p>
          <small>{new Date(n.created_at).toLocaleString()}</small>
        </div>
      ))}
      {!notifications.loading && !notifications.data?.length && (
        <Empty text="No account notifications yet." />
      )}
      <h2>Recent class announcements</h2>
      <AnnouncementList />
    </>
  );
}
export function StudentProfile() {
  const { data: s, error, loading } = useData(myStudent, ["students"]);
  return (
    <>
      <PageTitle
        title="My official class profile"
        description="Read-only student information after submission."
      />
      <ErrorBox error={error} />
      {loading ? (
        <Loading />
      ) : s ? (
        <>
          <div className="notice">{lockNotice}</div>
          <article className="panel">
            <div className="profile-summary">
              <Photo name={s.full_name} path={s.photo_path} />
              <h2>{s.full_name}</h2>
            </div>
            {Object.entries(s)
              .filter(
                ([k]) =>
                  ![
                    "id",
                    "user_id",
                    "photo_path",
                    "consent_notice",
                    "consent_at",
                  ].includes(k),
              )
              .map(([k, v]) => (
                <div className="detail-row" key={k}>
                  <span>{k.replaceAll("_", " ")}</span>
                  <b>{String(v ?? "Not provided")}</b>
                </div>
              ))}
          </article>
        </>
      ) : (
        <Link className="button" to="/student/setup">
          Complete registration
        </Link>
      )}
    </>
  );
}
export function StudentCorrections() {
  const student = useData(myStudent, ["students"]);
  const requests = useData(
    () => rows<Correction>("correction_requests"),
    ["correction_requests"],
  );
  const [field, setField] = useState<string>("full_name");
  const [value, setValue] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const s = student.data;
  return (
    <>
      <PageTitle
        title="Request an information correction"
        description="Only an authorized administrator can change your official record."
      />
      <div className="notice">{lockNotice}</div>
      <ErrorBox error={student.error || requests.error} />
      {s && (
        <form
          className="panel form-grid"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            try {
              await requestCorrection(s.id, field, value, reason);
              setValue("");
              setReason("");
              await requests.refresh();
              toast.notify("Correction request submitted for review.");
            } catch (e) {
              toast.notify((e as Error).message, true);
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            Field requiring correction
            <select value={field} onChange={(e) => setField(e.target.value)}>
              {editableFields.map((f) => (
                <option key={f} value={f}>
                  {f.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </label>
          <p>
            Existing information:{" "}
            <b>{String(s[field as keyof typeof s] ?? "Not provided")}</b>
          </p>
          <label>
            Requested correction
            <input
              maxLength={160}
              value={value}
              onChange={(e) => setValue(e.target.value)}
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
          <button disabled={busy}>Submit correction request</button>
        </form>
      )}
      <h2>My correction requests</h2>
      {requests.data?.map((r) => (
        <article className="panel" key={r.id}>
          <div className="actions">
            <h3>{r.field_name.replaceAll("_", " ")}</h3>
            <Badge value={r.status} />
          </div>
          <p>
            {r.previous_value || "Not provided"} →{" "}
            {r.requested_value || "Not provided"}
          </p>
          <p>{r.reason}</p>
          <small>{new Date(r.created_at).toLocaleString()}</small>
          {r.review_note && <p>Administrator response: {r.review_note}</p>}
        </article>
      ))}
      {!requests.loading && !requests.data?.length && (
        <Empty text="No correction requests yet." />
      )}
    </>
  );
}
