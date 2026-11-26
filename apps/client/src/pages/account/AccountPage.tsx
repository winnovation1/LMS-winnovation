import { useState, type FormEvent } from 'react';
import { GraduationCap, Pencil, UserRound } from 'lucide-react';
import { Role } from '@forge-loom/shared-types';
import { useAuth } from '../../auth/AuthContext';
import { ROLE_LABELS } from '../../auth/roleHome';
import { useHrCompanyProfile } from '../../features/hr/data';
import {
  useCourseAdminProfile,
  useUpdateCourseAdminProfile,
} from '../../features/course-admin/hooks';
import { apiErrorMessage } from '../../lib/apiErrorMessage';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { PageLoading } from '../../components/ui/PageLoading';
import { CompanyProfileCard } from '../hr/DashboardPage';

function formatDate(iso: string | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

/** "View Profile" from the sidebar/avatar menu — available to every role. */
export function AccountPage() {
  const { user } = useAuth();
  if (!user) return <PageLoading />;

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-1 text-xl font-semibold text-slate-900">Profile</h1>
      <p className="mb-6 text-sm text-slate-500">Your account details.</p>

      <div className="flex flex-col gap-6">
        <Card>
          <h2 className="mb-4 flex items-center gap-2 font-semibold text-slate-900">
            <UserRound size={16} /> Account
          </h2>
          <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
            <Field label="Email" value={user.email} />
            <div>
              <dt className="text-xs font-medium text-slate-500">Role</dt>
              <dd className="mt-0.5">
                <Badge tone="blue">{ROLE_LABELS[user.role]}</Badge>
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500">Status</dt>
              <dd className="mt-0.5">
                <Badge tone={user.status === 'active' ? 'green' : 'amber'}>{user.status}</Badge>
              </dd>
            </div>
            <Field label="Member since" value={formatDate(user.createdAt)} />
            <Field label="Last login" value={formatDate(user.lastLoginAt)} />
          </dl>
        </Card>

        {user.role === Role.Hr && <HrSection />}
        {user.role === Role.CourseAdmin && <CourseAdminSection />}
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium text-slate-500">{label}</dt>
      <dd className="mt-0.5 break-all text-slate-900">{value}</dd>
    </div>
  );
}

function HrSection() {
  const { data: company, isLoading } = useHrCompanyProfile();
  if (isLoading) return <PageLoading />;
  return <CompanyProfileCard company={company} />;
}

function CourseAdminSection() {
  const { data: profile, isLoading, error } = useCourseAdminProfile();
  const update = useUpdateCourseAdminProfile();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('');

  if (isLoading) return <PageLoading />;

  function startEditing() {
    setName(profile?.name ?? '');
    setDepartment(profile?.department ?? '');
    update.reset();
    setEditing(true);
  }

  function handleSave(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    update.mutate(
      { name: name.trim(), department: department.trim() },
      { onSuccess: () => setEditing(false) }
    );
  }

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-semibold text-slate-900">
          <GraduationCap size={16} /> Course Admin Profile
        </h2>
        {!editing && profile && (
          <button
            type="button"
            onClick={startEditing}
            className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline"
          >
            <Pencil size={13} /> Edit
          </button>
        )}
      </div>

      {error ? (
        <p className="text-sm text-red-600">
          {apiErrorMessage(error, "Couldn't load your profile.")}
        </p>
      ) : editing ? (
        <form onSubmit={handleSave} className="flex flex-col gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="ca-name">
              Name
            </label>
            <Input id="ca-name" required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="ca-dept">
              Department
            </label>
            <Input
              id="ca-dept"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              placeholder="e.g. Computer Science"
            />
          </div>
          {update.isError && (
            <p className="text-xs text-red-600">
              {apiErrorMessage(update.error, 'Could not save your profile.', {
                name: 'Name',
                department: 'Department',
              })}
            </p>
          )}
          <div className="flex gap-2">
            <Button type="submit" className="flex-1" disabled={update.isPending || !name.trim()}>
              {update.isPending ? 'Saving...' : 'Save'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={() => setEditing(false)}
              disabled={update.isPending}
            >
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
          <Field label="Name" value={profile?.name ?? '—'} />
          <Field label="Department" value={profile?.department || 'Not set'} />
        </dl>
      )}
    </Card>
  );
}
