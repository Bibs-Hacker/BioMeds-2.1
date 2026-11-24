import { useEffect, useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  ownProfile,
  stagedPhoto,
  clearStagedPhoto,
  activateProfile,
} from "../services/profileService";
import { uploadPhoto } from "../services/studentService";
import {
  LegalAcceptance,
  type LegalReceipt,
} from "../components/forms/LegalAcceptance";
import {
  useData,
  Loading,
  ErrorBox,
  PageTitle,
  useToast,
} from "../components/common";
import { supabase } from "../services/supabase";
import { PhotoEditor } from "../components/forms/PhotoEditor";
export function AccountSetup() {
  const auth = useAuth();
  const profile = useData(ownProfile, ["profiles"]);
  const [photo, setPhoto] = useState<File | null>(null);
  const [receipt, setReceipt] = useState<LegalReceipt | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const toast = useToast();
  useEffect(() => {
    const email = auth.session?.user.email;
    if (email && !profile.data?.account_photo_path)
      stagedPhoto(email)
        .then(setPhoto)
        .catch(() => {
          /* User can select the photo again. */
        });
  }, [auth.session?.user.email, profile.data?.account_photo_path]);
  if (done) return <Navigate to="/student/register" replace />;
  return (
    <>
      <PageTitle
        title="Activate your student account"
        description="Email verification, recognition photograph and policy acceptance are required before registration."
      />
      <ErrorBox error={profile.error} />
      {profile.loading ? (
        <Loading />
      ) : (
        <form
          className="panel form-grid narrow"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!receipt) return;
            setBusy(true);
            try {
              const path = photo
                ? await uploadPhoto(photo, auth.session!.user.id)
                : profile.data?.account_photo_path;
              if (!path) throw new Error("Select your recognition photograph.");
              try {
                await activateProfile(path, receipt.privacy, receipt.terms);
              } catch (e) {
                if (photo)
                  await supabase.storage.from("student-photos").remove([path]);
                throw e;
              }
              await clearStagedPhoto(auth.session!.user.email || "");
              setDone(true);
              toast.notify(
                "Account activated. Continue with class registration.",
              );
            } catch (e) {
              toast.notify((e as Error).message, true);
            } finally {
              setBusy(false);
            }
          }}
        >
          <p>
            Signed in as <b>{auth.session?.user.email}</b>
          </p>
          <div>
            <label>Recognition photograph (required)</label>
            <PhotoEditor value={photo} onChange={setPhoto} required={!profile.data?.account_photo_path} />
          </div>
          {profile.data?.account_photo_path && !photo && (
            <p className="notice">
              Your existing recognition photograph will be retained.
            </p>
          )}
          <small>If you verified on another gadget, select your photo again. Your edited photo is uploaded privately.</small>
          <LegalAcceptance onChange={setReceipt} />
          <button
            disabled={
              busy || !receipt || (!photo && !profile.data?.account_photo_path)
            }
          >
            Activate account and continue
          </button>
          <Link to="/student/security">
            Account security and closure options
          </Link>
        </form>
      )}
    </>
  );
}
