
import { useState, type FormEvent } from 'react';
import { CalendarPlus, GraduationCap, Users, UserCheck, UserX, BookOpen } from 'lucide-react';
import { useCollegePlacements } from '../../features/college/data';
import {
  useCollegeFaculty,
  useCollegePrograms,
  useCollegeStatistics,
} from '../../features/college/hooks';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { StatCard } from '../../components/ui/StatCard';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { PageLoading } from '../../components/ui/PageLoading';

export function DashboardPage() {
  const { data: programs, isLoading: programsLoading } = useCollegePrograms();
  const { data: faculty, isLoading: facultyLoading } = useCollegeFaculty();
  const { data: statistics, isLoading: statisticsLoading } = useCollegeStatistics();
  const { data: placements, isLoading: placementsLoading } = useCollegePlacements();

  const [eventTitle, setEventTitle] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [hosted, setHosted] = useState(false);

  if (
    programsLoading ||
    facultyLoading ||
    statisticsLoading ||
    placementsLoading
  ) {
    return <PageLoading />;
  }

  const totalPlacements =
    placements?.reduce((sum, item) => sum + item.placements, 0) ?? 0;

  const maxPlacements = Math.max(
    ...(placements?.map((item) => item.placements) ?? [1]),
    1
  );

  const totalStudents = statistics?.totalStudents ?? 0;
  const activeStudents = statistics?.activeStudents ?? 0;
  const inactiveStudents = statistics?.inactiveStudents ?? 0;
  const totalFaculty = statistics?.totalFaculty ?? 0;
  const totalTrainers = statistics?.totalTrainers ?? 0;
  const totalMentors = statistics?.totalMentors ?? 0;

  const PROGRAM_BADGE = {
    published: { tone: 'green' as const, label: 'Active' },
    draft: { tone: 'slate' as const, label: 'Draft' },
    archived: { tone: 'amber' as const, label: 'Archived' },
  };

  function handleHostEvent(event: FormEvent) {
    event.preventDefault();

    if (!eventTitle.trim() || !eventDate) return;

    setHosted(true);
    setEventTitle('');
    setEventDate('');
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="mb-1 text-xl font-semibold text-slate-900">
          College Dashboard
        </h1>
        <p className="text-sm text-slate-500">
          Overview of students, faculty, programs, and placement performance.
        </p>
      </div>

      {/* Main Dashboard Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        <StatCard
          image="/images/dashboard/courses.svg"
          label="Active Programs"
          value={String(
            programs?.filter((program) => program.status === 'published').length ?? 0
          )}
        />

        <StatCard
          image="/images/dashboard/students.svg"
          label="Total Students"
          value={String(totalStudents)}
        />

        <StatCard
          image="/images/dashboard/faculty.svg"
          label="Total Faculty"
          value={String(totalFaculty)}
        />

        <StatCard
          image="/images/dashboard/placements.svg"
          label="Placements"
          value={String(totalPlacements)}
        />

        <StatCard
          image="/images/dashboard/students.svg"
          label="Active Students"
          value={String(activeStudents)}
        />
      </div>

      {/* Student and Faculty Statistics */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-slate-900">
                Student Statistics
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                College-wide student enrollment overview
              </p>
            </div>
            <GraduationCap className="text-blue-600" size={24} />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-blue-50 p-3">
              <Users size={18} className="text-blue-600" />
              <p className="mt-2 text-xs text-slate-500">Total</p>
              <p className="text-2xl font-bold text-blue-700">
                {totalStudents}
              </p>
            </div>

            <div className="rounded-xl bg-green-50 p-3">
              <UserCheck size={18} className="text-green-600" />
              <p className="mt-2 text-xs text-slate-500">Active</p>
              <p className="text-2xl font-bold text-green-700">
                {activeStudents}
              </p>
            </div>

            <div className="rounded-xl bg-amber-50 p-3">
              <UserX size={18} className="text-amber-600" />
              <p className="mt-2 text-xs text-slate-500">Inactive</p>
              <p className="text-2xl font-bold text-amber-700">
                {inactiveStudents}
              </p>
            </div>
          </div>

          <div className="mt-5">
            <div className="mb-2 flex justify-between text-xs text-slate-500">
              <span>Active enrollment ratio</span>
              <span>
                {totalStudents
                  ? `${Math.round((activeStudents / totalStudents) * 100)}%`
                  : '0%'}
              </span>
            </div>

            <div className="h-3 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-green-500 transition-all"
                style={{
                  width: `${
                    totalStudents
                      ? (activeStudents / totalStudents) * 100
                      : 0
                  }%`,
                }}
              />
            </div>
          </div>

          <p className="mt-3 text-xs text-slate-400">
            Active means having at least one active course enrollment.
          </p>
        </Card>

        <Card>
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-slate-900">
                Faculty Statistics
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Trainers and mentors overview
              </p>
            </div>
            <Users className="text-purple-600" size={24} />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-blue-50 p-3">
              <Users size={18} className="text-blue-600" />
              <p className="mt-2 text-xs text-slate-500">Total Faculty</p>
              <p className="text-2xl font-bold text-blue-700">
                {totalFaculty}
              </p>
            </div>

            <div className="rounded-xl bg-purple-50 p-3">
              <BookOpen size={18} className="text-purple-600" />
              <p className="mt-2 text-xs text-slate-500">Trainers</p>
              <p className="text-2xl font-bold text-purple-700">
                {totalTrainers}
              </p>
            </div>

            <div className="rounded-xl bg-orange-50 p-3">
              <GraduationCap size={18} className="text-orange-600" />
              <p className="mt-2 text-xs text-slate-500">Mentors</p>
              <p className="text-2xl font-bold text-orange-700">
                {totalMentors}
              </p>
            </div>
          </div>

          <div className="mt-5 flex h-3 overflow-hidden rounded-full bg-slate-100">
            <div
              className="bg-purple-500 transition-all"
              style={{
                width: `${
                  totalFaculty ? (totalTrainers / totalFaculty) * 100 : 0
                }%`,
              }}
            />
            <div
              className="bg-orange-400 transition-all"
              style={{
                width: `${
                  totalFaculty ? (totalMentors / totalFaculty) * 100 : 0
                }%`,
              }}
            />
          </div>

          <div className="mt-3 flex gap-5 text-xs text-slate-500">
            <span>● Trainers</span>
            <span>● Mentors</span>
          </div>
        </Card>
      </div>

      {/* Programs and Faculty Overview */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 font-semibold text-slate-900">
            Programs / Active Courses
          </h2>

          <div className="flex flex-col divide-y divide-slate-100">
            {programs?.length === 0 && (
              <p className="py-4 text-sm text-slate-400">
                No students at this college have enrolled in a course yet.
              </p>
            )}

            {programs?.map((program) => {
              const badge = PROGRAM_BADGE[program.status];

              return (
                <div
                  key={program.courseId}
                  className="flex items-center justify-between gap-2 py-3 first:pt-0 last:pb-0"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-800">
                      {program.title}
                    </p>
                    <p className="text-xs text-slate-500">
                      {program.studentsEnrolled} students enrolled
                    </p>
                  </div>

                  <Badge tone={badge.tone}>{badge.label}</Badge>
                </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <h2 className="mb-4 font-semibold text-slate-900">
            Faculty Overview
          </h2>

          <div className="flex flex-col divide-y divide-slate-100">
            {faculty?.length === 0 && (
              <p className="py-4 text-sm text-slate-400">
                No trainers or mentors are linked to this college yet.
              </p>
            )}

            {faculty?.map((member) => (
              <div
                key={member.userId}
                className="flex items-center justify-between gap-2 py-3 first:pt-0 last:pb-0"
              >
                <div>
                  <p className="text-sm font-medium text-slate-800">
                    {member.email}
                  </p>
                  <p className="text-xs capitalize text-slate-500">
                    {member.role}
                  </p>
                </div>

                <span className="text-xs text-slate-500">
                  {member.workload}{' '}
                  {member.role === 'trainer' ? 'teams' : 'students'}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Placements and Events */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 font-semibold text-slate-900">
            Placement Stats
          </h2>

          <div className="flex flex-col gap-3">
            {placements?.map((stat) => (
              <div key={stat.domain}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="text-slate-700">{stat.domain}</span>
                  <span className="text-slate-500">{stat.placements}</span>
                </div>

                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-blue-600"
                    style={{
                      width: `${(stat.placements / maxPlacements) * 100}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="mb-4 flex items-center gap-2 font-semibold text-slate-900">
            <CalendarPlus size={16} />
            Host an Event
          </h2>

          <form onSubmit={handleHostEvent} className="flex flex-col gap-3">
            <Input
              placeholder="Event title"
              value={eventTitle}
              onChange={(event) => setEventTitle(event.target.value)}
            />

            <Input
              type="date"
              value={eventDate}
              onChange={(event) => setEventDate(event.target.value)}
            />

            <Button
              type="submit"
              disabled={!eventTitle.trim() || !eventDate}
            >
              Host Event
            </Button>

            {hosted && (
              <p className="text-xs text-green-600">
                Event added to the shared calendar.
              </p>
            )}
          </form>
        </Card>
      </div>
    </div>
  );
}
