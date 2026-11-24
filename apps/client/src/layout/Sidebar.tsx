import { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, ChevronRight, LogOut, X } from 'lucide-react';
import type { NavItem } from './roleNav';
import { useAuth } from '../auth/AuthContext';
import { ROLE_HOME_PATH, ROLE_LABELS } from '../auth/roleHome';
import { Role } from '@forge-loom/shared-types';

interface SidebarProps {
  items: NavItem[];
  open: boolean;
  onNavigate: () => void;
}

export function Sidebar({ items, open, onNavigate }: SidebarProps) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const isCalendar = location.pathname.includes('/calendar');
  const isTracker = location.pathname.includes('/tracker');
  const isCitadel = location.pathname.includes('/citadel');
  const userName = user?.email.split('@')[0] ?? 'student1';
  const userInitials = userName.slice(0, 2).toUpperCase();

  function handleBannerClick() {
    onNavigate();
    if (user?.role === Role.Student) {
      navigate(isCitadel ? '/student/citadel' : '/student/courses');
    } else if (user?.role === Role.Mentor) {
      navigate('/mentor/teams');
    } else if (user) {
      navigate(ROLE_HOME_PATH[user.role]);
    }
  }

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/20 backdrop-blur-xs lg:hidden"
          onClick={onNavigate}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-60 sm:w-64 flex-col justify-between border-r border-slate-200/70 bg-white/85 backdrop-blur-xl p-5 transition-transform duration-300 ease-out lg:static lg:translate-x-0 ${
          open ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col">
          {/* Brand Logo */}
          <div className="mb-7 flex items-center gap-1.5 px-2">
            <span className="text-xl font-extrabold tracking-tight text-[#2161F5]">
              FORGE
            </span>
            <span className="text-xs font-semibold tracking-wider text-[#8A9BB7]">
              LMS
            </span>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-1.5">
            {items.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end ?? (item.path === '/student' || item.label === 'Home')}
                onClick={onNavigate}
                className={({ isActive }) =>
                  `group relative flex items-center gap-3.5 glass-nav-item px-3.5 py-2.5 text-[13.5px] font-medium transition-all duration-200 ${
                    isActive
                      ? 'glass-nav-item-active font-semibold'
                      : 'glass-nav-item-inactive'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {/* Active Glass Indicator Pill */}
                    {isActive && (
                      <span className="absolute left-1.5 top-1/2 -translate-y-1/2 h-4 w-1 rounded-full bg-[#2161F5] shadow-xs" />
                    )}
                    <item.icon
                      size={18}
                      className={`shrink-0 transition-transform duration-200 ${
                        isActive ? 'text-[#2161F5] scale-105' : 'text-[#617594] group-hover:text-[#15213D]'
                      }`}
                      strokeWidth={1.8}
                    />
                    <span className={isActive ? 'text-[#2161F5]' : ''}>{item.label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Bottom Section */}
        <div className="flex flex-col gap-4 pt-4">
          {/* Motivation Card */}
          <div
            onClick={handleBannerClick}
            className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#EAF2FF] via-[#F1F6FF] to-[#DDE9FF] p-4 border border-blue-100/70 shadow-xs transition-all duration-200 hover:shadow-md hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
          >
            {/* Background 2D abstract waves */}
            <svg
              aria-hidden="true"
              className="absolute -right-2 -bottom-2 w-28 h-28 pointer-events-none opacity-40 text-blue-400 group-hover:opacity-60 transition-opacity"
              viewBox="0 0 100 100"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle cx="80" cy="80" r="45" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 4" />
              <path d="M 30 100 C 50 70, 70 80, 100 60" stroke="currentColor" strokeWidth="1.5" />
            </svg>

            <div className="relative z-10 flex items-end justify-between">
              {isCitadel ? (
                <div className="flex flex-col">
                  <span className="text-[11.5px] font-medium text-slate-500">Build</span>
                  <span className="text-[15px] font-bold text-slate-800 leading-tight">Skills</span>
                  <span className="text-[11.5px] font-medium text-slate-500 mt-0.5">Create Impact</span>
                </div>
              ) : isTracker ? (
                <div className="flex flex-col">
                  <span className="text-[11.5px] font-medium text-slate-500">Track</span>
                  <span className="text-[15px] font-bold text-slate-800 leading-tight">Learn</span>
                  <span className="text-[11.5px] font-medium text-slate-500 mt-0.5">Improve</span>
                </div>
              ) : isCalendar ? (
                <div className="flex flex-col">
                  <span className="text-[11.5px] font-medium text-slate-500">Plan</span>
                  <span className="text-[15px] font-bold text-slate-800 leading-tight">Learn</span>
                  <span className="text-[11.5px] font-medium text-slate-500 mt-0.5">Achieve</span>
                </div>
              ) : (
                <div className="flex flex-col">
                  <span className="text-[11.5px] font-medium text-slate-500">Keep</span>
                  <span className="text-[15px] font-bold text-slate-800 leading-tight">Learning</span>
                  <span className="text-[11.5px] font-medium text-slate-500 mt-0.5">Keep Growing</span>
                </div>
              )}

              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#2161F5] text-white shadow-sm transition-transform duration-200 group-hover:scale-110">
                {isCitadel || isTracker || isCalendar ? (
                  <ArrowRight size={15} strokeWidth={2.2} />
                ) : (
                  <ArrowUpRight size={15} strokeWidth={2.2} />
                )}
              </div>
            </div>
          </div>

          {/* User Profile Pill */}
          <div
            onClick={() => setProfileOpen(true)}
            className="flex items-center justify-between rounded-xl px-1.5 py-1 text-left transition-colors hover:bg-slate-50/80 cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EAF2FF] text-[12px] font-bold text-[#2161F5] border border-blue-100">
                {userInitials}
              </div>
              <div className="flex flex-col">
                <span className="text-[13px] font-semibold text-slate-800 leading-tight">
                  {userName}
                </span>
                <span className="text-[11px] text-slate-400">View Profile</span>
              </div>
            </div>
            <ChevronRight size={15} className="text-slate-400" />
          </div>
        </div>
      </aside>

      {/* User Profile Modal Dialog (z-50) */}
      {profileOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F1C37]/45 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setProfileOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-base font-bold text-slate-900">User Profile</h3>
              <button
                type="button"
                onClick={() => setProfileOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Profile Avatar & Identity */}
            <div className="flex flex-col items-center text-center py-2">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-tr from-[#1748C7] to-[#2161F5] text-white text-xl font-bold shadow-md shadow-blue-500/20 mb-3">
                {userInitials}
              </div>
              <h4 className="text-base font-bold text-slate-900">{userName}</h4>
              <p className="text-xs text-slate-500 mt-0.5">{user?.email}</p>

              <div className="mt-3 inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold bg-blue-50 text-[#2161F5] border border-blue-100">
                {user ? ROLE_LABELS[user.role] : 'User'}
              </div>
            </div>

            {/* Account Details Matrix */}
            <div className="mt-5 space-y-2 rounded-xl bg-slate-50 p-3.5 text-xs border border-slate-100">
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-400">Account Role</span>
                <span className="font-semibold text-slate-700">{user ? ROLE_LABELS[user.role] : 'Member'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-400">Status</span>
                <span className="font-semibold text-emerald-600 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Active
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Platform</span>
                <span className="font-semibold text-slate-700">Forge Loom LMS</span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setProfileOpen(false);
                  void logout();
                }}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition-colors cursor-pointer"
              >
                <LogOut size={14} /> Log out
              </button>
              <button
                type="button"
                onClick={() => setProfileOpen(false)}
                className="flex-1 rounded-xl bg-slate-100 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
