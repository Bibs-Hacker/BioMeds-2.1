import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import QRCode from "qrcode";
import { toPng } from "html-to-image";
import jsPDF from "jspdf";
import { Activity, UserRound } from "lucide-react";
import { myStudent, signedPhoto } from "../services/studentService";
import { supabase, appUrl } from "../services/supabase";
import {
  useData,
  Loading,
  ErrorBox,
  PageTitle,
  useToast,
} from "../components/common";
import type { Student, Settings } from "../types";
export const CARD_WIDTH_MM = 85.6;
export const CARD_HEIGHT_MM = 53.98;
export function MembershipCard() {
  const { studentId } = useParams();
  const front = useRef<HTMLDivElement>(null);
  const back = useRef<HTMLDivElement>(null);
  const [qr, setQr] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [side, setSide] = useState("both");
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const result = useData(async () => {
    let student: Student | null;
    if (studentId) {
      const { data, error } = await supabase
        .from("students")
        .select("*")
        .eq("id", studentId)
        .single();
      if (error) throw error;
      student = data as Student;
    } else student = await myStudent();
    if (!student) return null;
    const { data: card, error } = await supabase
      .from("membership_cards")
      .select("*")
      .eq("student_id", student.id)
      .maybeSingle();
    if (error) throw error;
    const { data: settings, error: settingsError } = await supabase
      .from("registration_settings")
      .select("*")
      .single();
    if (settingsError) throw settingsError;
    return {
      student,
      card: card as { verification_token: string; issued_at: string } | null,
      settings: settings as Settings,
    };
  }, ["students", "membership_cards", "registration_settings"]);
  const s = result.data?.student;
  const token = result.data?.card?.verification_token;
  useEffect(() => {
    setQr("");
    setPhoto(null);
    let active = true;
    if (token)
      QRCode.toDataURL(`${appUrl}/verify/${token}`, {
        errorCorrectionLevel: "M",
        margin: 2,
        width: 600,
      })
        .then((url) => {
          if (active) setQr(url);
        })
        .catch((e) => toast.notify((e as Error).message, true));
    if (s?.photo_path)
      signedPhoto(s.photo_path)
        .then((url) => {
          if (active) setPhoto(url);
        })
        .catch((e) => toast.notify((e as Error).message, true));
    return () => {
      active = false;
    };
  }, [token, s?.photo_path]);
  async function exportCard(kind: "pdf" | "png" | "print") {
    setBusy(true);
    try {
      const latest = await result.refresh();
      void latest;
      const { data: live, error } = await supabase
        .from("students")
        .select("registration_status,membership_status,updated_at")
        .eq("id", s!.id)
        .single();
      if (error) throw error;
      if (
        live.registration_status !== "approved" ||
        live.membership_status !== "active"
      )
        throw new Error("Membership is not active. Downloads are disabled.");
      if (live.updated_at !== s!.updated_at)
        throw new Error(
          "Student record changed. Preview has refreshed; download again.",
        );
      if (!qr) throw new Error("Wait for the QR code to load.");
      if (s?.photo_path && !photo)
        throw new Error(
          "Wait for your student photograph to load, or refresh if it could not be retrieved.",
        );
      await document.fonts.ready;
      const opts = {
        pixelRatio: 3,
        cacheBust: true,
        backgroundColor: "#ffffff",
        width: 856,
        height: 540,
      };
      const f = await toPng(front.current!, opts);
      const b = await toPng(back.current!, opts);
      if (kind === "png") {
        for (const [url, name] of [
          [f, "front"],
          [b, "back"],
        ]) {
          const a = document.createElement("a");
          a.href = url;
          a.download = `${s!.membership_id}-${name}.png`;
          a.click();
        }
      } else {
        const pdf = new jsPDF({
          unit: "mm",
          format: [CARD_WIDTH_MM, CARD_HEIGHT_MM],
          orientation: "landscape",
        });
        pdf.addImage(f, "PNG", 0, 0, CARD_WIDTH_MM, CARD_HEIGHT_MM);
        pdf.addPage([CARD_WIDTH_MM, CARD_HEIGHT_MM], "landscape");
        pdf.addImage(b, "PNG", 0, 0, CARD_WIDTH_MM, CARD_HEIGHT_MM);
        if (kind === "print") {
          pdf.autoPrint();
          window.open(pdf.output("bloburl"), "_blank", "noopener");
        } else pdf.save(`${s!.membership_id}.pdf`);
      }
    } catch (e) {
      toast.notify((e as Error).message, true);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageTitle
        title="My class membership card"
        description="A personal class identity. Not an official KMTC student identification card."
      />
      <ErrorBox error={result.error} />
      {result.loading ? (
        <Loading />
      ) : !s ? (
        <div className="notice">Complete class registration first.</div>
      ) : s.registration_status !== "approved" ||
        s.membership_status !== "active" ||
        !token ? (
        <div className="notice">
          Card unavailable. Registration: {s.registration_status}. Membership:{" "}
          {s.membership_status}. Only approved, active students can download a
          card.
        </div>
      ) : (
        <>
          <div className="actions">
            <button className="secondary" onClick={() => setSide("front")}>
              Preview front
            </button>
            <button className="secondary" onClick={() => setSide("back")}>
              Preview back
            </button>
            <button className="secondary" onClick={() => setSide("both")}>
              Both sides
            </button>
          </div>
          <div className="card-previews">
            <div
              className={side === "back" ? "card-wrap offscreen" : "card-wrap"}
            >
              <div
                ref={front}
                className="membership-card front"
                data-testid="card-front"
              >
                <div className="card-band">
                  {result.data?.settings.logo_path ? (
                    <img
                      className="card-logo"
                      src={
                        supabase.storage
                          .from("branding")
                          .getPublicUrl(result.data.settings.logo_path).data
                          .publicUrl
                      }
                      alt="Class logo"
                    />
                  ) : (
                    <Activity size={38} />
                  )}
                  <div>
                    <b>CLASS MEMBERSHIP CARD</b>
                    <small>KMTC • MEDICAL ENGINEERING</small>
                  </div>
                  <span>Y2 / S1</span>
                </div>
                <div className="card-body">
                  <div className="card-photo">
                    {photo ? (
                      <img src={photo} alt={s.full_name} />
                    ) : (
                      <UserRound size={74} />
                    )}
                  </div>
                  <div className="card-identity">
                    <p>YEAR 2 SEMESTER 1</p>
                    <h2>{s.full_name}</h2>
                    <dl>
                      <dt>REGISTRATION NUMBER</dt>
                      <dd>{s.registration_number}</dd>
                      <dt>MEMBERSHIP ID</dt>
                      <dd>{s.membership_id}</dd>
                    </dl>
                    <span className="card-status">
                      ACTIVE MEMBER · {s.academic_year}
                    </span>
                  </div>
                  <div className="card-qr">
                    {qr && (
                      <img src={qr} alt="Membership verification QR code" />
                    )}
                    <small>SCAN TO VERIFY</small>
                  </div>
                </div>
                <div className="card-foot">
                  One Class. One Identity. One Community.
                  <span>
                    Class membership only • Not an official KMTC student ID
                  </span>
                </div>
              </div>
            </div>
            <div
              className={side === "front" ? "card-wrap offscreen" : "card-wrap"}
            >
              <div
                ref={back}
                className="membership-card back"
                data-testid="card-back"
              >
                <div className="card-band">
                  <Activity size={38} />
                  <b>MEDENG Y2S1 · CLASS IDENTITY</b>
                </div>
                <div className="back-body">
                  <div>
                    <p className="eyebrow">MEMBERSHIP IDENTIFICATION</p>
                    <h2>{s.membership_id}</h2>
                    <p>
                      Kenya Medical Training College
                      <br />
                      Medical Engineering · Year 2 Semester 1<br />
                      Academic year: {s.academic_year}
                    </p>
                    <h3>Verification instructions</h3>
                    <p>
                      Scan the QR code to check current membership status. Only
                      a live “Valid Membership” result confirms an active class
                      membership.
                    </p>
                    <p>
                      Class contact:{" "}
                      {result.data?.settings.class_contact ||
                        "Contact approved class leadership"}
                    </p>
                    <small>
                      Public verification shares membership information only.
                      Private contact and emergency details remain confidential.
                    </small>
                  </div>
                  <div className="card-qr">
                    {qr && (
                      <img src={qr} alt="Membership verification QR code" />
                    )}
                    <small>LIVE VERIFICATION</small>
                  </div>
                </div>
                <div className="card-foot">
                  Developed and Managed by Dev Brian
                  <span>
                    This is not an official KMTC student identification card.
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="actions">
            <button
              disabled={busy || !qr}
              onClick={() => void exportCard("pdf")}
            >
              Download PDF
            </button>
            <button
              disabled={busy || !qr}
              onClick={() => void exportCard("png")}
            >
              Download PNG (both sides)
            </button>
            <button
              className="secondary"
              disabled={busy || !qr}
              onClick={() => void exportCard("print")}
            >
              Print card
            </button>
          </div>
          <p className="muted">
            PDF: two ID-size pages, 85.60 × 53.98 mm. PNG: 2568 × 1620 pixels
            per side.
          </p>
        </>
      )}
    </>
  );
}
