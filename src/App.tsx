import { lazy, Suspense } from "react";
import { Loading } from "./components/common";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import { AppearanceProvider } from "./contexts/AppearanceContext";
import { AuthProvider } from "./contexts/AuthContext";
import { ToastProvider } from "./components/common";
import { Guard, PortalLayout, PublicLayout } from "./components/Layout";
const Home = lazy(() =>
  import("./pages/Public").then((m) => ({ default: m.Home })),
);
const About = lazy(() =>
  import("./pages/Public").then((m) => ({ default: m.About })),
);
const DeveloperProfile = lazy(() =>
  import("./pages/Public").then((m) => ({ default: m.DeveloperProfile })),
);
const Verification = lazy(() =>
  import("./pages/Public").then((m) => ({ default: m.Verification })),
);
const AnnouncementList = lazy(() =>
  import("./pages/Public").then((m) => ({ default: m.AnnouncementList })),
);
const AuthPage = lazy(() =>
  import("./pages/Auth").then((m) => ({ default: m.AuthPage })),
);
const AccountSecurity = lazy(() =>
  import("./pages/Auth").then((m) => ({ default: m.AccountSecurity })),
);
const Register = lazy(() =>
  import("./pages/Register").then((m) => ({ default: m.Register })),
);
const StudentDashboard = lazy(() =>
  import("./pages/Student").then((m) => ({ default: m.StudentDashboard })),
);
const StudentProfile = lazy(() =>
  import("./pages/Student").then((m) => ({ default: m.StudentProfile })),
);
const StudentCorrections = lazy(() =>
  import("./pages/Student").then((m) => ({ default: m.StudentCorrections })),
);
const MembershipCard = lazy(() =>
  import("./pages/MembershipCard").then((m) => ({ default: m.MembershipCard })),
);
const AdminDashboard = lazy(() =>
  import("./pages/Admin").then((m) => ({ default: m.AdminDashboard })),
);
const StudentDirectory = lazy(() =>
  import("./pages/Admin").then((m) => ({ default: m.StudentDirectory })),
);
const CorrectionReview = lazy(() =>
  import("./pages/Admin").then((m) => ({ default: m.CorrectionReview })),
);
const Reports = lazy(() =>
  import("./pages/Management").then((m) => ({ default: m.Reports })),
);
const AnnouncementManagement = lazy(() =>
  import("./pages/Management").then((m) => ({
    default: m.AnnouncementManagement,
  })),
);
const AdminManagement = lazy(() =>
  import("./pages/Management").then((m) => ({ default: m.AdminManagement })),
);
const SystemControlCenter = lazy(() =>
  import("./pages/Management").then((m) => ({
    default: m.SystemControlCenter,
  })),
);
const LegalPage = lazy(() =>
  import("./pages/Legal").then((m) => ({ default: m.LegalPage })),
);
const AccountSetup = lazy(() =>
  import("./pages/AccountSetup").then((m) => ({ default: m.AccountSetup })),
);
const Academics = lazy(() =>
  import("./pages/Academics").then((m) => ({ default: m.Academics })),
);
const Feedback = lazy(() =>
  import("./pages/Feedback").then((m) => ({ default: m.Feedback })),
);
const SettingsPage = lazy(() =>
  import("./pages/Settings").then((m) => ({ default: m.SettingsPage })),
);
const AccountClosureReview = lazy(() =>
  import("./pages/Settings").then((m) => ({ default: m.AccountClosureReview })),
);
export default function App() {
  return (
    <BrowserRouter>
      <AppearanceProvider>
        <AuthProvider>
          <ToastProvider>
            <Suspense fallback={<Loading />}>
              <Routes>
                <Route element={<PublicLayout />}>
                  <Route index element={<Home />} />
                  <Route path="about" element={<About />} />
                  <Route
                    path="privacy"
                    element={<LegalPage key="privacy" document="privacy" />}
                  />
                  <Route
                    path="terms"
                    element={<LegalPage key="terms" document="terms" />}
                  />
                  <Route path="developer" element={<DeveloperProfile />} />
                  <Route path="verify/:token" element={<Verification />} />
                  <Route path="login" element={<AuthPage />} />
                  <Route path="signup" element={<AuthPage mode="signup" />} />
                  <Route path="recover" element={<AuthPage mode="recover" />} />
                  <Route
                    path="reset-password"
                    element={<AuthPage mode="reset" />}
                  />
                  <Route
                    path="*"
                    element={
                      <section className="section">
                        <h1>Page not found</h1>
                        <Link to="/">Return home</Link>
                      </section>
                    }
                  />
                </Route>
                <Route element={<Guard />}>
                  <Route path="student" element={<PortalLayout />}>
                    <Route index element={<StudentDashboard />} />
                    <Route path="setup" element={<AccountSetup />} />
                    <Route path="register" element={<Register />} />
                    <Route path="academics" element={<Academics />} />
                    <Route path="feedback" element={<Feedback />} />
                    <Route path="settings" element={<SettingsPage />} />
                    <Route path="profile" element={<StudentProfile />} />
                    <Route path="card" element={<MembershipCard />} />
                    <Route
                      path="announcements"
                      element={<AnnouncementList />}
                    />
                    <Route
                      path="corrections"
                      element={<StudentCorrections />}
                    />
                    <Route path="security" element={<SettingsPage />} />
                    <Route path="developer" element={<DeveloperProfile />} />
                  </Route>
                </Route>
                <Route element={<Guard admin />}>
                  <Route path="admin" element={<PortalLayout admin />}>
                    <Route index element={<AdminDashboard />} />
                    <Route path="students" element={<StudentDirectory />} />
                    <Route
                      path="cards/:studentId"
                      element={<MembershipCard />}
                    />
                    <Route path="developer" element={<DeveloperProfile />} />
                    <Route path="settings" element={<SettingsPage />} />
                    <Route element={<Guard admin permission="academic" />}>
                      <Route path="academics" element={<Academics manage />} />
                    </Route>
                    <Route element={<Guard admin permission="feedback" />}>
                      <Route path="feedback" element={<Feedback review />} />
                    </Route>
                    <Route element={<Guard admin permission="correct" />}>
                      <Route
                        path="corrections"
                        element={<CorrectionReview />}
                      />
                    </Route>
                    <Route element={<Guard admin permission="announce" />}>
                      <Route
                        path="announcements"
                        element={<AnnouncementManagement />}
                      />
                    </Route>
                    <Route element={<Guard admin permission="report" />}>
                      <Route path="reports" element={<Reports />} />
                    </Route>
                    <Route element={<Guard admin permission="roles" />}>
                      <Route
                        path="administrators"
                        element={<AdminManagement />}
                      />
                    </Route>
                    <Route element={<Guard admin permission="settings" />}>
                      <Route path="control" element={<SystemControlCenter />} />
                      <Route
                        path="closures"
                        element={<AccountClosureReview />}
                      />
                    </Route>
                  </Route>
                </Route>
              </Routes>
            </Suspense>
          </ToastProvider>
        </AuthProvider>
      </AppearanceProvider>
    </BrowserRouter>
  );
}
