import { lazy, Suspense, type ReactNode } from 'react';
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { Role } from '@forge-loom/shared-types';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { RequireAuth } from './auth/RequireAuth';
import { RequireRole } from './auth/RequireRole';
import { ROLE_HOME_PATH } from './auth/roleHome';
import { AppShell } from './layout/AppShell';
import {
  AdminLayout,
  CollegeLayout,
  CourseAdminLayout,
  EcosystemComingSoonLayout,
  HrLayout,
  MentorLayout,
  StudentLayout,
  TrainerLayout,
} from './layout/roles/RoleLayouts';
import { PageLoading } from './components/ui/PageLoading';

const LoginPage = lazy(() => import('./pages/auth/LoginPage').then((m) => ({ default: m.LoginPage })));
const RegisterPage = lazy(() =>
  import('./pages/auth/RegisterPage').then((m) => ({ default: m.RegisterPage }))
);
const VerifyCertificatePage = lazy(() =>
  import('./pages/public/VerifyCertificatePage').then((m) => ({ default: m.VerifyCertificatePage }))
);
const ComingSoonPage = lazy(() =>
  import('./pages/public/ComingSoonPage').then((m) => ({ default: m.ComingSoonPage }))
);
const AccountPage = lazy(() =>
  import('./pages/account/AccountPage').then((m) => ({ default: m.AccountPage }))
);

// Student Portal
const HomePage = lazy(() => import('./pages/student/HomePage').then((m) => ({ default: m.HomePage })));
const CoursesPage = lazy(() =>
  import('./pages/student/CoursesPage').then((m) => ({ default: m.CoursesPage }))
);
const CatalogPage = lazy(() =>
  import('./pages/student/CatalogPage').then((m) => ({ default: m.CatalogPage }))
);
const CourseDetailPage = lazy(() =>
  import('./pages/student/CourseDetailPage').then((m) => ({ default: m.CourseDetailPage }))
);
const CalendarPage = lazy(() =>
  import('./pages/student/CalendarPage').then((m) => ({ default: m.CalendarPage }))
);
const TrackerPage = lazy(() =>
  import('./pages/student/TrackerPage').then((m) => ({ default: m.TrackerPage }))
);
const MentorSessionsPage = lazy(() =>
  import('./pages/student/MentorSessionsPage').then((m) => ({ default: m.MentorSessionsPage }))
);
const EventsPage = lazy(() =>
  import('./pages/student/EventsPage').then((m) => ({ default: m.EventsPage }))
);
const CitadelHubPage = lazy(() =>
  import('./pages/student/citadel/CitadelHubPage').then((m) => ({ default: m.CitadelHubPage }))
);
const SprintCyclesPage = lazy(() =>
  import('./pages/student/citadel/SprintCyclesPage').then((m) => ({ default: m.SprintCyclesPage }))
);
const ProblemStatementPage = lazy(() =>
  import('./pages/student/citadel/ProblemStatementPage').then((m) => ({
    default: m.ProblemStatementPage,
  }))
);
const ProgressReportPage = lazy(() =>
  import('./pages/student/citadel/ProgressReportPage').then((m) => ({
    default: m.ProgressReportPage,
  }))
);
const FeedbackPage = lazy(() =>
  import('./pages/student/citadel/FeedbackPage').then((m) => ({ default: m.FeedbackPage }))
);
const CertificationsPage = lazy(() =>
  import('./pages/student/CertificationsPage').then((m) => ({ default: m.CertificationsPage }))
);

// Mentor Portal
const MentorDashboardPage = lazy(() =>
  import('./pages/mentor/DashboardPage').then((m) => ({ default: m.DashboardPage }))
);
const MentorStudentsPage = lazy(() =>
  import('./pages/mentor/StudentsPage').then((m) => ({ default: m.StudentsPage }))
);
const MentorTeamsPage = lazy(() =>
  import('./pages/mentor/TeamsPage').then((m) => ({ default: m.TeamsPage }))
);
const MentorSessionsRolePage = lazy(() =>
  import('./pages/mentor/SessionsPage').then((m) => ({ default: m.SessionsPage }))
);

// Trainer Portal
const TrainerDashboardPage = lazy(() =>
  import('./pages/trainer/DashboardPage').then((m) => ({ default: m.DashboardPage }))
);
const TrainerCourseSessionsPage = lazy(() =>
  import('./pages/trainer/CourseSessionsPage').then((m) => ({ default: m.CourseSessionsPage }))
);

// HR Portal
const HrDashboardPage = lazy(() =>
  import('./pages/hr/DashboardPage').then((m) => ({ default: m.DashboardPage }))
);
const TalentPoolPage = lazy(() =>
  import('./pages/hr/TalentPoolPage').then((m) => ({ default: m.TalentPoolPage }))
);

