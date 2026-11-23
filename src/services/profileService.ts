import { supabase, rpc } from "./supabase";
export type Profile = {
  id: string;
  display_name: string;
  account_photo_path: string | null;
  activated_at: string | null;
  privacy_version: number | null;
  terms_version: number | null;
};
export async function ownProfile(): Promise<Profile | null> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error) throw error;
  if (!user) return null;
  const { data, error: e } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  if (e) throw e;
  return data;
}
export const activateProfile = (
  photo: string,
  privacy: number,
  terms: number,
) =>
  rpc("activate_profile", {
    photo_path: photo,
    privacy_ver: privacy,
    terms_ver: terms,
    accepted: true,
  });
// Local photo staging avoids public unauthenticated Storage uploads. No credentials
// are stored in this cache. Email verification on another device requires a new file.
function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("medeng-photo-stage", 1);
    req.onupgradeneeded = () => req.result.createObjectStore("photos");
    req.onsuccess = () => resolve(req.result);
    req.onerror = () =>
      reject(
        new Error(
          "Your browser cannot stage this photo. Enable local storage or use another browser.",
        ),
      );
  });
}
export async function stagePhoto(email: string, blob: Blob) {
  const db = await database();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction("photos", "readwrite");
    tx.objectStore("photos").put(
      { blob, expires: Date.now() + 48 * 3600000 },
      email.trim().toLowerCase(),
    );
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(new Error("Unable to stage your photo"));
  });
  db.close();
}
export async function stagedPhoto(email: string): Promise<File | null> {
  const db = await database();
  const record = await new Promise<{ blob: Blob; expires: number } | undefined>(
    (resolve, reject) => {
      const req = db
        .transaction("photos")
        .objectStore("photos")
        .get(email.trim().toLowerCase());
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    },
  );
  db.close();
  if (!record) return null;
  if (record.expires < Date.now()) {
    await clearStagedPhoto(email);
    return null;
  }
  return new File([record.blob], "recognition.jpg", { type: "image/jpeg" });
}
export async function clearStagedPhoto(email: string) {
  const db = await database();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction("photos", "readwrite");
    tx.objectStore("photos").delete(email.trim().toLowerCase());
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}
