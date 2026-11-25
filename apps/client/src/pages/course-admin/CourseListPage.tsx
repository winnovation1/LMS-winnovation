import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Plus, Search, UserRound } from 'lucide-react';
import type { CourseAdminCourseDto, CourseStatus } from '@forge-loom/shared-types';
import { useMyCourses } from '../../features/course-admin/hooks';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Tabs } from '../../components/ui/Tabs';
import { PageLoading } from '../../components/ui/PageLoading';
import { useUrlSearchQuery } from '../../lib/useUrlSearchQuery';

type TabValue = 'all' | CourseStatus;

const TABS: { value: TabValue; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
  { value: 'archived', label: 'Archived' },
];

const STATUS_BADGE: Record<CourseStatus, { tone: 'slate' | 'green' | 'blue'; label: string }> = {
  draft: { tone: 'slate', label: 'Draft' },
  published: { tone: 'green', label: 'Published' },
  archived: { tone: 'blue', label: 'Archived' },
};

// Currency is free text on a course, so fall back gracefully on unknown codes.
function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString()}`;
  }
}

function revenueByCurrency(courses: CourseAdminCourseDto[]): string {
  const totals = new Map<string, number>();
  for (const course of courses) {
    const key = course.currency.toUpperCase();
    totals.set(key, (totals.get(key) ?? 0) + course.stats.revenue);
  }
  if (totals.size === 0) return formatMoney(0, 'INR');
  return [...totals].map(([currency, amount]) => formatMoney(amount, currency)).join(' + ');
}

export function CourseListPage() {
  const { data: courses, isLoading } = useMyCourses();
  const [tab, setTab] = useState<TabValue>('all');
  const [search, setSearch] = useUrlSearchQuery();

  const filtered = useMemo(() => {
    if (!courses) return [];
    const byTab = tab === 'all' ? courses : courses.filter((c) => c.status === tab);
    const q = search.trim().toLowerCase();
    if (!q) return byTab;
    return byTab.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        (c.description ?? '').toLowerCase().includes(q) ||
        (c.trainerEmail ?? '').toLowerCase().includes(q)
    );
  }, [courses, tab, search]);

  const summary = useMemo(() => {
    const list = courses ?? [];
    return {
      total: list.length,
      published: list.filter((c) => c.status === 'published').length,
      enrolled: list.reduce((sum, c) => sum + c.stats.enrolledCount, 0),
      completed: list.reduce((sum, c) => sum + c.stats.completedCount, 0),
      revenue: revenueByCurrency(list),
    };
  }, [courses]);

  if (isLoading) {
    return <PageLoading />;
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">My Courses</h1>
          <p className="text-sm text-slate-500">Create and manage your courses.</p>
        </div>
        <Link
          to="/course-admin/courses/new"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
        >
          <Plus size={16} /> New Course
        </Link>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <SummaryTile
          label="Courses"
          value={String(summary.total)}
          hint={`${summary.published} published`}
        />
        <SummaryTile
          label="Students enrolled"
          value={String(summary.enrolled)}
          hint="Active + completed"
        />
        <SummaryTile
          label="Completions"
          value={String(summary.completed)}
          hint={
            summary.enrolled > 0
              ? `${Math.round((summary.completed / summary.enrolled) * 100)}% of enrolled`
              : 'No enrollments yet'
          }
        />
        <SummaryTile label="Revenue" value={summary.revenue} hint="From paid enrollments" />
      </div>

      <Card className="p-0">
        <div className="flex flex-wrap items-end justify-between gap-3 px-4 pt-2">
          <Tabs tabs={TABS} value={tab} onChange={setTab} />
          <div className="relative mb-2 w-full sm:w-64">
            <Search
              size={14}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title or trainer"
              aria-label="Search courses"
              className="w-full rounded-lg border border-slate-200 py-1.5 pl-8 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
        <div className="flex flex-col divide-y divide-slate-100 p-4">
          {filtered.length === 0 && (
            <p className="py-8 text-center text-sm text-slate-400">
              {search.trim()
                ? `No courses match “${search.trim()}”.`
                : 'No courses in this category yet.'}
            </p>
          )}
          {filtered.map((course) => {
            const badge = STATUS_BADGE[course.status];
            const { stats } = course;
            return (
              <Link
                key={course.id}
                to={`/course-admin/courses/${course.id}/edit`}
                className="flex flex-wrap items-center gap-4 py-4 first:pt-0 last:pb-0 hover:bg-slate-50 sm:flex-nowrap"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <BookOpen size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900">{course.title}</p>
                  <p className="text-xs text-slate-500">
                    {course.deliveryMode} · {course.durationDays} days · {course.syllabus.length}{' '}
                    syllabus days · {formatMoney(course.price, course.currency)}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-400">
                    <UserRound size={12} />
                    {course.trainerEmail ?? 'No trainer assigned'}
                  </p>
                </div>
                <div className="flex shrink-0 gap-5 text-right">
                  <Stat label="Enrolled" value={String(stats.enrolledCount)} />
                  <Stat
                    label="Completed"
                    value={
                      stats.enrolledCount > 0
                        ? `${Math.round((stats.completedCount / stats.enrolledCount) * 100)}%`
                        : '—'
                    }
                  />
                  <Stat label="Revenue" value={formatMoney(stats.revenue, course.currency)} />
                </div>
                <Badge tone={badge.tone}>{badge.label}</Badge>
              </Link>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

function SummaryTile({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <Card>
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-slate-900">{value}</p>
      <p className="text-xs text-slate-400">{hint}</p>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm font-semibold text-slate-900">{value}</p>
      <p className="text-[11px] text-slate-400">{label}</p>
    </div>
  );
}
