import { RoleShellBase } from './RoleShellBase';

export function StudentLayout() {
  return (
    <RoleShellBase
      portalName="Student Learning Hub"
      badgeText="Learner Workspace"
      accentClass="bg-blue-400/15"
      quickAction={{ label: 'Browse Catalog', to: '/student/catalog' }}
    />
  );
}

export function MentorLayout() {
  return (
    <RoleShellBase
      portalName="Mentor Advisory"
      badgeText="1-on-1 & Citadel"
      accentClass="bg-emerald-400/15"
      quickAction={{ label: 'View Sessions', to: '/mentor/sessions' }}
    />
  );
}

export function TrainerLayout() {
  return (
    <RoleShellBase
      portalName="Trainer Classroom"
      badgeText="Sessions & Attendance"
      accentClass="bg-amber-400/15"
    />
  );
}

export function CourseAdminLayout() {
  return (
    <RoleShellBase
      portalName="Curriculum Studio"
      badgeText="Course Authoring"
      accentClass="bg-violet-400/15"
      quickAction={{ label: '+ New Course', to: '/course-admin/courses/new' }}
    />
  );
}

export function CollegeLayout() {
  return (
    <RoleShellBase
      portalName="Campus Administration"
      badgeText="Institution Portal"
      accentClass="bg-teal-400/15"
    />
  );
}

export function HrLayout() {
  return (
    <RoleShellBase
      portalName="Talent Acquisition"
      badgeText="Recruiter Portal"
      accentClass="bg-sky-400/15"
      quickAction={{ label: 'Search Talent Pool', to: '/hr/talent-pool' }}
    />
  );
}

export function AdminLayout() {
  return (
    <RoleShellBase
      portalName="Forge Operations"
      badgeText="Super Admin Governance"
      accentClass="bg-indigo-500/15"
      headerBgClass="bg-slate-900/5 border-slate-300/70"
    />
  );
}

export function EcosystemComingSoonLayout() {
  return (
    <RoleShellBase
      portalName="Forge Ecosystem"
      badgeText="Phase 2 Preview"
      accentClass="bg-amber-300/15"
      hideSidebar
    />
  );
}