// Governance & Course Admin Portals
const CollegeDashboardPage = lazy(() =>
  import('./pages/college/DashboardPage').then((m) => ({ default: m.DashboardPage }))
);
const AdminDashboardPage = lazy(() =>
  import('./pages/admin/DashboardPage').then((m) => ({ default: m.DashboardPage }))
);
const CourseListPage = lazy(() =>
  import('./pages/course-admin/CourseListPage').then((m) => ({ default: m.CourseListPage }))
);
const CourseEditorPage = lazy(() =>
  import('./pages/course-admin/CourseEditorPage').then((m) => ({ default: m.CourseEditorPage }))
);

function RootRedirect() {
  const { status, user } = useAuth();

  if (status === 'loading') {
    return <PageLoading fullScreen label="Checking session…" />;
  }

  if (status === 'authenticated' && user) {
    return <Navigate to={ROLE_HOME_PATH[user.role]} replace />;
  }

  return <Navigate to="/login" replace />;
}

function roleSection(role: Role, children: ReactNode) {
  return (
    <Route
      key={role}
      path={ROLE_HOME_PATH[role]}
      element={
        <RequireRole role={role}>
          <Outlet />
        </RequireRole>
      }
    >
      {children}
    </Route>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<PageLoading fullScreen />}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/verify/:token" element={<VerifyCertificatePage />} />

            <Route element={<RequireAuth />}>
              <Route element={<AppShell />}>
                <Route path="/account" element={<AccountPage />} />
              </Route>

              {/* Dedicated Role-Specific Layouts for Core 7 Portals */}
              <Route element={<StudentLayout />}>
                {roleSection(
                  Role.Student,
                  <>
                    <Route index element={<HomePage />} />
                    <Route path="courses" element={<CoursesPage />} />
                    <Route path="courses/:id" element={<CourseDetailPage />} />
                    <Route path="catalog" element={<CatalogPage />} />
                    <Route path="calendar" element={<CalendarPage />} />
                    <Route path="tracker" element={<TrackerPage />} />
                    <Route path="citadel" element={<CitadelHubPage />} />
                    <Route path="citadel/sprints" element={<SprintCyclesPage />} />
                    <Route path="citadel/problem-statement" element={<ProblemStatementPage />} />
                    <Route path="citadel/progress-report" element={<ProgressReportPage />} />
                    <Route path="citadel/feedback" element={<FeedbackPage />} />
                    <Route path="mentor" element={<MentorSessionsPage />} />
                    <Route path="certifications" element={<CertificationsPage />} />
                    <Route path="events" element={<EventsPage />} />
                  </>
                )}
              </Route>

              <Route element={<MentorLayout />}>
                {roleSection(
                  Role.Mentor,
                  <>
                    <Route index element={<MentorDashboardPage />} />
                    <Route path="students" element={<MentorStudentsPage />} />
                    <Route path="teams" element={<MentorTeamsPage />} />
                    <Route path="sessions" element={<MentorSessionsRolePage />} />
                  </>
                )}
              </Route>

              <Route element={<TrainerLayout />}>
                {roleSection(
                  Role.Trainer,
                  <>
                    <Route index element={<TrainerDashboardPage />} />
                    <Route path="courses/:id" element={<TrainerCourseSessionsPage />} />
                  </>
                )}
              </Route>

              <Route element={<HrLayout />}>
                {roleSection(
                  Role.Hr,
                  <>
                    <Route index element={<HrDashboardPage />} />
                    <Route path="talent-pool" element={<TalentPoolPage />} />
                  </>
                )}
              </Route>

              <Route element={<CollegeLayout />}>
                {roleSection(Role.CollegeAdmin, <Route index element={<CollegeDashboardPage />} />)}
              </Route>

              <Route element={<AdminLayout />}>
                {roleSection(Role.ForgeAdmin, <Route index element={<AdminDashboardPage />} />)}
              </Route>

              <Route element={<CourseAdminLayout />}>
                {roleSection(
                  Role.CourseAdmin,
                  <>
                    <Route index element={<CourseListPage />} />
                    <Route path="courses/new" element={<CourseEditorPage />} />
                    <Route path="courses/:id/edit" element={<CourseEditorPage />} />
                  </>
                )}
              </Route>

              {/* Phase 2 Ecosystem Roles — Coming Soon */}
              <Route element={<EcosystemComingSoonLayout />}>
                {roleSection(Role.Speaker, <Route index element={<ComingSoonPage />} />)}
                {roleSection(Role.Sponsor, <Route index element={<ComingSoonPage />} />)}
                {roleSection(Role.CommunityLeader, <Route index element={<ComingSoonPage />} />)}
                {roleSection(Role.MediaPartner, <Route index element={<ComingSoonPage />} />)}
                {roleSection(Role.Member, <Route index element={<ComingSoonPage />} />)}
              </Route>
            </Route>

            <Route path="/" element={<RootRedirect />} />
            <Route path="*" element={<RootRedirect />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}
