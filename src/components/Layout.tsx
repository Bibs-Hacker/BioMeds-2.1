import { PublicNavigation } from "./navigation/PublicNavigation";
import { useState, useEffect } from "react";
import { Link, NavLink, Outlet, Navigate, useLocation } from "react-router-dom";
import {
  Activity,
  LayoutDashboard,
  UserRound,
  CreditCard,
  Megaphone,
  FilePenLine,
  Shield,
  LogOut,
  Users,
  FileChartColumn,
  Settings,
  Code,
  Menu,
  BookOpen,
  MessageSquare,
  Trash2,
} from "lucide-react";
import { Brand, Footer, Loading, Verified, useToast } from "./common";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../services/supabase";
import { roleLabels } from "../types";
export function PublicLayout() {
  return (
    <>
      <PublicNavigation />
      <main>
        <Outlet />
      </main>
      <Footer />
    </>
  );
}
export function Guard({
  admin = false,
  permission,
}: {
  admin?: boolean;
  permission?: string;
}) {
  const auth = useAuth();
  const loc = useLocation();
  if (auth.loading) return <Loading />;
  if (!auth.session)
    return <Navigate to="/login" state={{ from: loc.pathname }} replace />;
  if ((admin && !auth.role) || (permission && !auth.can(permission)))
    return <Navigate to="/student" replace />;
  return <Outlet />;
}
export function PortalLayout({ admin = false }: { admin?: boolean }) {
  const auth = useAuth();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const close = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [open]);
  const studentLinks = [
    ["/student", "Overview", LayoutDashboard],
    ["/student/profile", "My profile", UserRound],
    ["/student/card", "Membership card", CreditCard],
    ["/student/announcements", "Announcements", Megaphone],
    ["/student/corrections", "Request correction", FilePenLine],
    ["/student/academics", "Lecturers & units", BookOpen],
    ["/student/feedback", "Feedback & ratings", MessageSquare],
    ["/student/settings", "Settings & security", Settings],
  ] as const;
  const adminLinks = [
    ["/admin", "Population overview", Activity, "view"],
    ["/admin/students", "Student directory", Users, "view"],
    ["/admin/corrections", "Correction review", FilePenLine, "correct"],
    ["/admin/announcements", "Announcements", Megaphone, "announce"],
    ["/admin/reports", "Reports & exports", FileChartColumn, "report"],
    ["/admin/administrators", "Administrator access", Shield, "roles"],
    ["/admin/academics", "Lecturers & units", BookOpen, "academic"],
    ["/admin/feedback", "Feedback review", MessageSquare, "feedback"],
    ["/admin/closures", "Account closure review", Trash2, "settings"],
    ["/admin/control", "System control", Settings, "settings"],
  ] as const;
  return (
    <div className="portal">
      {open && (
        <button
          className="nav-scrim"
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
        />
      )}
      <aside className={open ? "sidebar open" : "sidebar"}>
        <Link to="/" onClick={() => setOpen(false)}>
          <Brand />
        </Link>
        <div className="workspace-label">
          {admin ? "ADMINISTRATOR PORTAL" : "STUDENT PORTAL"}
        </div>
        <nav>
          {admin
            ? adminLinks
                .filter((l) => auth.can(l[3]))
                .map(([to, label, Icon]) => (
                  <NavLink
                    end={to === "/admin"}
                    key={to}
                    to={to}
                    onClick={() => setOpen(false)}
                  >
                    <Icon size={19} />
                    {label}
                  </NavLink>
                ))
            : studentLinks.map(([to, label, Icon]) => (
                <NavLink
                  end={to === "/student"}
                  key={to}
                  to={to}
                  onClick={() => setOpen(false)}
                >
                  <Icon size={19} />
                  {label}
                </NavLink>
              ))}
          {admin && (
            <NavLink to="/admin/settings">
              <Settings size={19} />
              My settings
            </NavLink>
          )}
          <NavLink to={admin ? "/admin/developer" : "/student/developer"}>
            <Code size={19} />
            Developer profile
          </NavLink>
          {auth.role && (
            <Link to={admin ? "/student" : "/admin"}>
              <LayoutDashboard size={19} />
              {admin ? "Student environment" : "Administrator environment"}
            </Link>
          )}
        </nav>
        <div className="sidebar-bottom">
          <p>Developed and Managed by</p>
          <strong>Dev Brian</strong>
          <small>System Developer & Manager</small>
          <button
            className="logout"
            onClick={async () => {
              const { error } = await supabase.auth.signOut({ scope: "local" });
              if (error) toast.notify(error.message, true);
            }}
          >
            <LogOut size={18} />
            Secure logout
          </button>
        </div>
      </aside>
      <div className="portal-main">
        <header className="topbar">
          <button
            className="icon-button mobile-toggle"
            aria-label="Toggle navigation"
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            <Menu />
          </button>
          <span className="topbar-title">
            Medical Engineering{" "}
            <span className="muted">/ Year 2 · Semester 1</span>
          </span>
          <span className="account-chip">
            {auth.developer ? (
              <>
                <b>Dev Brian</b>
                <Verified />
              </>
            ) : auth.role ? (
              roleLabels[auth.role]
            ) : (
              auth.session?.user.email
            )}
          </span>
        </header>
        <main className="workspace">
          <Outlet />
        </main>
        <Footer />
      </div>
    </div>
  );
}
