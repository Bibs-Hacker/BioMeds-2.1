import { describe, it, expect } from "vitest";
import { registrationSchema } from "../src/utils/validation";
import { summarize, groupBy, trends } from "../src/utils/analytics";
import { filterStudents, emptyFilters } from "../src/components/StudentFilters";
import { permissions, type Student } from "../src/types";
const valid = {
  full_name: "Test Student",
  gender: "Male",
  date_of_birth: "",
  registration_number: "ME/001",
  admission_year: 2025,
  email: "student@example.test",
  phone: "+254700000001",
  county: "Nairobi",
  town: "Town",
  declaration: true,
  consent: true,
};
const students = [
  {
    ...valid,
    id: "a",
    registration_status: "approved",
    membership_status: "active",
    academic_year: "2026/2027",
    semester: 1,
    created_at: "2026-01-01T10:00:00Z",
  },
  {
    ...valid,
    id: "b",
    gender: "Female",
    registration_number: "ME/002",
    registration_status: "pending",
    membership_status: "inactive",
    county: "Mombasa",
    academic_year: "2026/2027",
    semester: 1,
    created_at: "2026-01-02T10:00:00Z",
  },
] as Student[];
describe("Registration validation", () => {
  it("accepts a complete valid record", () =>
    expect(registrationSchema.safeParse(valid).success).toBe(true));
  it.each([
    "full_name",
    "registration_number",
    "email",
    "phone",
    "county",
    "town",
  ])("rejects an invalid %s", (field) =>
    expect(
      registrationSchema.safeParse({ ...valid, [field]: "" }).success,
    ).toBe(false),
  );
  it.each(["declaration", "consent"])("requires %s", (field) =>
    expect(
      registrationSchema.safeParse({ ...valid, [field]: false }).success,
    ).toBe(false),
  );
  it("rejects future birth date", () =>
    expect(
      registrationSchema.safeParse({ ...valid, date_of_birth: "2099-01-01" })
        .success,
    ).toBe(false));
  it("rejects registration injection characters", () =>
    expect(
      registrationSchema.safeParse({
        ...valid,
        registration_number: "<script>",
      }).success,
    ).toBe(false));
  it("rejects invalid emergency phone", () =>
    expect(
      registrationSchema.safeParse({ ...valid, emergency_phone: "bad" })
        .success,
    ).toBe(false));
});
describe("Population calculations", () => {
  it("counts unique record rows without card joins multiplying population", () =>
    expect(summarize(students, 1)).toMatchObject({
      "Registered population": 2,
      "Approved students": 1,
      "Pending registrations": 1,
      "Active memberships": 1,
      "Male population": 1,
      "Female population": 1,
      "Cards issued": 1,
    }));
  it("group totals equal the filtered population", () =>
    expect(groupBy(students, "county").reduce((a, b) => a + b.value, 0)).toBe(
      2,
    ));
  it("sorts registration dates", () =>
    expect(trends([...students].reverse()).map((t) => t.name)).toEqual([
      "2026-01-01",
      "2026-01-02",
    ]));
  it("combines filters with search", () =>
    expect(
      filterStudents(students, {
        ...emptyFilters,
        gender: "Female",
        search: "me/002",
        county: "Mombasa",
      }),
    ).toHaveLength(1));
  it("does not fake empty counts", () =>
    expect(summarize([], 0)["Registered population"]).toBe(0));
});
describe("Role map mirrors backend policy", () => {
  it("only super administrators manage roles", () =>
    expect(
      Object.keys(permissions).filter((k) =>
        permissions[k as keyof typeof permissions].includes("roles"),
      ),
    ).toEqual(["super_admin"]));
  it("data officers cannot approve registrations", () =>
    expect(permissions.data_officer).not.toContain("approve"));
  it("assistants cannot export or publish", () => {
    expect(permissions.assistant_representative).not.toContain("report");
    expect(permissions.assistant_representative).not.toContain("announce");
  });
});

import { normalizeAppearance } from "../src/contexts/AppearanceContext";
describe("appearance input validation", () => {
  it("rejects unknown cached values", () => {
    expect(
      normalizeAppearance({
        theme: "invalid",
        font: "invalid",
        size: "invalid",
      } as never),
    ).toEqual({
      theme: "system",
      font: "system",
      size: "standard",
      density: "comfortable",
      motion: "system",
    });
  });
  it("handles null browser cache safely", () => {
    expect(normalizeAppearance(null as never).theme).toBe("system");
  });
  it("retains supported accessibility choices", () => {
    expect(
      normalizeAppearance({
        theme: "contrast",
        font: "serif",
        size: "large",
        motion: "reduced",
      }).size,
    ).toBe("large");
  });
});
