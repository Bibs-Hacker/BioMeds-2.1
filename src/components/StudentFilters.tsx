import type { Student } from "../types";
export type Filters = {
  search: string;
  gender: string;
  county: string;
  admission_year: string;
  academic_year: string;
  semester: string;
  registration_status: string;
};
export const emptyFilters: Filters = {
  search: "",
  gender: "",
  county: "",
  admission_year: "",
  academic_year: "",
  semester: "",
  registration_status: "",
};
export function filterStudents(students: Student[], filters: Filters) {
  return students.filter((s) =>
    Object.entries(filters).every(
      ([k, v]) =>
        !v ||
        (k === "search"
          ? `${s.full_name} ${s.registration_number}`
              .toLowerCase()
              .includes(v.toLowerCase())
          : String(s[k as keyof Student]) === v),
    ),
  );
}
export function StudentFilters({
  students,
  value,
  onChange,
}: {
  students: Student[];
  value: Filters;
  onChange: (v: Filters) => void;
}) {
  return (
    <div className="filters panel">
      <label>
        Search
        <input
          placeholder="Name or registration number"
          value={value.search}
          onChange={(e) => onChange({ ...value, search: e.target.value })}
        />
      </label>
      {(
        [
          "gender",
          "county",
          "admission_year",
          "academic_year",
          "semester",
          "registration_status",
        ] as const
      ).map((k) => (
        <label key={k}>
          {k.replaceAll("_", " ")}
          <select
            value={value[k]}
            onChange={(e) => onChange({ ...value, [k]: e.target.value })}
          >
            <option value="">All</option>
            {[...new Set(students.map((s) => String(s[k])))].sort().map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </label>
      ))}
      <button className="secondary" onClick={() => onChange(emptyFilters)}>
        Reset
      </button>
    </div>
  );
}
