import { Link, useParams } from "react-router-dom";
import {
  ArrowRight,
  ShieldCheck,
  Users,
  ScanLine,
  Activity,
} from "lucide-react";
import {
  useData,
  Loading,
  ErrorBox,
  PageTitle,
  Verified,
  Empty,
} from "../components/common";
import { rpc, rows, supabase, configured } from "../services/supabase";
import type { Announcement, Settings } from "../types";
export function Home() {
  const { data: settings } = useData(async () => {
    const { data, error } = await supabase
      .from("registration_settings")
      .select("*")
      .single();
    if (error) throw error;
    return data as Settings;
  }, ["registration_settings"]);
  return (
    <>
      <section className="hero">
        <div>
          <p className="eyebrow">KENYA MEDICAL TRAINING COLLEGE</p>
          <h1>
            One Class.
            <br />
            One Identity.
            <br />
            <span>One Community.</span>
          </h1>
          <p className="hero-description">
            The digital home for KMTC Medical Engineering Year 2, Semester 1.
            Register securely, connect with your class, and carry your verified
            class identity.
          </p>
          <div className="actions">
            <Link className="button" to="/signup">
              Register as a student <ArrowRight size={18} />
            </Link>
            <Link className="button secondary" to="/login">
              Student login
            </Link>
          </div>
          <p className="muted">
            Developed and Managed by <Link to="/developer">Dev Brian</Link>
          </p>
          {!configured && (
            <div className="notice">
              Backend configuration is required. No demonstration statistics or
              student records are displayed.
            </div>
          )}
        </div>
        <div className="hero-panel">
          <span className="hero-symbol">
            <Activity size={64} />
          </span>
          <p className="eyebrow">MEDICAL ENGINEERING</p>
          <h2>
            Engineering better
            <br />
            healthcare, together.
          </h2>
          <div className="academic-grid">
            <span>
              Institution<b>KMTC</b>
            </span>
            <span>
              Year<b>02</b>
            </span>
            <span>
              Semester<b>01</b>
            </span>
          </div>
          <div className="hero-note">
            <ShieldCheck />
            Secure accounts. Verified records. A shared identity.
          </div>
        </div>
      </section>
      <section className="section">
        <div className="feature-grid">
          {[
            [
              ShieldCheck,
              "Your secure class record",
              "A protected account with administrator-verified registration.",
            ],
            [
              Users,
              "A connected community",
              "Stay up to date with academic notices and class coordination.",
            ],
            [
              ScanLine,
              "A digital class identity",
              "An approved membership card with live QR verification.",
            ],
          ].map(([Icon, title, text]) => {
            const I = Icon as typeof ShieldCheck;
            return (
              <article className="panel" key={String(title)}>
                <I className="teal-text" />
                <h3>{String(title)}</h3>
                <p className="muted">{String(text)}</p>
              </article>
            );
          })}
        </div>
        <PageTitle
          title="Class announcements"
          description="Public notices from your class leadership."
        />
        <AnnouncementList publicOnly />
      </section>
      <section className="section steps panel">
        <h2>Your registration journey</h2>
        <ol>
          <li>Create your account and verify your email.</li>
          <li>
            Complete all six registration steps and submit your declaration.
          </li>
          <li>
            Wait for administrator verification. Submitted records remain
            locked.
          </li>
          <li>Once approved, download your class membership card.</li>
        </ol>
        <p>
          Support:{" "}
          {settings?.support_email ? (
            <a href={`mailto:${settings.support_email}`}>
              {settings.support_email}
            </a>
          ) : (
            "Contact your class representative for the approved support channel."
          )}
        </p>
      </section>
    </>
  );
}
export function AnnouncementList({
  publicOnly = false,
  items,
}: {
  publicOnly?: boolean;
  items?: Announcement[];
}) {
  const result = useData(
    () => rows<Announcement>("announcements"),
    ["announcements"],
  );
  const data = (items || result.data || []).filter(
    (a) =>
      a.state === "published" &&
      new Date(a.publish_at) <= new Date() &&
      (!publicOnly || a.is_public),
  );
  return (
    <>
      {!items && result.loading && <Loading />}
      {!items && <ErrorBox error={result.error} />}
      <div className="announcement-list">
        {data.map((a) => (
          <article className="panel" key={a.id}>
            <div className="actions">
              <span className="badge">{a.category}</span>
              <time className="muted">
                {new Date(a.publish_at).toLocaleString()}
              </time>
            </div>
            <h3>{a.title}</h3>
            <p className="prewrap">{a.body}</p>
          </article>
        ))}
        {!data.length && !result.loading && (
          <Empty text="No published announcements yet." />
        )}
      </div>
    </>
  );
}
export function About() {
  const { data } = useData(async () => {
    const { data, error } = await supabase
      .from("registration_settings")
      .select("*")
      .single();
    if (error) throw error;
    return data as Settings;
  });
  return (
    <section className="section narrow">
      <PageTitle
        title="About the platform"
        description="KMTC Medical Engineering Y2S1 Class Portal"
      />
      <article className="panel">
        <h2>One Class. One Identity. One Community.</h2>
        <p>
          This class-managed portal supports student registration, class
          population management, academic coordination, correction review and
          digital membership verification.
        </p>
        <p>
          Institution: Kenya Medical Training College. Course: Medical
          Engineering. Academic level: Year 2, Semester 1.
        </p>
        <div className="notice">
          Class membership cards are not official KMTC student identification
          cards. Official KMTC marks are used only if class leadership has
          obtained authorization.
        </div>
        <h3>Platform management</h3>
        <p>
          Developed and Managed by Dev Brian — System Developer, Platform
          Manager and Lead System Operator.
        </p>
        <h3>Privacy and data protection</h3>
        <p className="prewrap">
          {data?.privacy_notice ||
            "Personal data is collected only for class population management and membership verification. Submitted information is locked; corrections require administrator approval."}
        </p>
        <p>
          Public QR verification reveals only the student name, membership ID,
          course, academic designation, membership status and verification date.
          Private contacts, residential information and emergency contacts are
          never published.
        </p>
        <p>
          Contact {data?.support_email || "your class leadership"} for access
          and correction requests, questions about retention, complaints, or
          withdrawal of consent. Password changes are managed separately through
          secure account recovery.
        </p>
      </article>
    </section>
  );
}
type Developer = {
  display_name: string;
  verified: boolean;
  title: string;
  position: string;
  role: string;
  created_at: string;
  biography: string;
  photo_path: string | null;
};
export function DeveloperProfile() {
  const { data, loading, error } = useData(() =>
    rpc<Developer | null>("developer_profile"),
  );
  return (
    <section className="section narrow">
      <PageTitle
        title="Developer & platform manager"
        description="Developed and Managed by Dev Brian"
      />
      <ErrorBox error={error} />
      {loading ? (
        <Loading />
      ) : (
        <article className="panel developer-card">
          {data?.photo_path ? (
            <img
              className="developer-photo"
              src={
                supabase.storage.from("branding").getPublicUrl(data.photo_path)
                  .data.publicUrl
              }
              alt="Dev Brian"
            />
          ) : (
            <div className="developer-avatar">DB</div>
          )}
          <h2>Dev Brian {data?.verified && <Verified />}</h2>
          <p>System Developer & Manager</p>
          <div className="actions">
            <span className="badge">Platform Manager</span>
            <span className="badge">Lead System Operator</span>
            <span className="badge">Super Administrator</span>
          </div>
          <p>
            {data?.biography ||
              "Original developer and platform manager of the MedEng Y2S1 Class Portal."}
          </p>
          {data && (
            <p className="muted">
              Account created {new Date(data.created_at).toLocaleDateString()}
            </p>
          )}
          {!data && (
            <div className="notice">
              Verified developer account has not yet been provisioned. The badge
              appears only after secure backend provisioning.
            </div>
          )}
          <p className="muted">
            Responsible for registration operations, platform security,
            administrator access, student membership and system configuration.
          </p>
        </article>
      )}
    </section>
  );
}
export function Verification() {
  const { token } = useParams();
  const { data, loading, error } = useData(() =>
    rpc<Record<string, string>>("verify_membership", { token: token || "" }),
  );
  return (
    <section className="section narrow">
      <PageTitle
        title="Verify class membership"
        description="Live verification against the current class register."
      />
      <ErrorBox error={error} />
      {loading ? (
        <Loading />
      ) : (
        data && (
          <article className="panel verification">
            <ShieldCheck
              size={48}
              className={data.result === "Valid Membership" ? "teal-text" : ""}
            />
            <h2>{data.result}</h2>
            {Object.entries(data)
              .filter(([k]) => k !== "result")
              .map(([k, v]) => (
                <div className="detail-row" key={k}>
                  <span>{k.replaceAll("_", " ")}</span>
                  <b>
                    {k === "verification_date"
                      ? new Date(v).toLocaleString()
                      : v}
                  </b>
                </div>
              ))}
            <div className="notice">
              Class membership only. This is not an official KMTC student ID.
            </div>
          </article>
        )
      )}
    </section>
  );
}
