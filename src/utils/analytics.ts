import type { Student } from "../types";
export const groupBy = (students: Student[], key: keyof Student) =>
  Object.entries(
    students.reduce<Record<string, number>>((a, s) => {
      const k = String(s[key] ?? "Not provided");
      a[k] = (a[k] || 0) + 1;
      return a;
    }, {}),
  ).map(([name, value]) => ({ name, value }));
export function summarize(students: Student[], issued: number) {
  return {
    "Registered population": students.length,
    "Approved students": students.filter(
      (s) => s.registration_status === "approved",
    ).length,
    "Pending registrations": students.filter(
      (s) => s.registration_status === "pending",
    ).length,
    "Rejected registrations": students.filter(
      (s) => s.registration_status === "rejected",
    ).length,
    "Active memberships": students.filter(
      (s) => s.membership_status === "active",
    ).length,
    "Inactive memberships": students.filter(
      (s) => s.membership_status === "inactive",
    ).length,
    "Male population": students.filter((s) => s.gender === "Male").length,
    "Female population": students.filter((s) => s.gender === "Female").length,
    "Cards issued": issued,
  };
}
export const trends = (students: Student[]) =>
  Object.entries(
    students.reduce<Record<string, number>>((a, s) => {
      const d = s.created_at.slice(0, 10);
      a[d] = (a[d] || 0) + 1;
      return a;
    }, {}),
  )
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, value]) => ({ name, value }));
