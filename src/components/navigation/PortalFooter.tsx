import { Link } from "react-router-dom";
import { Activity, ShieldCheck, ArrowUpRight } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
export function PortalFooter() {
  const auth = useAuth();
  const prefix = auth.role ? "/admin" : "/student";
  return (
    <footer className="premium-footer">
      <div className="footer-grid">
        <section>
          <div className="footer-brand">
            <Activity />
            <b>MedEng Y2S1</b>
          </div>
          <p>One Class. One Identity. One Community.</p>
          <small>
            KMTC Medical Engineering · Year 2 Semester 1.
            <br />A class-managed identity and coordination platform.
          </small>
        </section>
        <section>
          <h3>Explore</h3>
          <Link to="/about">About the platform</Link>
          <Link to="/developer">
            Dev Brian · Developer <ArrowUpRight size={12} />
          </Link>
          {auth.session && (
            <>
              <Link to={prefix + "/settings"}>Settings & account security</Link>
              <Link to={"/student/academics"}>Lecturers & teaching units</Link>
              <Link
                to={
                  auth.can("feedback") ? "/admin/feedback" : "/student/feedback"
                }
              >
                Feedback & ratings
              </Link>
            </>
          )}
        </section>
        <section>
          <h3>Trust & support</h3>
          <Link to="/privacy">Privacy Policy</Link>
          <Link to="/terms">Terms and Conditions</Link>
          <Link to="/about">Support & data enquiries</Link>
          <span className="footer-trust">
            <ShieldCheck size={17} />
            Private records. Live verification.
          </span>
          <small>Class cards are not official KMTC student IDs.</small>
        </section>
      </div>
      <div className="footer-bottom">
        <span>
          © 2026 KMTC Medical Engineering Y2S1 Class Portal. Developed and
          Managed by <Link to="/developer">Dev Brian</Link>.
        </span>
        <span>System Developer · Platform Manager · Lead System Operator</span>
      </div>
    </footer>
  );
}
