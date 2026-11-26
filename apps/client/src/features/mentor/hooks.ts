import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  BookingDto,
  NotificationDto,
  TeamDto,
  TeamSprintsDto,
} from '@forge-loom/shared-types';
import { apiRequest } from '../../lib/apiClient';
import type {
  AssignedStudent,
  MentorSession,
  StudentProfileDetail,
  TeamDetail,
  TeamSummary,
  TodaySession,
  UpcomingSessionHighlight,
} from './types';
// Thin useQuery wrappers around static mock data — same pattern as the
// Student feature. Swapping to the real API later means changing each
// queryFn, not the pages that consume these hooks. `useMentorTeams` and
// `useTeamDetails` below are the ones already swapped over, by Phase 7.

const SPRINT_PHASE_LABELS = [
  'Ideation & Research',
  'Development & Prototyping',
  'Testing & Integration',
];

const TEAMS_WITH_DETAILS_KEY = ['mentor', 'teams-with-details'];

interface MentorTeamRow {
  team: TeamDto;
  view: TeamSprintsDto;
}

async function fetchMentorTeamsWithDetails(): Promise<MentorTeamRow[]> {
  const { teams } = await apiRequest<{ teams: TeamDto[] }>('/api/teams');
  const views = await Promise.all(
    teams.map((team) => apiRequest<TeamSprintsDto>(`/api/teams/${team.id}/sprints`))
  );
  return teams.map((team, index) => ({ team, view: views[index]! }));
}

function averageProgress(view: TeamSprintsDto): number {
  return view.sprints.length > 0
    ? Math.round(
        view.sprints.reduce((sum, sprint) => sum + sprint.progressPercent, 0) / view.sprints.length
      )
    : 0;
}

export function useMentorTeamStats() {
  const { data: teams } = useMentorTeams();
  const { data: students } = useAssignedStudents();
  const { data: todaySessions } = useTodaySessions();

  return useQuery({
    queryKey: ['mentor', 'team-stats', teams?.length, students?.length, todaySessions?.length],
    queryFn: () => ({
      studentsAssigned: students?.length ?? 0,
      teamsMentoring: teams?.length ?? 0,
      sessionsToday: todaySessions?.length ?? 0,
      pendingAssignments: 0,
    }),
  });
}

export function useMentorMenteeStats() {
  const { data: students } = useAssignedStudents();
  const { data: sessions } = useMentorSessions();

  return useQuery({
    queryKey: ['mentor', 'mentee-stats', students?.length, sessions?.length],
    queryFn: () => {
      const all = sessions ?? [];
      return {
        activeMentees: students?.length ?? 0,
        upcomingSessions: all.filter((s) => s.status === 'Upcoming').length,
        sessionsCompleted: all.filter((s) => s.status === 'Completed').length,
        averageRating: 5.0,
      };
    },
  });
}

const MENTOR_BOOKINGS_KEY = ['mentor', 'bookings'];

// No team-to-session link exists on a booking (it's a plain 1:1 with a
// student) — the requester's email stands in for "team" the same way an
// email stands in for a display name elsewhere, disclosed.
async function fetchMentorBookings(): Promise<BookingDto[]> {
  const { bookings } = await apiRequest<{ bookings: BookingDto[] }>('/api/bookings/mine');
  return bookings.filter((b) => b.status !== 'cancelled');
}

function toMentorSideSession(booking: BookingDto): MentorSession {
  const start = new Date(booking.scheduledAt);
  const end = new Date(start.getTime() + booking.durationMinutes * 60_000);
  const isPast = end.getTime() < Date.now();
  const isCompleted = booking.status === 'completed' || isPast;

  return {
    id: booking.id,
    title: booking.title,
    team: booking.requesterEmail,
    dayLabel: start.getDate().toString().padStart(2, '0'),
    monthLabel: start.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
    dateLabel: start.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }),
    timeLabel: start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
    scheduledAt: booking.scheduledAt,
    mode: booking.mode,
    status: isCompleted ? 'Completed' : 'Upcoming',
    agenda: booking.agenda,
    meetingLink: booking.meetingLink ?? 'https://meet.google.com/forgeloom-mentor-1',
    note: booking.note ?? undefined,
    requesterEmail: booking.requesterEmail,
  };
}

