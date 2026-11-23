import { supabase, rpc } from "./supabase";
import type { Student } from "../types";
export async function myStudent() {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!user) return null;
  const { data, error } = await supabase
    .from("students")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) throw error;
  return data as Student | null;
}
export const submitStudent = (payload: Record<string, unknown>) =>
  rpc<string>("submit_registration", { payload });
export const decideStudent = (
  studentId: string,
  status: string,
  reason: string,
) =>
  rpc("decide_registration", {
    student_id: studentId,
    decision: status,
    reason,
  });
export const membershipStatus = (
  studentId: string,
  status: string,
  reason: string,
) =>
  rpc("set_membership_status", {
    student_id: studentId,
    new_status: status,
    reason,
  });
export const requestCorrection = (
  studentId: string,
  field: string,
  value: string,
  reason: string,
) =>
  rpc("request_correction", {
    student_id: studentId,
    field_name: field,
    requested_value: value,
    reason,
  });
export const reviewCorrection = (id: string, approve: boolean, note: string) =>
  rpc("review_correction", { request_id: id, approve, review_note: note });
export async function signedPhoto(path: string | null) {
  if (!path) return null;
  const { data, error } = await supabase.storage
    .from("student-photos")
    .createSignedUrl(path, 180);
  if (error) throw error;
  return data.signedUrl;
}
export async function uploadPhoto(file: File, userId: string) {
  if (
    !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
    file.size > 5 * 1024 * 1024
  )
    throw new Error("Choose a JPEG, PNG or WebP photo under 5 MB.");
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  const scale = Math.min(1, 800 / Math.max(bitmap.width, bitmap.height));
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Unable to process photo"))),
      "image/jpeg",
      0.88,
    ),
  );
  const path = `${userId}/${crypto.randomUUID()}.jpg`;
  const { error } = await supabase.storage
    .from("student-photos")
    .upload(path, blob, { contentType: "image/jpeg", upsert: false });
  if (error) throw error;
  return path;
}
