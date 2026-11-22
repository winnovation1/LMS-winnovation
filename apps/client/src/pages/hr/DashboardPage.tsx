import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Briefcase, Building2, CalendarClock, Pencil, Send, Users } from 'lucide-react';
import {
  useCreateOpportunity,
  useHrCompanyProfile,
  useHrRegisterForEvent,
  useHrUpcomingEvents,
  useMyOpportunities,
  useUpdateHrProfile,
  type HrCompanyProfile,
  type HrUpcomingEvent,
} from '../../features/hr/data';
import { ApiClientError } from '../../lib/apiClient';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { PageLoading } from '../../components/ui/PageLoading';

const TEXTAREA_CLASSES =
  'w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500';

function errorMessage(error: unknown): string {
  return error instanceof ApiClientError ? error.message : 'Something went wrong. Please try again.';
}

export function DashboardPage() {
  const { data: company, isLoading: companyLoading } = useHrCompanyProfile();
  const { data: events, isLoading: eventsLoading } = useHrUpcomingEvents();

  if (companyLoading || eventsLoading) {
    return <PageLoading />;
  }

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-slate-900">HR Dashboard</h1>
      <p className="mb-6 text-sm text-slate-500">
        Manage your company profile, opportunities, and talent search.
      </p>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <CompanyProfileCard company={company} />
        <UpcomingEventsCard events={events ?? []} />
        <PostOpportunityCard />
        <MyOpportunitiesCard />
      </div>
    </div>
  );
}

function CompanyProfileCard({ company }: { company: HrCompanyProfile | undefined }) {
  const updateProfile = useUpdateHrProfile();
  const [editing, setEditing] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState('');
  const [description, setDescription] = useState('');

  function startEditing() {
    setCompanyName(company?.companyName ?? '');
    setIndustry(company?.industry ?? '');
    setDescription(company?.description ?? '');
    updateProfile.reset();
    setEditing(true);
  }

  function handleSave(event: FormEvent) {
    event.preventDefault();
    if (!companyName.trim()) return;
    updateProfile.mutate(
      { companyName: companyName.trim(), industry: industry.trim(), description: description.trim() },
      { onSuccess: () => setEditing(false) }
    );
  }

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-semibold text-slate-900">
          <Building2 size={16} /> Company Profile
        </h2>
        {!editing && (
          <button
            type="button"
            onClick={startEditing}
            className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline"
          >
            <Pencil size={13} /> Edit
          </button>
        )}
      </div>

      {editing ? (
        <form onSubmit={handleSave} className="flex flex-col gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="company-name">
              Company Name
            </label>
            <Input
              id="company-name"
              required
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="company-industry">
              Industry
            </label>
            <Input
              id="company-industry"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              placeholder="e.g. Fintech"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="company-about">
              About
            </label>
            <textarea
              id="company-about"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What your company does and who you hire"
              className={TEXTAREA_CLASSES}
            />
          </div>
          {updateProfile.isError && (
            <p className="text-xs text-red-600">{errorMessage(updateProfile.error)}</p>
          )}
          <div className="flex gap-2">
            <Button type="submit" className="flex-1" disabled={updateProfile.isPending}>
              {updateProfile.isPending ? 'Saving...' : 'Save'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={() => setEditing(false)}
              disabled={updateProfile.isPending}
            >
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <>
          <p className="text-sm font-medium text-slate-900">{company?.companyName}</p>
          <p className="text-xs text-slate-500">{company?.industry || 'Industry not set'}</p>
          <p className="mt-2 text-sm text-slate-600">
            {company?.description || 'Add a short description so students know who you are.'}
          </p>
          <Link
            to="/hr/talent-pool"
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            <Users size={16} /> Browse Talent Pool
          </Link>
        </>
      )}
    </Card>
  );
}