function startingInLabel(scheduledAt: string): string {
  const diffMs = new Date(scheduledAt).getTime() - Date.now();
  if (diffMs <= 0) return 'Now';
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  return hours > 0 ? `In ${hours}h ${minutes}m` : `In ${minutes}m`;
}

export function useTodaySessions() {
  return useQuery({
    queryKey: MENTOR_BOOKINGS_KEY,
    queryFn: fetchMentorBookings,
    select: (bookings): TodaySession[] => {
      const today = new Date().toDateString();
      return bookings
        .filter((b) => b.status === 'upcoming' && new Date(b.scheduledAt).toDateString() === today)
        .map((b) => ({
          id: b.id,
          title: b.title,
          team: b.requesterEmail,
          timeLabel: new Date(b.scheduledAt).toLocaleTimeString([], {
            hour: 'numeric',
            minute: '2-digit',
          }),
          mode: b.mode,
          startingInLabel: startingInLabel(b.scheduledAt),
          meetingLink: b.meetingLink ?? 'https://meet.google.com/forgeloom-mentor-1',
        }));
    },
  });
}

export function useMentorTeams() {
  return useQuery({
    queryKey: TEAMS_WITH_DETAILS_KEY,
    queryFn: fetchMentorTeamsWithDetails,
    select: (rows): TeamSummary[] =>
      rows.map(({ team, view }) => ({
        id: team.id,
        name: team.name,
        letter: team.name.charAt(0).toUpperCase(),
        memberCount: team.members.length,
        progressPercent: averageProgress(view),
      })),
  });
}

export function useAtRiskStudents() {
  const { data: students } = useAssignedStudents();

  return useQuery({
    queryKey: ['mentor', 'at-risk', students],
    queryFn: () => {
      if (!students || students.length === 0) return [];
      return students
        .filter((s) => s.status === 'at_risk')
        .map((s) => ({
          id: s.id,
          name: s.name,
          team: s.team,
          subject: s.course,
          overdueCount: 1,
        }));
    },
  });
}

export function useProgressSnapshot() {
  const { data: students } = useAssignedStudents();

  return useQuery({
    queryKey: ['mentor', 'progress-snapshot', students],
    queryFn: () => {
      if (!students || students.length === 0) {
        return { onTrackPercent: 0, atRiskPercent: 0, notStartedPercent: 0 };
      }
      const total = students.length;
      const onTrack = students.filter((s) => s.status === 'on_track').length;
      const atRisk = students.filter((s) => s.status === 'at_risk').length;
      const notStarted = students.filter((s) => s.status === 'not_started').length;
      return {
        onTrackPercent: Math.round((onTrack / total) * 100),
        atRiskPercent: Math.round((atRisk / total) * 100),
        notStartedPercent: Math.round((notStarted / total) * 100),
      };
    },
  });
}

function formatNotificationTimeLabel(iso: string): string {
  const date = new Date(iso);
  const isToday = date.toDateString() === new Date().toDateString();
  const time = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  return isToday ? `Today, ${time}` : `${date.toLocaleDateString()}, ${time}`;
}

export function useMentorNotifications() {
  return useQuery({
    queryKey: ['notifications', 'mine'],
    queryFn: () =>
      apiRequest<{ notifications: NotificationDto[] }>('/api/notifications/mine').then((r) =>
        r.notifications.map((n) => ({
          id: n.id,
          title: n.title,
          timeLabel: formatNotificationTimeLabel(n.createdAt),
        }))
      ),
  });
}

export function useUpcomingSessionHighlight() {
  return useQuery({
    queryKey: MENTOR_BOOKINGS_KEY,
    queryFn: fetchMentorBookings,
    select: (bookings): UpcomingSessionHighlight | null => {
      const next = bookings
        .filter((b) => b.status === 'upcoming' && new Date(b.scheduledAt).getTime() > Date.now())
        .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())[0];
      if (!next) return null;
      const start = new Date(next.scheduledAt);
      return {
        title: next.title,
        team: next.requesterEmail,
        dateLabel: start.toLocaleDateString('en-US', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        }),
        timeLabel: start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
        mode: next.mode,
        startingInLabel: startingInLabel(next.scheduledAt),
        meetingLink: next.meetingLink ?? 'https://meet.google.com/forgeloom-mentor-1',
      };
    },
  });
}

