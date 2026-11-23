import { useState } from "react";
import { BookOpen, GraduationCap } from "lucide-react";
import { rows, rpc } from "../services/supabase";
import { useAuth } from "../contexts/AuthContext";
import {
  useData,
  Loading,
  Empty,
  ErrorBox,
  PageTitle,
  Confirm,
  useToast,
  Badge,
} from "../components/common";
type Lecturer = {
  id: string;
  full_name: string;
  professional_title: string;
  institutional_email: string | null;
  office: string;
  active: boolean;
};
type Unit = {
  id: string;
  code: string;
  name: string;
  academic_year: string;
  semester: number;
  description: string;
};
type Assignment = { lecturer_id: string; unit_id: string };
const lecturerDefaults = {
  full_name: "",
  professional_title: "Lecturer",
  institutional_email: "",
  office: "",
  active: true,
};
const unitDefaults = {
  code: "",
  name: "",
  academic_year: "2026/2027",
  description: "",
};
export function Academics({ manage = false }: { manage?: boolean }) {
  const auth = useAuth();
  const toast = useToast();
  const lecturers = useData(() => rows<Lecturer>("lecturers"), ["lecturers"]);
  const units = useData(() => rows<Unit>("teaching_units"), ["teaching_units"]);
  const assignments = useData(
    () => rows<Assignment>("lecturer_unit_assignments"),
    ["lecturer_unit_assignments"],
  );
  const [search, setSearch] = useState("");
  const [lf, setLf] = useState(lecturerDefaults);
  const [uf, setUf] = useState(unitDefaults);
  const [lid, setLid] = useState<string | null>(null);
  const [tid, setTid] = useState<string | null>(null);
  const [deleteItem, setDeleteItem] = useState<{
    kind: string;
    id: string;
    name: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [assignL, setAssignL] = useState("");
  const [assignU, setAssignU] = useState("");
  const edit = manage && auth.can("academic");
  async function act(fn: () => Promise<unknown>) {
    setBusy(true);
    try {
      await fn();
      await Promise.all([
        lecturers.refresh(),
        units.refresh(),
        assignments.refresh(),
      ]);
      toast.notify("Academic directory updated.");
    } catch (e) {
      toast.notify((e as Error).message, true);
    } finally {
      setBusy(false);
    }
  }
  const matching = (units.data || []).filter((u) =>
    `${u.code} ${u.name} ${u.description} ${(assignments.data || [])
      .filter((a) => a.unit_id === u.id)
      .map(
        (a) => lecturers.data?.find((l) => l.id === a.lecturer_id)?.full_name,
      )
      .join(" ")}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  return (
    <>
      <PageTitle
        title={edit ? "Lecturers & teaching units" : "Lecturers & units"}
        description="Approved class academic information, available to every signed-in student."
      />
      <ErrorBox error={lecturers.error || units.error || assignments.error} />
      <div className="panel">
        <label>
          Search units or lecturers
          <input
            placeholder="Unit code, subject or lecturer name"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
      </div>
      {edit && (
        <>
          <div className="chart-grid">
            <form
              className="panel form-grid"
              onSubmit={(e) => {
                e.preventDefault();
                void act(async () => {
                  await rpc("save_lecturer", { payload: lf, lecturer_id: lid });
                  setLf(lecturerDefaults);
                  setLid(null);
                });
              }}
            >
              <h2>{lid ? "Edit lecturer" : "Add lecturer"}</h2>
              <label>
                Lecturer full name
                <input
                  required
                  minLength={3}
                  maxLength={120}
                  value={lf.full_name}
                  onChange={(e) => setLf({ ...lf, full_name: e.target.value })}
                />
              </label>
              <label>
                Professional title
                <input
                  required
                  maxLength={120}
                  value={lf.professional_title}
                  onChange={(e) =>
                    setLf({ ...lf, professional_title: e.target.value })
                  }
                />
              </label>
              <label>
                Approved institutional email (optional)
                <input
                  type="email"
                  value={lf.institutional_email}
                  onChange={(e) =>
                    setLf({ ...lf, institutional_email: e.target.value })
                  }
                />
              </label>
              <label>
                Office / approved consultation location
                <input
                  maxLength={160}
                  value={lf.office}
                  onChange={(e) => setLf({ ...lf, office: e.target.value })}
                />
              </label>
              <label className="check">
                <input
                  type="checkbox"
                  checked={lf.active}
                  onChange={(e) => setLf({ ...lf, active: e.target.checked })}
                />
                Active lecturer
              </label>
              <div className="actions">
                <button disabled={busy}>Save lecturer</button>
                {lid && (
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => {
                      setLid(null);
                      setLf(lecturerDefaults);
                    }}
                  >
                    Cancel edit
                  </button>
                )}
              </div>
            </form>
            <form
              className="panel form-grid"
              onSubmit={(e) => {
                e.preventDefault();
                void act(async () => {
                  await rpc("save_unit", { payload: uf, unit_id: tid });
                  setUf(unitDefaults);
                  setTid(null);
                });
              }}
            >
              <h2>{tid ? "Edit unit" : "Add teaching unit"}</h2>
              <label>
                Unit code
                <input
                  required
                  minLength={2}
                  maxLength={30}
                  value={uf.code}
                  onChange={(e) => setUf({ ...uf, code: e.target.value })}
                />
              </label>
              <label>
                Unit name
                <input
                  required
                  minLength={3}
                  maxLength={160}
                  value={uf.name}
                  onChange={(e) => setUf({ ...uf, name: e.target.value })}
                />
              </label>
              <label>
                Academic year
                <input
                  required
                  pattern="[0-9]{4}/[0-9]{4}"
                  value={uf.academic_year}
                  onChange={(e) =>
                    setUf({ ...uf, academic_year: e.target.value })
                  }
                />
              </label>
              <label>
                Description
                <textarea
                  maxLength={2000}
                  value={uf.description}
                  onChange={(e) =>
                    setUf({ ...uf, description: e.target.value })
                  }
                />
              </label>
              <div className="actions">
                <button disabled={busy}>Save unit</button>
                {tid && (
                  <button
                    className="secondary"
                    type="button"
                    onClick={() => {
                      setTid(null);
                      setUf(unitDefaults);
                    }}
                  >
                    Cancel edit
                  </button>
                )}
              </div>
            </form>
          </div>
          <form
            className="panel form-grid two-col"
            onSubmit={(e) => {
              e.preventDefault();
              void act(() =>
                rpc("assign_unit", {
                  lecturer_id: assignL,
                  unit_id: assignU,
                  assigned: true,
                }),
              );
            }}
          >
            <label>
              Assign lecturer
              <select
                required
                value={assignL}
                onChange={(e) => setAssignL(e.target.value)}
              >
                <option value="">Select lecturer</option>
                {lecturers.data?.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.full_name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Teaching unit
              <select
                required
                value={assignU}
                onChange={(e) => setAssignU(e.target.value)}
              >
                <option value="">Select unit</option>
                {units.data?.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.code} — {u.name}
                  </option>
                ))}
              </select>
            </label>
            <button disabled={busy}>Assign lecturer to unit</button>
            <p className="muted">
              A unit may have multiple lecturers. Publish only consented
              institutional contact details.
            </p>
          </form>
        </>
      )}
      {units.loading || lecturers.loading ? (
        <Loading />
      ) : (
        <div className="chart-grid">
          {matching.map((u) => (
            <article className="panel unit-card" key={u.id}>
              <div className="actions">
                <BookOpen className="teal-text" />
                <span className="badge">{u.code}</span>
                <Badge value={u.academic_year} />
              </div>
              <h2>{u.name}</h2>
              <p className="prewrap muted">
                {u.description || "Medical Engineering · Year 2 Semester 1"}
              </p>
              <h3>Teaching lecturers</h3>
              {(assignments.data || [])
                .filter((a) => a.unit_id === u.id)
                .map((a) => {
                  const l = lecturers.data?.find((l) => l.id === a.lecturer_id);
                  return l ? (
                    <div className="lecturer-row" key={l.id}>
                      <GraduationCap size={22} />
                      <div>
                        <b>{l.full_name}</b>
                        <small>
                          {l.professional_title} ·{" "}
                          {l.active ? "Active" : "Inactive"}
                        </small>
                        {l.institutional_email && (
                          <a href={`mailto:${l.institutional_email}`}>
                            {l.institutional_email}
                          </a>
                        )}
                        {l.office && <small>{l.office}</small>}
                      </div>
                      {edit && (
                        <button
                          className="secondary"
                          disabled={busy}
                          onClick={() =>
                            void act(() =>
                              rpc("assign_unit", {
                                lecturer_id: l.id,
                                unit_id: u.id,
                                assigned: false,
                              }),
                            )
                          }
                        >
                          Unassign
                        </button>
                      )}
                    </div>
                  ) : null;
                })}
              {!assignments.data?.some((a) => a.unit_id === u.id) && (
                <p className="muted">
                  Lecturer assignment awaiting confirmation.
                </p>
              )}
              {edit && (
                <div className="actions">
                  <button
                    className="secondary"
                    onClick={() => {
                      setTid(u.id);
                      setUf({
                        code: u.code,
                        name: u.name,
                        academic_year: u.academic_year,
                        description: u.description,
                      });
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                  >
                    Edit unit
                  </button>
                  <button
                    className="danger"
                    onClick={() =>
                      setDeleteItem({ kind: "unit", id: u.id, name: u.name })
                    }
                  >
                    Delete unit
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
      {!units.loading && !matching.length && (
        <Empty text="No matching teaching units published yet." />
      )}
      <h2>Lecturer directory</h2>
      <div className="chart-grid">
        {lecturers.data
          ?.filter((l) =>
            l.full_name.toLowerCase().includes(search.toLowerCase()),
          )
          .map((l) => (
            <article className="panel" key={l.id}>
              <GraduationCap className="teal-text" />
              <h3>{l.full_name}</h3>
              <p>{l.professional_title}</p>
              <Badge value={l.active ? "active" : "inactive"} />
              {l.institutional_email && (
                <p>
                  <a href={`mailto:${l.institutional_email}`}>
                    {l.institutional_email}
                  </a>
                </p>
              )}
              <p className="muted">{l.office}</p>
              {edit && (
                <div className="actions">
                  <button
                    className="secondary"
                    onClick={() => {
                      setLid(l.id);
                      setLf({
                        full_name: l.full_name,
                        professional_title: l.professional_title,
                        institutional_email: l.institutional_email || "",
                        office: l.office,
                        active: l.active,
                      });
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                  >
                    Edit lecturer
                  </button>
                  <button
                    className="danger"
                    onClick={() =>
                      setDeleteItem({
                        kind: "lecturer",
                        id: l.id,
                        name: l.full_name,
                      })
                    }
                  >
                    Delete lecturer
                  </button>
                </div>
              )}
            </article>
          ))}
      </div>
      {deleteItem && (
        <Confirm
          title={`Delete ${deleteItem.name}?`}
          onClose={() => setDeleteItem(null)}
          onConfirm={async () => {
            await rpc("delete_academic_record", {
              kind: deleteItem.kind,
              record_id: deleteItem.id,
            });
            await Promise.all([
              lecturers.refresh(),
              units.refresh(),
              assignments.refresh(),
            ]);
          }}
        >
          <p>
            This removes the academic record and linked assignments. Student
            records are not affected.
          </p>
        </Confirm>
      )}
    </>
  );
}
