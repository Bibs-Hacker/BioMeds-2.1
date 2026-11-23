import { z } from "zod";
export const registrationSchema = z.object({
  full_name: z.string().trim().min(3).max(120),
  gender: z.enum(["Male", "Female", "Other", "Prefer not to say"]),
  date_of_birth: z
    .string()
    .optional()
    .refine(
      (v) => !v || v <= new Date().toISOString().slice(0, 10),
      "Date of birth cannot be in the future",
    ),
  registration_number: z
    .string()
    .trim()
    .min(3)
    .max(50)
    .regex(/^[A-Za-z0-9/._-]+$/, "Use letters, numbers, /, ., _, or -"),
  admission_year: z
    .number()
    .int()
    .min(2000)
    .max(new Date().getFullYear() + 1),
  email: z.string().email(),
  phone: z.string().regex(/^\+?[0-9 ()-]{7,20}$/, "Enter a valid phone number"),
  county: z.string().trim().min(2).max(80),
  town: z.string().trim().min(2).max(120),
  emergency_name: z.string().max(120).optional(),
  emergency_relationship: z.string().max(80).optional(),
  emergency_phone: z
    .string()
    .optional()
    .refine(
      (v) => !v || /^\+?[0-9 ()-]{7,20}$/.test(v),
      "Enter a valid phone number",
    ),
  declaration: z.literal(true, { error: "Confirm the accuracy declaration" }),
  consent: z.literal(true, { error: "Consent is required to register" }),
});
export type RegistrationInput = z.infer<typeof registrationSchema>;
export const editableFields = [
  "full_name",
  "registration_number",
  "gender",
  "date_of_birth",
  "admission_year",
  "email",
  "phone",
  "county",
  "town",
  "emergency_name",
  "emergency_relationship",
  "emergency_phone",
] as const;