export function useAssignedStudents() {
  return useQuery({
    queryKey: ['mentor', 'assigned-students'],
    queryFn: () =>
      apiRequest<{ students: AssignedStudent[] }>('/api/teams/my-students')
        .then((r) => r.students),
  });
}

export function useStudentProfiles() {
  return useQuery({
    queryKey: ['mentor', 'student-profiles'],
    queryFn: () =>
      apiRequest<{ profiles: Record<string, StudentProfileDetail> }>('/api/teams/my-students')
        .then((r) => r.profiles),
  });
}

export function useTeamDetails() {
  return useQuery({
    queryKey: TEAMS_WITH_DETAILS_KEY,
    queryFn: fetchMentorTeamsWithDetails,
    select: (rows): Record<string, TeamDetail> => {
      const result: Record<string, TeamDetail> = {};
      for (const { team, view } of rows) {
        const current = view.sprints.find(
          (sprint) =>
            sprint.status === 'in_progress' ||
            sprint.status === 'submitted' ||
            sprint.status === 'reviewed'
        );
        const currentSubmissions = current ? (view.submissionsBySprintId[current.id] ?? []) : [];
        const latest = currentSubmissions.length > 0 ? currentSubmissions[currentSubmissions.length - 1] : null;

        result[team.id] = {
          id: team.id,
          name: team.name,
          letter: team.name.charAt(0).toUpperCase(),
          progressPercent: averageProgress(view),
          trainerName: view.team.trainerEmail ?? 'Unassigned',
          problemStatementTitle:
            view.team.problemStatementTitle ?? 'No problem statement assigned yet',
          currentSprint: current
            ? `Sprint Cycle ${current.cycleNumber} — ${SPRINT_PHASE_LABELS[current.cycleNumber - 1] ?? ''}`
            : 'All sprints complete',
          currentSprintId: current?.id ?? null,
          currentSprintStatus: (current?.status as TeamDetail['currentSprintStatus']) ?? null,
          members: team.members.map((member) => ({ name: member.name, role: 'Member' })),
          latestSubmission: latest
            ? {
                id: latest.id,
                artifactUrls: latest.artifactUrls,
                demoDate: latest.demoDate,
                createdAt: latest.createdAt,
              }
            : null,
        };
      }
      return result;
    },
  });
}

export function useAddSprintFeedback() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      sprintId,
      comment,
      rating,
    }: {
      sprintId: string;
      comment: string;
      rating?: number;
    }) =>
      apiRequest(`/api/sprints/${sprintId}/feedback`, {
        method: 'POST',
        body: { comment, rating },
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: TEAMS_WITH_DETAILS_KEY });
    },
  });
}

export function useCompleteSprint() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sprintId: string) =>
      apiRequest(`/api/sprints/${sprintId}/complete`, { method: 'PATCH' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: TEAMS_WITH_DETAILS_KEY });
    },
  });
}

export function useMentorSessions() {
  return useQuery({
    queryKey: MENTOR_BOOKINGS_KEY,
    queryFn: fetchMentorBookings,
    select: (bookings) => bookings.map(toMentorSideSession),
  });
}

export function useScheduleSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      studentEmail: string;
      title: string;
      scheduledAt: string;
      agenda?: string[];
    }) =>
      apiRequest<{ booking: BookingDto }>('/api/bookings', {
        method: 'POST',
        body: {
          counterpartEmail: input.studentEmail,
          title: input.title,
          scheduledAt: input.scheduledAt,
          ...(input.agenda && input.agenda.length > 0 && { agenda: input.agenda }),
        },
      }).then((r) => r.booking),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: MENTOR_BOOKINGS_KEY });
    },
  });
}

export function useUpdateBookingSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      bookingId,
      note,
      agenda,
      status,
      meetingLink,
      scheduledAt,
    }: {
      bookingId: string;
      note?: string;
      agenda?: string[];
      status?: 'upcoming' | 'completed' | 'cancelled';
      meetingLink?: string;
      scheduledAt?: string;
    }) =>
      apiRequest<{ booking: BookingDto }>(`/api/bookings/${bookingId}`, {
        method: 'PATCH',
        body: { note, agenda, status, meetingLink, scheduledAt },
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: MENTOR_BOOKINGS_KEY });
    },
  });
}