function UpcomingEventsCard({ events }: { events: HrUpcomingEvent[] }) {
  const register = useHrRegisterForEvent();

  return (
    <Card>
      <h2 className="mb-4 flex items-center gap-2 font-semibold text-slate-900">
        <CalendarClock size={16} /> Upcoming Events
      </h2>
      {events.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-400">No upcoming events.</p>
      ) : (
        <div className="flex flex-col divide-y divide-slate-100">
          {events.map((event) => {
            const pending = register.isPending && register.variables === event.id;
            return (
              <div
                key={event.id}
                className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm text-slate-800">{event.title}</p>
                  <p className="text-xs text-slate-400">
                    {event.dateLabel}
                    {event.venue ? ` · ${event.venue}` : ''}
                  </p>
                </div>
                {event.isRegistered ? (
                  <Badge tone="green">Registered</Badge>
                ) : (
                  <Button
                    variant="secondary"
                    className="shrink-0 px-3 py-1 text-xs"
                    disabled={pending}
                    onClick={() => register.mutate(event.id)}
                  >
                    {pending ? 'Registering...' : 'Register'}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}
      {register.isError && (
        <p className="mt-3 text-xs text-red-600">{errorMessage(register.error)}</p>
      )}
    </Card>
  );
}

function PostOpportunityCard() {
  const createOpportunity = useCreateOpportunity();
  const [role, setRole] = useState('');
  const [description, setDescription] = useState('');
  const [posted, setPosted] = useState(false);

  function handlePost(event: FormEvent) {
    event.preventDefault();
    if (!role.trim() || !description.trim()) return;
    setPosted(false);
    createOpportunity.mutate(
      { title: role.trim(), description: description.trim() },
      {
        onSuccess: () => {
          setPosted(true);
          setRole('');
          setDescription('');
        },
      }
    );
  }

  return (
    <Card>
      <h2 className="mb-4 flex items-center gap-2 font-semibold text-slate-900">
        <Send size={16} /> Post Opportunity
      </h2>
      <form onSubmit={handlePost} className="flex flex-col gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="role-title">
            Role Title
          </label>
          <Input
            id="role-title"
            required
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="e.g. Frontend Intern"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="role-description">
            Description
          </label>
          <textarea
            id="role-description"
            required
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the role and evaluation criteria"
            className={TEXTAREA_CLASSES}
          />
        </div>
        <Button type="submit" disabled={createOpportunity.isPending}>
          <Send size={16} /> {createOpportunity.isPending ? 'Posting...' : 'Post Opportunity'}
        </Button>
        {posted && <p className="text-xs text-green-600">Opportunity posted.</p>}
        {createOpportunity.isError && (
          <p className="text-xs text-red-600">{errorMessage(createOpportunity.error)}</p>
        )}
      </form>
    </Card>
  );
}

function MyOpportunitiesCard() {
  const { data: opportunities, isLoading, isError } = useMyOpportunities();

  return (
    <Card>
      <h2 className="mb-4 flex items-center gap-2 font-semibold text-slate-900">
        <Briefcase size={16} /> My Opportunities
      </h2>
      {isLoading && <p className="py-6 text-center text-sm text-slate-400">Loading...</p>}
      {isError && (
        <p className="py-6 text-center text-sm text-red-600">Couldn&apos;t load your opportunities.</p>
      )}
      {opportunities && opportunities.length === 0 && (
        <p className="py-6 text-center text-sm text-slate-400">
          You haven&apos;t posted any opportunities yet.
        </p>
      )}
      {opportunities && opportunities.length > 0 && (
        <div className="flex max-h-80 flex-col divide-y divide-slate-100 overflow-y-auto">
          {opportunities.map((opportunity) => (
            <div key={opportunity.id} className="py-3 first:pt-0 last:pb-0">
              <div className="flex items-center justify-between gap-3">
                <p className="truncate text-sm font-medium text-slate-800">{opportunity.title}</p>
                <Badge tone={opportunity.status === 'open' ? 'green' : 'slate'}>
                  {opportunity.status === 'open' ? 'Open' : 'Closed'}
                </Badge>
              </div>
              <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{opportunity.description}</p>
              <p className="mt-1 text-xs text-slate-400">
                Posted{' '}
                {new Date(opportunity.createdAt).toLocaleDateString(undefined, {
                  day: 'numeric',
                  month: 'short',
                })}{' '}
                · {opportunity.interestCount}{' '}
                {opportunity.interestCount === 1 ? 'student interested' : 'students interested'}
              </p>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
