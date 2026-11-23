// Test-only transport fixtures. NEVER imported by production code.
import type { Page } from "@playwright/test";
export const uid = "11111111-1111-4111-8111-111111111111";
export const token = "a".repeat(64);
export const student = {
  id: "22222222-2222-4222-8222-222222222222",
  user_id: uid,
  full_name: "Test Student",
  registration_number: "ME/TEST/001",
  gender: "Male",
  date_of_birth: null,
  photo_path: uid + "/recognition.jpg",
  admission_year: 2025,
  email: "student@example.test",
  phone: "+254700000001",
  county: "Nairobi",
  town: "Town",
  emergency_name: null,
  emergency_relationship: null,
  emergency_phone: null,
  course: "Medical Engineering",
  institution: "KMTC",
  academic_level: 2,
  semester: 1,
  academic_year: "2026/2027",
  registration_status: "approved",
  membership_status: "active",
  membership_id: "ME-Y2S1-TEST000000000001",
  created_at: "2026-11-01T10:00:00Z",
  updated_at: "2026-11-01T10:00:00Z",
};
export const settings = {
  id: true,
  registration_open: true,
  academic_year: "2026/2027",
  expected_population: 40,
  support_email: "support@example.test",
  class_contact: "Class leadership",
  logo_path: null,
  developer_bio: "Test biography",
  developer_photo_path: null,
  privacy_notice:
    "Test-only consent notice: class management and minimal public membership verification.",
};
export async function authenticatedFixture(
  page: Page,
  {
    role = null,
    registered = true,
    status = "active",
    activated = true,
  }: {
    role: string | null;
    registered?: boolean;
    status?: string;
    activated?: boolean;
  },
) {
  await page.addInitScript(
    ({ uid }) => {
      const session = {
        access_token: "test-access-token",
        refresh_token: "test-refresh-token",
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        token_type: "bearer",
        user: {
          id: uid,
          email: "student@example.test",
          aud: "authenticated",
          role: "authenticated",
          app_metadata: { provider: "email" },
          user_metadata: { full_name: "Test Student" },
          email_confirmed_at: "2026-01-01T00:00:00Z",
          created_at: "2026-01-01T00:00:00Z",
        },
      };
      localStorage.setItem("sb-ui-fixture-auth-token", JSON.stringify(session));
      sessionStorage.setItem("medeng-splash", "1");
    },
    { uid },
  );
  await page.route("https://ui-fixture.supabase.co/**", async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    if (path.includes("/storage/v1/object/public/test-photo.png"))
      return route.fulfill({
        status: 200,
        contentType: "image/png",
        body: Buffer.from(
          "iVBORw0KGgoAAAANSUhEUgAAAFAAAABkCAIAAACemCBBAAAAj0lEQVR4nO3PQRHAIADAMMC/OUTwxsJcbHddoqCd+9zxJ+vrgLcZrjNcZ7jOcJ3hOsN1husM1xmuM1xnuM5wneE6w3WG6wzXGa4zXGe4znCd4TrDdYbrDNcZrjNcZ7jOcJ3hOsN1husM1xmuM1xnuM5wneE6w3WG6wzXGa4zXGe4znCd4TrDdYbrDNcZrnsAJMIDbaQ7Z9gAAAAASUVORK5CYII=",
          "base64",
        ),
      });
    let data: unknown = [];
    if (path.includes("/storage/v1/object/sign/"))
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ signedURL: "/object/public/test-photo.png" }),
      });
    if (path.includes("/auth/v1/user"))
      data = {
        id: uid,
        email: "student@example.test",
        email_confirmed_at: "2026-01-01T00:00:00Z",
        user_metadata: { full_name: "Test Student" },
      };
    else if (path.includes("/administrator_roles"))
      data = role ? { role, is_developer: role === "super_admin" } : null;
    else if (path.includes("/profiles"))
      data = {
        id: uid,
        display_name: "Test Student",
        account_photo_path: activated ? uid + "/recognition.jpg" : null,
        activated_at: activated ? student.created_at : null,
        privacy_version: activated ? 1 : null,
        terms_version: activated ? 1 : null,
      };
    else if (path.includes("/legal_documents"))
      data = url.searchParams.has("id")
        ? legalDocuments.find(
            (d) => "eq." + d.id === url.searchParams.get("id"),
          )
        : legalDocuments;
    else if (path.includes("/lecturer_unit_assignments"))
      data = [{ lecturer_id: "lecturer-test", unit_id: "unit-test" }];
    else if (path.includes("/lecturers"))
      data = [
        {
          id: "lecturer-test",
          full_name: "Test Lecturer",
          professional_title: "Senior Lecturer",
          institutional_email: "lecturer@example.test",
          office: "Lab 2",
          active: true,
          created_at: student.created_at,
        },
      ];
    else if (path.includes("/teaching_units"))
      data = [
        {
          id: "unit-test",
          code: "MEE201",
          name: "Medical Electronics",
          academic_year: "2026/2027",
          semester: 1,
          description: "Test teaching unit",
          created_at: student.created_at,
        },
      ];
    else if (path.includes("/registration_settings")) data = settings;
    else if (path.includes("/membership_cards"))
      data = url.searchParams.get("student_id")
        ? {
            id: "card-test",
            student_id: student.id,
            verification_token: token,
            issued_at: student.created_at,
          }
        : [{ student_id: student.id }];
    else if (path.includes("/students"))
      data = registered
        ? url.searchParams.has("user_id") || url.searchParams.has("id")
          ? { ...student, membership_status: status }
          : [{ ...student, membership_status: status }]
        : null;
    else if (path.includes("/rpc/report_register"))
      data = [{ ...student, membership_status: status }];
    else if (path.includes("/rpc/submit_registration")) data = student.id;
    else if (path.includes("/rpc/request_correction")) data = "request-test";
    else if (path.includes("/rpc/administrator_directory"))
      data = [
        {
          user_id: uid,
          display_name: "Dev Brian",
          role: "super_admin",
          is_developer: true,
          created_at: student.created_at,
        },
      ];
    else if (path.includes("/rpc/developer_profile"))
      data = {
        display_name: "Dev Brian",
        verified: true,
        title: "System Developer & Manager",
        position: "Lead System Operator",
        role: "Super Administrator",
        created_at: student.created_at,
        biography: "Test-only developer biography",
        photo_path: null,
      };
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify(data),
    });
  });
}

export const legalDocuments = ["privacy", "terms"].map((id) => ({
  id,
  title: id === "privacy" ? "Privacy Policy" : "Terms and Conditions",
  version: 1,
  updated_at: student.created_at,
  body:
    (id === "privacy"
      ? "Class membership cards are not official KMTC student identification cards. "
      : "This is a class coordination service. ") +
    "Read the current policy, use truthful information, protect your account and contact class support for corrections.\n\n".repeat(
      45,
    ),
}));
export async function publicFixture(page: Page) {
  await page.addInitScript(() => sessionStorage.setItem("medeng-splash", "1"));
  await page.route("https://ui-fixture.supabase.co/**", (route) => {
    const path = new URL(route.request().url()).pathname;
    const data = path.includes("/legal_documents")
      ? new URL(route.request().url()).searchParams.has("id")
        ? legalDocuments.find(
            (d) =>
              "eq." + d.id ===
              new URL(route.request().url()).searchParams.get("id"),
          )
        : legalDocuments
      : path.includes("/registration_settings")
        ? settings
        : path.includes("/rpc/developer_profile")
          ? null
          : path.includes("/rpc/verify_membership")
            ? { result: "Invalid Verification Code" }
            : [];
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify(data),
    });
  });
}
