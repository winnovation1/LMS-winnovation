import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { CalendarPlus, Check, CheckCircle2, Copy, ExternalLink, Pencil, UserCheck, Users, Video, X } from 'lucide-react';
import {
  useAssignedStudents,
  useMentorSessions,
  useScheduleSession,
  useUpdateBookingSession,
} from '../../features/mentor/hooks';
import type { MentorSessionStatus } from '../../features/mentor/types';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Tabs } from '../../components/ui/Tabs';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { PageLoading } from '../../components/ui/PageLoading';

const TABS: { value: MentorSessionStatus; label: string }[] = [
  { value: 'Upcoming', label: 'Upcoming' },
  { value: 'Completed', label: 'Completed' },
];

export function SessionsPage() {
  const { data: sessions, isLoading: sessionsLoading } = useMentorSessions();
  const scheduleSession = useScheduleSession();
  const [tab, setTab] = useState<MentorSessionStatus>('Upcoming');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [studentEmail, setStudentEmail] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  
  const { data: assignedStudents } = useAssignedStudents();
  const updateBooking = useUpdateBookingSession();

  const filtered = useMemo(() => (sessions ?? []).filter((s) => s.status === tab), [sessions, tab]);
  const selected = sessions?.find((s) => s.id === selectedId) ?? filtered[0];

  // Attendance state
  const [attendanceModalOpen, setAttendanceModalOpen] = useState(false);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, boolean>>({});
  const [attendanceSaved, setAttendanceSaved] = useState(false);

  // Meeting Link state
  const [isEditingLink, setIsEditingLink] = useState(false);
  const [customLink, setCustomLink] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  // Sync attendance and meeting link state when selected session changes
  useEffect(() => {
    if (selected?.note && selected.note.includes('Attendance:')) {
      setAttendanceSaved(true);
    } else {
      setAttendanceSaved(false);
    }
    setIsEditingLink(false);
    setCustomLink(selected?.meetingLink || 'https://meet.google.com/forgeloom-mentor-1');
  }, [selected?.id, selected?.note, selected?.meetingLink]);

  async function handleSaveMeetingLink() {
    if (!selected || !customLink.trim()) return;
    try {
      await updateBooking.mutateAsync({
        bookingId: selected.id,
        meetingLink: customLink.trim(),
      });
      setIsEditingLink(false);
    } catch (e) {
      console.error('Failed to update meeting link', e);
    }
  }

  function handleCopyLink() {
    const link = selected?.meetingLink || 'https://meet.google.com/forgeloom-mentor-1';
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  }

  // Determine invited student details
  const studentEmailTarget = selected?.requesterEmail || selected?.team || 'student1@forgeloom.dev';
  const matchedStudent = (assignedStudents ?? []).find(
    (s) => s.id === studentEmailTarget || studentEmailTarget.includes(s.name.toLowerCase().replace(/\s/g, ''))
  );

  const invitees = [
    {
      name: matchedStudent?.name || 'Student One',
      email: studentEmailTarget,
      enrollNo: '2026-CS-042',
      team: matchedStudent?.team || 'Team Alpha',
    },
  ];

  function toggleAttendance(email: string) {
    setAttendanceMap((prev) => ({
      ...prev,
      [email]: prev[email] === undefined ? false : !prev[email],
    }));
  }

  async function handleSaveAttendance() {
    if (!selected) return;
    const summary = invitees
      .map((inv) => `${inv.name} (${inv.email}) [${(attendanceMap[inv.email] ?? true) ? 'Present' : 'Absent'}]`)
      .join(', ');

    const notePayload = `Attendance: ${summary} · Recorded at ${new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;

    await updateBooking.mutateAsync({
      bookingId: selected.id,
      note: notePayload,
      status: 'completed',
    });
    setAttendanceSaved(true);
  }

  if (sessionsLoading) {
    return <PageLoading />;
  }

  async function handleSchedule(event: FormEvent) {
    event.preventDefault();
    if (!title || !studentEmail || !date || !time) return;

    setScheduleError(null);
    try {
      await scheduleSession.mutateAsync({
        studentEmail,
        title,
        scheduledAt: new Date(`${date}T${time}`).toISOString(),
      });
      setTitle('');
      setStudentEmail('');
      setDate('');
      setTime('');
      setShowForm(false);
      setTab('Upcoming');
    } catch {
      setScheduleError('Could not schedule this session. Check the student email and try again.');
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Sessions</h1>
          <p className="text-sm text-slate-500">Schedule and manage sessions with your teams.</p>
        </div>
        <Button onClick={() => setShowForm((prev) => !prev)}>
          <CalendarPlus size={16} /> Schedule Session
        </Button>
      </div>

      {showForm && (
        <Card className="mb-6">
          <h2 className="mb-4 font-semibold text-slate-900">New Session</h2>
          <form onSubmit={handleSchedule} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                className="mb-1 block text-sm font-medium text-slate-700"
                htmlFor="session-title"
              >
                Title
              </label>
              <Input
                id="session-title"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Sprint Check-in"
              />
            </div>
            <div>
              <label
                className="mb-1 block text-sm font-medium text-slate-700"
                htmlFor="session-student"
              >
                Student email
              </label>
              <Input
                id="session-student"
                type="email"
                required
                value={studentEmail}
                onChange={(e) => setStudentEmail(e.target.value)}
                placeholder="student1@forgeloom.dev"
              />
            </div>
            <div>
              <label
                className="mb-1 block text-sm font-medium text-slate-700"
                htmlFor="session-date"
              >
                Date
              </label>
              <Input
                id="session-date"
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div>
              <label
                className="mb-1 block text-sm font-medium text-slate-700"
                htmlFor="session-time"
              >
                Time
              </label>
              <Input
                id="session-time"
                type="time"
                required
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
            {scheduleError && <p className="text-sm text-red-600 sm:col-span-2">{scheduleError}</p>}
            <div className="flex gap-3 sm:col-span-2">
              <Button type="submit" className="flex-1" disabled={scheduleSession.isPending}>
                {scheduleSession.isPending ? 'Scheduling…' : 'Confirm Session'}
              </Button>
              <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="p-0">
          <div className="px-4 pt-2">
            <Tabs tabs={TABS} value={tab} onChange={setTab} />
          </div>
          <div className="flex flex-col divide-y divide-slate-100 p-4">
            {filtered.length === 0 && (
              <p className="py-8 text-center text-sm text-slate-400">No sessions here.</p>
            )}
            {filtered.map((session) => (
              <button
                key={session.id}
                type="button"
                onClick={() => setSelectedId(session.id)}
                className={`flex items-center gap-3 py-4 text-left first:pt-0 last:pb-0 ${
                  (selected?.id ?? filtered[0]?.id) === session.id ? 'text-blue-700' : ''
                }`}
              >
                <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                  <span className="text-xs font-medium">{session.monthLabel}</span>
                  <span className="text-sm font-bold">{session.dayLabel}</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900">{session.title}</p>
                  <p className="text-xs text-slate-500">
                    {session.team} · {session.timeLabel}
                  </p>
                </div>
                <Badge tone={session.status === 'Upcoming' ? 'blue' : 'slate'}>
                  {session.status}
                </Badge>
              </button>
            ))}
          </div>
        </Card>

        {selected ? (
          <Card>
            <Badge tone={selected.status === 'Upcoming' ? 'blue' : 'slate'}>
              {selected.status} Session
            </Badge>
            <h2 className="mt-2 text-lg font-semibold text-slate-900">{selected.title}</h2>
            <p className="flex items-center gap-1 text-sm text-slate-500">
              <Users size={14} /> {selected.team}
            </p>

            <div className="my-4 grid grid-cols-2 gap-3 border-y border-slate-100 py-4 sm:grid-cols-3">
              <div className="text-center">
                <p className="text-xs font-semibold text-slate-900">{selected.dateLabel}</p>
                <p className="text-xs text-slate-500">Date</p>
              </div>
              <div className="text-center">
                <p className="text-xs font-semibold text-slate-900">{selected.timeLabel}</p>
                <p className="text-xs text-slate-500">Time</p>
              </div>
              <div className="text-center">
                <p className="flex items-center justify-center gap-1 text-xs font-semibold text-slate-900">
                  <Video size={12} /> {selected.mode}
                </p>
                <p className="text-xs text-slate-500">Mode</p>
              </div>
            </div>

            {/* Live Video Meeting Room Bar */}
            <div className="mb-5 rounded-xl border border-blue-100 bg-gradient-to-r from-blue-50/70 to-indigo-50/50 p-4">
              <div className="mb-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-700">Virtual Meeting Room</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    title="Copy Meeting Link"
                    className="flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-600 transition hover:bg-slate-50 cursor-pointer"
                  >
                    {copiedLink ? (
                      <>
                        <Check size={12} className="text-emerald-600" />
                        <span className="text-emerald-600">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy size={12} />
                        <span>Copy Link</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingLink((prev) => !prev)}
                    title="Edit Meeting Link"
                    className="flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-600 transition hover:bg-slate-50 cursor-pointer"
                  >
                    <Pencil size={11} />
                    <span>{isEditingLink ? 'Cancel' : 'Edit'}</span>
                  </button>
                </div>
              </div>

              {isEditingLink ? (
                <div className="mt-2 flex gap-2">
                  <Input
                    value={customLink}
                    onChange={(e) => setCustomLink(e.target.value)}
                    placeholder="https://meet.google.com/..."
                    className="text-xs"
                  />
                  <Button
                    onClick={handleSaveMeetingLink}
                    disabled={updateBooking.isPending || !customLink.trim()}
                    className="text-xs px-3 py-1 shrink-0"
                  >
                    Save
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2 truncate">
                    <Video size={16} className="shrink-0 text-blue-600" />
                    <span className="truncate text-xs font-mono font-medium text-slate-700">
                      {selected.meetingLink || 'https://meet.google.com/forgeloom-mentor-1'}
                    </span>
                  </div>
                  <a
                    href={selected.meetingLink || 'https://meet.google.com/forgeloom-mentor-1'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700 active:scale-[0.99] shrink-0"
                  >
                    <Video size={14} />
                    <span>Start Meeting</span>
                    <ExternalLink size={12} className="opacity-80" />
                  </a>
                </div>
              )}
            </div>

            <h3 className="mb-2 text-sm font-semibold text-slate-900">Agenda</h3>
            {selected.agenda.length === 0 && (
              <p className="text-sm text-slate-400">No agenda set yet.</p>
            )}
            <div className="flex flex-col gap-2">
              {selected.agenda.map((item) => (
                <span key={item} className="flex items-center gap-2 text-sm text-slate-600">
                  <CheckCircle2 size={14} className="text-slate-300" /> {item}
                </span>
              ))}
            </div>

            {/* Compact Session Attendance Bar */}
            <div className="mt-6 border-t border-slate-100 pt-5">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserCheck size={16} className="text-blue-600" />
                  <h3 className="text-sm font-semibold text-slate-900">Session Attendance</h3>
                </div>
                {attendanceSaved ? (
                  <span className="flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                    <Check size={12} strokeWidth={2.5} /> Recorded
                  </span>
                ) : (
                  <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                    Pending
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-3">
                <div>
                  <p className="text-xs font-semibold text-slate-800">
                    {invitees.filter((i) => (attendanceMap[i.email] ?? true)).length} of {invitees.length} Students Present
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {attendanceSaved
                      ? 'Attendance has been recorded for this session.'
                      : 'Attendance not marked yet.'}
                  </p>
                </div>
                <Button
                  variant="secondary"
                  onClick={() => setAttendanceModalOpen(true)}
                  className="text-xs"
                >
                  <UserCheck size={14} /> {attendanceSaved ? 'Edit Attendance' : 'Mark Attendance'}
                </Button>
              </div>
            </div>

            {selected.status === 'Upcoming' && (
              <div className="mt-6 flex gap-3 border-t border-slate-100 pt-4">
                <Button variant="secondary" className="flex-1">
                  Reschedule
                </Button>
                <Button className="flex-1">
                  <Video size={16} /> Start Session
                </Button>
              </div>
            )}
          </Card>
        ) : (
          <Card className="flex items-center justify-center text-sm text-slate-400">
            No session selected.
          </Card>
        )}
      </div>

      {/* Floating Attendance Modal Window (z-50) */}
      {attendanceModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F1C37]/45 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setAttendanceModalOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <UserCheck size={18} className="text-blue-600" /> Mark Session Attendance
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">{selected?.title}</p>
              </div>
              <button
                type="button"
                onClick={() => setAttendanceModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Quick Actions Shortcuts */}
            <div className="flex items-center justify-between mb-3 text-xs">
              <span className="text-slate-500">
                {invitees.filter((i) => (attendanceMap[i.email] ?? true)).length} of {invitees.length} marked present
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const all: Record<string, boolean> = {};
                    invitees.forEach((i) => {
                      all[i.email] = true;
                    });
                    setAttendanceMap(all);
                  }}
                  className="text-[11px] font-semibold text-blue-600 hover:underline cursor-pointer"
                >
                  All Present
                </button>
                <span className="text-slate-300">·</span>
                <button
                  type="button"
                  onClick={() => {
                    const all: Record<string, boolean> = {};
                    invitees.forEach((i) => {
                      all[i.email] = false;
                    });
                    setAttendanceMap(all);
                  }}
                  className="text-[11px] font-semibold text-rose-600 hover:underline cursor-pointer"
                >
                  All Absent
                </button>
              </div>
            </div>

            {/* Scrollable Student List */}
            <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
              {invitees.map((student) => {
                const isPresent = attendanceMap[student.email] ?? true;
                return (
                  <div
                    key={student.email}
                    onClick={() => toggleAttendance(student.email)}
                    className={`flex cursor-pointer items-center justify-between rounded-xl border p-3 transition-all ${
                      isPresent
                        ? 'border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50/80'
                        : 'border-rose-200 bg-rose-50/50 hover:bg-rose-50/80'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                          isPresent ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                        }`}
                      >
                        {student.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900">{student.name}</p>
                        <p className="text-[11px] text-slate-500">
                          {student.email} · Roll: {student.enrollNo} ({student.team})
                        </p>
                      </div>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold border ${
                        isPresent
                          ? 'border-emerald-300 bg-emerald-100 text-emerald-800'
                          : 'border-rose-300 bg-rose-100 text-rose-800'
                      }`}
                    >
                      {isPresent ? '✓ Present' : '✗ Absent'}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Modal Actions */}
            <div className="mt-5 flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <Button
                variant="secondary"
                onClick={() => setAttendanceModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  await handleSaveAttendance();
                  setAttendanceModalOpen(false);
                }}
                disabled={updateBooking.isPending}
              >
                {updateBooking.isPending ? 'Saving…' : 'Save Attendance'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
