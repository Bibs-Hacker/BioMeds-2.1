import { useState } from "react";
import { rows, rpc, supabase } from "../services/supabase";
import { useAuth } from "../contexts/AuthContext";
import {
  useData,
  Loading,
  ErrorBox,
  PageTitle,
  Badge,
  Verified,
  Confirm,
  Empty,
  useToast,
} from "../components/common";
import {
  StudentFilters,
  filterStudents,
  emptyFilters,
} from "../components/StudentFilters";
import {
  excelReport,
  pdfReport,
  loadReportRegister,
} from "../services/reportService";
import { groupBy } from "../utils/analytics";
import type { Student, Announcement, Role, Settings } from "../types";
import { roleLabels } from "../types";
export function Reports() {
  const records = useData(loadReportRegister, ["students", "membership_cards"]);
  const cards = useData(
    () => rows<{ student_id: string }>("membership_cards"),
    ["membership_cards"],
  );
  const [filters, setFilters] = useState(emptyFilters);
  const [type, setType] = useState("Complete class population");
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  let data = filterStudents(records.data || [], filters);
  if (type === "Approved student register")
    data = data.filter((s) => s.registration_status === "approved");
  if (type === "Pending registrations")
    data = data.filter((s) => s.registration_status === "pending");
  if (type === "Rejected registrations")
    data = data.filter((s) => s.registration_status === "rejected");
  if (type === "Membership card issuance")
    data = data.filter((s) => cards.data?.some((c) => c.student_id === s.id));
  if (type === "Gender distribution")
    data = [...data].sort((a, b) => a.gender.localeCompare(b.gender));
  if (type === "County distribution")
    data = [...data].sort((a, b) => a.county.localeCompare(b.county));
  if (type === "Admission year report")
    data = [...data].sort((a, b) => a.admission_year - b.admission_year);
  async function download(kind: string) {
    setBusy(true);
    try {
      if (kind === "excel") excelReport(data, type);
      else pdfReport(data, type, kind === "print");
      toast.notify("Report generated. Handle exported records confidentially.");
    } catch (e) {
      toast.notify((e as Error).message, true);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageTitle
        title="Reports & exports"
        description="Database-backed registers. Private contacts and emergency details are excluded from standard exports."
      />
      <ErrorBox error={records.error || cards.error} />
      <StudentFilters
        students={records.data || []}
        value={filters}
        onChange={setFilters}
      />
      <article className="panel form-grid">
        <label>
          Report type
          <select value={type} onChange={(e) => setType(e.target.value)}>
            {[
              "Complete class population",
              "Gender distribution",
              "County distribution",
              "Approved student register",
              "Pending registrations",
              "Rejected registrations",
              "Admission year report",
              "Membership card issuance",
            ].map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        <p>{data.length} records in the selected report.</p>
        <div className="actions">
          <button
            disabled={
              busy ||
              records.loading ||
              cards.loading ||
              Boolean(records.error || cards.error)
            }
            onClick={() => void download("excel")}
          >
            Export Excel
          </button>
          <button
            disabled={
              busy ||
              records.loading ||
              cards.loading ||
              Boolean(records.error || cards.error)
            }
            onClick={() => void download("pdf")}
          >
            Export PDF
          </button>
          <button
            className="secondary"
            disabled={
              busy ||
              records.loading ||
              cards.loading ||
              Boolean(records.error || cards.error)
            }
            onClick={() => void download("print")}
          >
            Printable report
          </button>
        </div>
        <div className="notice">
          Exports are intended only for authorized class administration. Do not
          circulate private registers publicly.
        </div>
      </article>
      <div className="chart-grid">
        {(["gender", "county", "admission_year"] as const).map((key) => (
          <article className="panel" key={key}>
            <h3>{key.replaceAll("_", " ")} summary</h3>
            {groupBy(data, key).map((v) => (
              <div className="detail-row" key={v.name}>
                <span>{v.name}</span>
                <b>{v.value}</b>
              </div>
            ))}
          </article>
        ))}
      </div>
    </>
  );
}
const announcementDefault = {
  title: "",
  body: "",
  category: "General",
  is_public: false,
  state: "draft",
  publish_at: new Date().toISOString().slice(0, 16),
};
export function AnnouncementManagement() {
  const result = useData(
    () => rows<Announcement>("announcements"),
    ["announcements"],
  );
  const [form, setForm] = useState(announcementDefault);
  const [editing, setEditing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  return (
    <>
      <PageTitle
        title="Announcement management"
        description="Publish, schedule, edit and archive class notices."
      />
      <ErrorBox error={result.error} />
      <form
        className="panel form-grid"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            await rpc("save_announcement", {
              payload: {
                ...form,
                publish_at: new Date(form.publish_at).toISOString(),
              },
              announcement_id: editing,
            });
            setEditing(null);
            setForm(announcementDefault);
            await result.refresh();
            toast.notify("Announcement saved.");
          } catch (e) {
            toast.notify((e as Error).message, true);
          } finally {
            setBusy(false);
          }
        }}
      >
        <h2>{editing ? "Edit announcement" : "Create announcement"}</h2>
        <label>
          Title
          <input
            required
            minLength={3}
            maxLength={160}
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
        </label>
        <label>
          Body
          <textarea
            required
            minLength={3}
            maxLength={10000}
            value={form.body}
            onChange={(e) => setForm({ ...form, body: e.target.value })}
          />
        </label>
        <div className="form-grid two-col">
          <label>
            Category
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            >
              {[
                "General",
                "Academic",
                "Registration",
                "Meetings",
                "Important Notices",
              ].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
          <label>
            Publication status
            <select
              value={form.state}
              onChange={(e) => setForm({ ...form, state: e.target.value })}
            >
              {["draft", "published", "archived"].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
          <label>
            Publish at (your local time)
            <input
              required
              type="datetime-local"
              value={form.publish_at}
              onChange={(e) => setForm({ ...form, publish_at: e.target.value })}
            />
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={form.is_public}
              onChange={(e) =>
                setForm({ ...form, is_public: e.target.checked })
              }
            />
            Visible on public landing page
          </label>
        </div>
        <div className="actions">
          <button disabled={busy}>Save announcement</button>
          {editing && (
            <button
              type="button"
              className="secondary"
              onClick={() => {
                setEditing(null);
                setForm(announcementDefault);
              }}
            >
              Cancel editing
            </button>
          )}
        </div>
      </form>
      {result.data?.map((a) => (
        <article className="panel" key={a.id}>
          <div className="actions">
            <h3>{a.title}</h3>
            <Badge value={a.state} />
            <span className="badge">{a.category}</span>
          </div>
          <p className="prewrap">{a.body}</p>
          <p>
            {new Date(a.publish_at).toLocaleString()}{" "}
            {new Date(a.publish_at) > new Date() ? "· Scheduled" : ""} ·{" "}
            {a.is_public ? "Public" : "Members only"}
          </p>
          <div className="actions">
            <button
              className="secondary"
              onClick={() => {
                setEditing(a.id);
                const d = new Date(a.publish_at);
                setForm({
                  title: a.title,
                  body: a.body,
                  category: a.category,
                  is_public: a.is_public,
                  state: a.state,
                  publish_at: new Date(
                    d.getTime() - d.getTimezoneOffset() * 60000,
                  )
                    .toISOString()
                    .slice(0, 16),
                });
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            >
              Edit
            </button>
            <button
              className="secondary"
              onClick={async () => {
                try {
                  await rpc("save_announcement", {
                    payload: { ...a, state: "archived" },
                    announcement_id: a.id,
                  });
                  await result.refresh();
                } catch (e) {
                  toast.notify((e as Error).message, true);
                }
              }}
            >
              Archive
            </button>
            <button className="danger" onClick={() => setDeleting(a.id)}>
              Delete
            </button>
          </div>
        </article>
      ))}
      {deleting && (
        <Confirm
          title="Delete announcement?"
          onClose={() => setDeleting(null)}
          onConfirm={async () => {
            await rpc("delete_announcement", { announcement_id: deleting });
            await result.refresh();
          }}
        >
          <p>
            This removes the notice from the platform. The audit entry is
            retained.
          </p>
        </Confirm>
      )}
    </>
  );
}
type AdminEntry = {
  user_id: string;
  display_name: string;
  role: Role;
  is_developer: boolean;
  created_at: string;
};
export function AdminManagement() {
  const result = useData(() => rpc<AdminEntry[]>("administrator_directory"));
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>("class_representative");
  const [busy, setBusy] = useState(false);
  const [change, setChange] = useState<{
    user: AdminEntry;
    role: string | null;
  } | null>(null);
  const toast = useToast();
  return (
    <>
      <PageTitle
        title="Administrator access"
        description="Private invitations and backend-enforced roles. There is no public administrator registration."
      />
      <ErrorBox error={result.error} />
      <form
        className="panel form-grid two-col"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            const { data, error } = await supabase.functions.invoke(
              "admin-invite",
              { body: { email, display_name: name, role } },
            );
            if (error || data?.error)
              throw new Error(data?.error || error?.message);
            setEmail("");
            setName("");
            await result.refresh();
            toast.notify("Administrator invitation sent.");
          } catch (e) {
            toast.notify((e as Error).message, true);
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          Administrator name
          <input
            required
            minLength={3}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label>
          Email address
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label>
          Role
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
          >
            {Object.entries(roleLabels).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <button disabled={busy}>Send secure invitation</button>
      </form>
      {result.loading ? (
        <Loading />
      ) : (
        result.data?.map((a) => (
          <article className="panel" key={a.user_id}>
            <div className="actions">
              <h3>{a.display_name || "Administrator"}</h3>
              {a.is_developer && <Verified />}
              <Badge value={a.role} />
            </div>
            <p className="muted">
              Provisioned {new Date(a.created_at).toLocaleDateString()}
            </p>
            {!a.is_developer && (
              <div className="actions">
                <select
                  aria-label={`Role for ${a.display_name}`}
                  value={a.role}
                  onChange={(e) => setChange({ user: a, role: e.target.value })}
                >
                  {Object.entries(roleLabels).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
                <button
                  className="danger"
                  onClick={() => setChange({ user: a, role: null })}
                >
                  Remove administrator access
                </button>
              </div>
            )}
          </article>
        ))
      )}
      {change && (
        <Confirm
          title="Update administrator permissions?"
          onClose={() => setChange(null)}
          onConfirm={async () => {
            await rpc("set_administrator", {
              target_user: change.user.user_id,
              new_role: change.role,
            });
            await result.refresh();
            toast.notify("Administrator permissions updated.");
          }}
        >
          <p>
            {change.user.display_name}:{" "}
            {change.role
              ? roleLabels[change.role as Role]
              : "Remove administrator role"}
          </p>
        </Confirm>
      )}
    </>
  );
}
type ControlSettings = Settings & {
  developer_bio: string;
  developer_photo_path: string | null;
};
export function SystemControlCenter() {
  const auth = useAuth();
  const result = useData(async () => {
    const { data, error } = await supabase
      .from("registration_settings")
      .select("*")
      .single();
    if (error) throw error;
    return data as ControlSettings;
  }, ["registration_settings"]);
  const students = useData(() => rows<Student>("students"), ["students"]);
  const corrections = useData(
    () => rows<{ status: string }>("correction_requests"),
    ["correction_requests"],
  );
  const cards = useData(
    () => rows<{ id: string }>("membership_cards"),
    ["membership_cards"],
  );
  const audits = useData(
    () =>
      rows<{
        id: string;
        actor_id: string | null;
        student_id: string | null;
        action: string;
        previous_value: unknown;
        updated_value: unknown;
        reason: string;
        created_at: string;
      }>("audit_logs"),
    ["audit_logs"],
  );
  const [form, setForm] = useState<ControlSettings | null>(null);
  const [busy, setBusy] = useState(false);
  const [auditPage, setAuditPage] = useState(1);
  const toast = useToast();
  const value = form || result.data;
  async function uploadBrand(
    file: File,
    key: "logo_path" | "developer_photo_path",
  ) {
    if (!value) return;
    setBusy(true);
    try {
      if (
        !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
        file.size > 5 * 1024 * 1024
      )
        throw new Error("Use JPEG, PNG or WebP under 5 MB");
      const bitmap = await createImageBitmap(file);
      const c = document.createElement("canvas");
      const scale = Math.min(1, 1000 / Math.max(bitmap.width, bitmap.height));
      c.width = Math.round(bitmap.width * scale);
      c.height = Math.round(bitmap.height * scale);
      c.getContext("2d")!.drawImage(bitmap, 0, 0, c.width, c.height);
      bitmap.close();
      const blob = await new Promise<Blob>((resolve) =>
        c.toBlob((b) => resolve(b!), "image/png"),
      );
      const path = `${key}/${crypto.randomUUID()}.png`;
      const { error } = await supabase.storage
        .from("branding")
        .upload(path, blob, { contentType: "image/png" });
      if (error) throw error;
      setForm({ ...value, [key]: path });
      toast.notify("Image uploaded. Save settings to apply.");
    } catch (e) {
      toast.notify((e as Error).message, true);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageTitle
        title="System Control Center"
        description="Platform operations, protected administrator access and immutable application audit records."
      />
      <p>Developed and Managed by Dev Brian {auth.developer && <Verified />}</p>
      <ErrorBox
        error={
          result.error ||
          students.error ||
          corrections.error ||
          cards.error ||
          audits.error
        }
      />
      <div className="stats-grid">
        {[
          ["Registered students", students.data?.length],
          [
            "Approved students",
            students.data?.filter((s) => s.registration_status === "approved")
              .length,
          ],
          ["Cards issued", cards.data?.length],
          [
            "Pending approvals",
            students.data?.filter((s) => s.registration_status === "pending")
              .length,
          ],
          [
            "Pending corrections",
            corrections.data?.filter((c) => c.status === "pending").length,
          ],
        ].map(([k, v]) => (
          <article className="panel stat" key={String(k)}>
            <span>{k}</span>
            <b>{v ?? "—"}</b>
          </article>
        ))}
      </div>
      {value && (
        <form
          className="panel form-grid"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            try {
              await rpc("update_settings", { payload: value });
              setForm(null);
              await result.refresh();
              toast.notify("System settings saved.");
            } catch (e) {
              toast.notify((e as Error).message, true);
            } finally {
              setBusy(false);
            }
          }}
        >
          <h2>Registration & branding settings</h2>
          <label className="check">
            <input
              type="checkbox"
              checked={value.registration_open}
              onChange={(e) =>
                setForm({ ...value, registration_open: e.target.checked })
              }
            />
            Registration is open
          </label>
          <div className="form-grid two-col">
            <label>
              Academic year
              <input
                required
                value={value.academic_year}
                onChange={(e) =>
                  setForm({ ...value, academic_year: e.target.value })
                }
              />
            </label>
            <label>
              Expected population (optional)
              <input
                type="number"
                min={1}
                value={value.expected_population ?? ""}
                onChange={(e) =>
                  setForm({
                    ...value,
                    expected_population: e.target.value
                      ? Number(e.target.value)
                      : null,
                  })
                }
              />
            </label>
            <label>
              Public support email
              <input
                type="email"
                value={value.support_email}
                onChange={(e) =>
                  setForm({ ...value, support_email: e.target.value })
                }
              />
            </label>
            <label>
              Approved class contact
              <input
                maxLength={160}
                value={value.class_contact}
                onChange={(e) =>
                  setForm({ ...value, class_contact: e.target.value })
                }
              />
            </label>
            <label>
              Authorized class logo
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                disabled={busy}
                onChange={(e) => {
                  if (e.target.files?.[0])
                    void uploadBrand(e.target.files[0], "logo_path");
                }}
              />
            </label>
            <label>
              Developer photograph (optional)
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                disabled={busy}
                onChange={(e) => {
                  if (e.target.files?.[0])
                    void uploadBrand(e.target.files[0], "developer_photo_path");
                }}
              />
            </label>
          </div>
          <label>
            Developer biography
            <textarea
              value={value.developer_bio}
              onChange={(e) =>
                setForm({ ...value, developer_bio: e.target.value })
              }
            />
          </label>
          <label>
            Privacy notice
            <textarea
              required
              minLength={30}
              value={value.privacy_notice}
              onChange={(e) =>
                setForm({ ...value, privacy_notice: e.target.value })
              }
            />
          </label>
          <p className="muted">
            Upload official KMTC branding only with authorization. Branding
            uploads are publicly accessible. Do not upload private files.
          </p>
          <button disabled={busy}>Save system settings</button>
        </form>
      )}
      <h2>Recent system & administrator activity</h2>
      <div className="panel table-wrap">
        <table>
          <thead>
            <tr>
              <th>Time</th>
              <th>Actor</th>
              <th>Student</th>
              <th>Action</th>
              <th>Previous value</th>
              <th>Updated value</th>
              <th>Reason</th>
            </tr>
          </thead>
          <tbody>
            {audits.data
              ?.slice((auditPage - 1) * 25, auditPage * 25)
              .map((a) => (
                <tr key={a.id}>
                  <td>{new Date(a.created_at).toLocaleString()}</td>
                  <td>{a.actor_id || "Provisioning"}</td>
                  <td>{a.student_id || "—"}</td>
                  <td>{a.action}</td>
                  <td>
                    <code>{JSON.stringify(a.previous_value)}</code>
                  </td>
                  <td>
                    <code>{JSON.stringify(a.updated_value)}</code>
                  </td>
                  <td>{a.reason}</td>
                </tr>
              ))}
          </tbody>
        </table>
        <div className="pagination">
          <button
            className="secondary"
            disabled={auditPage === 1}
            onClick={() => setAuditPage(auditPage - 1)}
          >
            Previous
          </button>
          <span>Page {auditPage}</span>
          <button
            className="secondary"
            disabled={auditPage * 25 >= (audits.data?.length || 0)}
            onClick={() => setAuditPage(auditPage + 1)}
          >
            Next
          </button>
        </div>
      </div>
      <section className="panel">
        <h3>System information</h3>
        <p>MedEng Y2S1 Class Portal v1.0.0 · React + Supabase</p>
        <p>
          System Developer: Dev Brian · Platform Manager · Lead System Operator
          · Super Administrator
        </p>
        <p>
          Backend row-level policies and permission checks authorize every
          administrative operation. Check Supabase infrastructure monitoring for
          availability and backups.
        </p>
      </section>
    </>
  );
}
