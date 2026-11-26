import { Suspense, useState, type ReactNode } from 'react';
import { Link, Outlet } from 'react-router-dom';
import { Topbar } from '../Topbar';
import { Sidebar } from '../Sidebar';
import { ROLE_NAV } from '../roleNav';
import { useAuth } from '../../auth/AuthContext';
import { ErrorBoundary } from '../../components/ui/ErrorBoundary';
import { PageLoading } from '../../components/ui/PageLoading';

export interface RoleShellConfig {
  portalName: string;
  badgeText: string;
  accentClass: string;
  headerBgClass?: string;
  quickAction?: {
    label: string;
    to: string;
  };
  hideSidebar?: boolean;
  banner?: ReactNode;
}

export function RoleShellBase({
  portalName,
  badgeText,
  accentClass,
  headerBgClass = 'bg-white/75 border-slate-200/70',
  quickAction,
  hideSidebar = false,
  banner,
}: RoleShellConfig) {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = user ? ROLE_NAV[user.role] : [];

  return (
    <div className="relative flex min-h-screen dashboard-canvas text-[#15213D] font-sans antialiased overflow-x-hidden">
      <div
        aria-hidden="true"
        className={`pointer-events-none fixed -top-24 right-[12%] h-[460px] w-[460px] rounded-full blur-[120px] z-0 ${accentClass}`}
      />

      {!hideSidebar && (
        <Sidebar items={navItems} open={sidebarOpen} onNavigate={() => setSidebarOpen(false)} />
      )}

      <div className="relative z-10 flex flex-1 flex-col min-w-0">
        <Topbar onMenuClick={() => setSidebarOpen((open) => !open)} />

        <div className={`border-b px-5 py-2.5 backdrop-blur-md sm:px-7 lg:px-8 ${headerBgClass}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                {portalName}
              </span>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">
                {badgeText}
              </span>
            </div>
            {quickAction && (
              <Link
                to={quickAction.to}
                className="rounded-lg bg-blue-600 px-3 py-1 text-xs font-semibold text-white shadow-xs transition hover:bg-blue-700"
              >
                {quickAction.label}
              </Link>
            )}
          </div>
          {banner}
        </div>

        <main className="flex-1 p-5 sm:p-7 lg:p-8">
          <ErrorBoundary>
            <Suspense fallback={<PageLoading />}>
              <Outlet />
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
