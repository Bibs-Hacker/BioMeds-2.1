export type Role =
  | "super_admin"
  | "class_representative"
  | "assistant_representative"
  | "data_officer";
export type Student = {
  id: string;
  user_id: string;
  full_name: string;
  registration_number: string;
  gender: string;
  date_of_birth: string | null;
  photo_path: string | null;
  admission_year: number;
  email: string;
  phone: string;
  county: string;
  town: string;
  emergency_name: string | null;
  emergency_relationship: string | null;
  emergency_phone: string | null;
  course: string;
  institution: string;
  academic_level: number;
  semester: number;
  academic_year: string;
  registration_status: "pending" | "approved" | "rejected";
  membership_status: "inactive" | "active" | "suspended" | "revoked";
  membership_id: string;
  created_at: string;
  updated_at: string;
};
export type Announcement = {
  id: string;
  title: string;
  body: string;
  category: string;
  is_public: boolean;
  state: string;
  publish_at: string;
  created_at: string;
};
export type Correction = {
  id: string;
  student_id: string;
  field_name: string;
  previous_value: string | null;
  requested_value: string;
  reason: string;
  status: string;
  review_note: string | null;
  created_at: string;
};
export type Settings = {
  registration_open: boolean;
  academic_year: string;
  expected_population: number | null;
  support_email: string;
  class_contact: string;
  logo_path: string | null;
  privacy_notice: string;
};
export const roleLabels: Record<Role, string> = {
  super_admin: "Super Administrator",
  class_representative: "Class Representative",
  assistant_representative: "Assistant Class Representative",
  data_officer: "Data Officer",
};
export const permissions: Record<Role, string[]> = {
  super_admin: [
    "view",
    "approve",
    "correct",
    "announce",
    "academic",
    "feedback",
    "report",
    "roles",
    "settings",
    "audit",
  ],
  class_representative: [
    "view",
    "approve",
    "announce",
    "report",
    "academic",
    "feedback",
  ],
  assistant_representative: ["view", "approve"],
  data_officer: ["view", "correct", "report"],
};
