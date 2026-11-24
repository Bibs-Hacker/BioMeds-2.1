import {
  LegalAcceptance,
  type LegalReceipt,
} from "../components/forms/LegalAcceptance";
import { sanitizePhoto } from "../utils/images";
import { stagePhoto } from "../services/profileService";
import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { supabase, appUrl, configured } from "../services/supabase";
import { useAuth } from "../contexts/AuthContext";
import { ErrorBox, PageTitle, useToast } from "../components/common";
import { PhotoEditor } from "../components/forms/PhotoEditor";
export function AuthPage({
  mode = "login",
}: {
  mode?: "login" | "signup" | "recover" | "reset";
}) {
  const [photo, setPhoto] = useState<File | null>(null);
  const [receipt, setReceipt] = useState<LegalReceipt | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);
  const [canResend, setCanResend] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const auth = useAuth();
  const loc = useLocation();
  const navigate = useNavigate();
  if (auth.session && mode === "login")
    return (
      <Navigate
        to={loc.state?.from || (auth.role ? "/admin" : "/student")}
        replace
      />
    );
  const title = {
    login: "Welcome back",
    signup: "Create your student account",
    recover: "Recover your account",
    reset: "Set a new password",
  }[mode];
  return (
    <section className="section auth-box">
      <PageTitle
        title={title}
        description="KMTC Medical Engineering • Year 2 Semester 1"
      />
      <form
        className="panel form-grid"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          setMessage("");
          try {
            if (!configured)
              throw new Error(
                "The platform has not been connected to Supabase yet.",
              );
            if (mode === "signup") {
              if (!photo || !receipt)
                throw new Error(
                  "Upload your recognition photograph, read both policies and accept them first.",
                );
              const clean = await sanitizePhoto(photo);
              await stagePhoto(email, clean);
              const { error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                  data: { full_name: name },
                  emailRedirectTo: appUrl + "/student/setup",
                },
              });
              if (error) throw error;
              setCanResend(true);
              setMessage(
                "Your sign-up request was accepted. Supabase should send a verification email if email delivery is configured and the address is eligible. Check Spam/Junk and All Mail. If it does not arrive, use Resend verification email below. Your registration remains locked until verification and activation.",
              );
            } else if (mode === "login") {
              const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
              });
              if (error) throw error;
            } else if (mode === "recover") {
              const { error } = await supabase.auth.resetPasswordForEmail(
                email,
                { redirectTo: appUrl + "/reset-password" },
              );
              if (error) throw error;
              setMessage("If an account exists, a recovery link will be sent.");
            } else {
              const { error } = await supabase.auth.updateUser({ password });
              if (error) throw error;
              navigate("/student/security");
            }
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {mode === "signup" && (
          <label>
            Full name
            <input
              required
              minLength={3}
              maxLength={120}
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
            />
          </label>
        )}
        {mode !== "reset" && (
          <label>
            Email address
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </label>
        )}
        {mode !== "recover" && (
          <label>
            Password
            <input
              required
              aria-label="Password"
              type="password"
              minLength={12}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
            />
            <small>Use at least 12 characters.</small>
          </label>
        )}
        {mode === "signup" && (
          <>
            <div>
              <label>Recognition photograph (required)</label>
              <PhotoEditor value={photo} onChange={setPhoto} required />
              <small>Edited photo is staged on this device and uploaded privately after email verification.</small>
            </div>
            <LegalAcceptance onChange={setReceipt} />
          </>
        )}
        <ErrorBox error={error} />
        {message && (
          <div className="success" role="status">
            {message}
          </div>
        )}
        {mode === "signup" && canResend && (
          <button
            type="button"
            className="secondary"
            disabled={resending || !email.trim()}
            onClick={async () => {
              setResending(true);
              setError("");
              try {
                const { error } = await supabase.auth.resend({
                  type: "signup",
                  email: email.trim(),
                  options: { emailRedirectTo: appUrl + "/student/setup" },
                });
                if (error) throw error;
                setMessage(
                  "Supabase accepted the resend request. Check Spam/Junk and All Mail. If no message arrives, ask the project administrator to inspect Authentication logs and SMTP delivery settings.",
                );
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setResending(false);
              }
            }}
          >
            {resending ? "Resending…" : "Resend verification email"}
          </button>
        )}
        <button disabled={busy || (mode === "signup" && (!photo || !receipt))}>
          {busy
            ? "Please wait…"
            : {
                login: "Sign in securely",
                signup: "Create account",
                recover: "Send recovery link",
                reset: "Save password",
              }[mode]}
        </button>
        {mode === "login" && (
          <>
            <Link to="/recover">Forgot password?</Link>
            <p>
              New to the class? <Link to="/signup">Create an account</Link>
            </p>
          </>
        )}
        {mode === "signup" && (
          <p>
            Already registered? <Link to="/login">Sign in</Link>. By creating an
            account you acknowledge the{" "}
            <Link to="/privacy">privacy notice</Link>.
          </p>
        )}
      </form>
    </section>
  );
}
export function AccountSecurity() {
  const auth = useAuth();
  const toast = useToast();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <>
      <PageTitle
        title="Account security"
        description="Manage your authentication password. Official registration details remain locked."
      />
      <form
        className="panel form-grid narrow"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            const { error } = await supabase.auth.updateUser({ password });
            if (error) throw error;
            toast.notify("Password changed.");
            setPassword("");
          } catch (e) {
            toast.notify((e as Error).message, true);
          } finally {
            setBusy(false);
          }
        }}
      >
        <p>Signed in as {auth.session?.user.email}</p>
        <label>
          New password
          <input
            type="password"
            required
            minLength={12}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <button disabled={busy}>Update password</button>
        <p className="muted">
          If your authentication email is incorrect, contact support. A
          correction to your official registration email does not change your
          sign-in email.
        </p>
      </form>
    </>
  );
}
