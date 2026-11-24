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
  const { sanitizePhoto } = await import("../utils/images");
  const blob = await sanitizePhoto(file);
  const path = `${userId}/${crypto.randomUUID()}.jpg`;
  const { error } = await supabase.storage
    .from("student-photos")
    .upload(path, blob, { contentType: "image/jpeg", upsert: false });
  if (error) throw error;
  return path;
}
