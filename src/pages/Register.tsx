import { ownProfile } from "../services/profileService";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, Navigate } from "react-router-dom";
import {
  registrationSchema,
  type RegistrationInput,
} from "../utils/validation";
import { useAuth } from "../contexts/AuthContext";
import {
  myStudent,
  submitStudent,
  uploadPhoto,
} from "../services/studentService";
import { supabase } from "../services/supabase";
import {
  useData,
  Loading,
  ErrorBox,
  PageTitle,
  Confirm,
} from "../components/common";
import type { Settings } from "../types";
const steps = [
  "Personal",
  "Academic",
  "Contact",
  "Emergency",
  "Declaration",
  "Review",
];
const stepFields: (keyof RegistrationInput)[][] = [
  ["full_name", "gender", "date_of_birth"],
  ["registration_number", "admission_year"],
  ["email", "phone", "county", "town"],
  ["emergency_name", "emergency_relationship", "emergency_phone"],
  ["declaration", "consent"],
  [],
];
export function Register() {
  const auth = useAuth();
  const existing = useData(myStudent);
  const profile = useData(ownProfile, ["profiles"]);
  const settings = useData(async () => {
    const { data, error } = await supabase
      .from("registration_settings")
      .select("*")
      .single();
    if (error) throw error;
    return data as Settings;
  }, ["registration_settings"]);
  const [step, setStep] = useState(0);
  const [photo, setPhoto] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [done, setDone] = useState(false);
  const form = useForm<RegistrationInput>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      full_name: auth.session?.user.user_metadata.full_name || "",
      email: auth.session?.user.email || "",
      admission_year: new Date().getFullYear() - 1,
      gender: "Male",
    },
  });
  if (existing.loading || settings.loading || profile.loading)
    return <Loading />;
  if (existing.error || settings.error || profile.error)
    return (
      <ErrorBox error={existing.error || settings.error || profile.error} />
    );
  if (existing.data && !done) return <Navigate to="/student/profile" replace />;
  if (!existing.data && !profile.data?.activated_at)
    return <Navigate to="/student/setup" replace />;
  if (done)
    return (
      <section className="panel">
        <h1>Registration submitted successfully</h1>
        <p>
          Your unique membership reference has been generated. Your record is
          now locked and awaiting administrator approval.
        </p>
        <Link className="button" to="/student">
          Open dashboard
        </Link>
      </section>
    );
  const field = (
    key: keyof RegistrationInput,
    label: string,
    type = "text",
    optional = false,
  ) => (
    <label>
      {label}
      {optional ? " (optional)" : ""}
      <input
        type={type}
        {...form.register(
          key,
          type === "number" ? { valueAsNumber: true } : {},
        )}
        readOnly={key === "email"}
        maxLength={key === "registration_number" ? 50 : 160}
      />
      {form.formState.errors[key] && (
        <small className="field-error">
          {form.formState.errors[key]?.message}
        </small>
      )}
    </label>
  );
  return (
    <>
      <PageTitle
        title="Class registration"
        description="Complete your verified class record. You can review every detail before submission."
      />
      {!settings.data?.registration_open ? (
        <div className="notice">Registration is currently closed.</div>
      ) : (
        <>
          <div className="stepper">
            {steps.map((s, i) => (
              <span
                key={s}
                className={i === step ? "current" : i < step ? "complete" : ""}
              >
                <b>{i + 1}</b>
                {s}
              </span>
            ))}
          </div>
          <form
            className="panel"
            onSubmit={(e) => {
              e.preventDefault();
              void (async () => {
                if (await form.trigger(stepFields[step])) {
                  if (step < 5) setStep(step + 1);
                  else if (await form.trigger()) setConfirm(true);
                }
              })();
            }}
          >
            <h2>{steps[step]} information</h2>
            <div className="form-grid two-col">
              {step === 0 && (
                <>
                  {field("full_name", "Full name")}
                  <label>
                    Gender
                    <select {...form.register("gender")}>
                      {["Male", "Female", "Other", "Prefer not to say"].map(
                        (g) => (
                          <option key={g}>{g}</option>
                        ),
                      )}
                    </select>
                  </label>
                  {field("date_of_birth", "Date of birth", "date", true)}
                  <label>
                    Profile photograph (your activated photo is used by default)
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={(e) => setPhoto(e.target.files?.[0] || null)}
                    />
                    <small>
                      JPEG, PNG or WebP, up to 5 MB. Metadata is removed before
                      storage.
                    </small>
                  </label>
                </>
              )}
              {step === 1 && (
                <>
                  {field("registration_number", "Registration number")}
                  {field("admission_year", "Admission year", "number")}
                  <div className="notice full">
                    KMTC • Medical Engineering • Year 2 • Semester 1 •{" "}
                    {settings.data?.academic_year}
                  </div>
                </>
              )}
              {step === 2 && (
                <>
                  {field("email", "Verified account email", "email")}
                  {field("phone", "Phone number", "tel")}
                  {field("county", "County")}
                  {field("town", "Town / residence area")}
                </>
              )}
              {step === 3 && (
                <>
                  {field(
                    "emergency_name",
                    "Emergency contact name",
                    "text",
                    true,
                  )}
                  {field(
                    "emergency_relationship",
                    "Relationship",
                    "text",
                    true,
                  )}
                  {field(
                    "emergency_phone",
                    "Emergency contact phone",
                    "tel",
                    true,
                  )}
                </>
              )}
              {step === 4 && (
                <div className="full">
                  <div className="notice prewrap">
                    {settings.data?.privacy_notice}
                  </div>
                  <label className="check">
                    <input type="checkbox" {...form.register("declaration")} />I
                    declare that the submitted information is accurate.
                  </label>
                  <label className="check">
                    <input type="checkbox" {...form.register("consent")} />I
                    consent to processing for class population management and
                    the stated public membership verification.
                  </label>
                  {["consent", "declaration"].map((k) => (
                    <small className="field-error" key={k}>
                      {
                        form.formState.errors[k as keyof RegistrationInput]
                          ?.message
                      }
                    </small>
                  ))}
                  <p>
                    Submitted records are locked. Corrections require
                    administrator review.
                  </p>
                </div>
              )}
              {step === 5 && (
                <div className="full">
                  {Object.entries(form.getValues())
                    .filter(([k]) => !["declaration", "consent"].includes(k))
                    .map(([k, v]) => (
                      <div className="detail-row" key={k}>
                        <span>{k.replaceAll("_", " ")}</span>
                        <b>{String(v || "Not provided")}</b>
                      </div>
                    ))}
                  <p>
                    Photo: {photo?.name || "Activated recognition photograph"}
                  </p>
                  <p>KMTC • Medical Engineering • Year 2 Semester 1</p>
                </div>
              )}
            </div>
            <ErrorBox error={error} />
            <div className="actions form-actions">
              {step > 0 && (
                <button
                  type="button"
                  className="secondary"
                  onClick={() => setStep(step - 1)}
                >
                  Back
                </button>
              )}
              <button type="submit">
                {step === 5 ? "Submit registration" : "Continue"}
              </button>
            </div>
          </form>
          {confirm && (
            <Confirm
              title="Submit and lock your official record?"
              onClose={() => setConfirm(false)}
              onConfirm={async () => {
                try {
                  const values = form.getValues();
                  let path: string | null = null;
                  if (photo)
                    path = await uploadPhoto(photo, auth.session!.user.id);
                  try {
                    await submitStudent({ ...values, photo_path: path });
                  } catch (e) {
                    if (path)
                      await supabase.storage
                        .from("student-photos")
                        .remove([path]);
                    throw e;
                  }
                  setDone(true);
                } catch (e) {
                  setError((e as Error).message);
                  throw e;
                }
              }}
            >
              <p>
                Verify all information carefully. Changes after submission
                require an administrator-approved correction request.
              </p>
            </Confirm>
          )}
        </>
      )}
    </>
  );
}
