import { useQuery } from '@tanstack/react-query';
import type { CourseDto, TeamDto } from '@forge-loom/shared-types';
import { apiRequest } from '../../lib/apiClient';

export interface TrainerStats {
  studentsAssigned: number;
  coursesTeaching: number;
  sessionsToday: number;
  pendingGrading: number;
}

export interface TrainerStudent {
  id: string;
  name: string;
  course: string;
  score: number;
  lastActivityLabel: string;
}

export interface TrainerCourse {
  id: string;
  name: string;
  studentsEnrolled: number;
  progressPercent: number;
}

export interface Submission {
  id: string;
  studentName: string;
  assignmentTitle: string;
  submittedLabel: string;
  status: 'pending' | 'graded';
  grade?: number;
}

export interface TrainerTeam {
  id: string;
  name: string;
  problemStatementTitle: string;
  sprintStatus: string;
}

export function useTrainerCourses() {
  return useQuery({
    queryKey: ['trainer', 'courses-list'],
    queryFn: async () => {
      try {
        const res = await apiRequest<{ courses: CourseDto[] }>('/api/courses?limit=50');
        return (res.courses ?? []).map<TrainerCourse>((c) => ({
          id: c.id,
          name: c.title,
          studentsEnrolled: 0,
          progressPercent: 0,
        }));
      } catch {
        return [] as TrainerCourse[];
      }
    },
  });
}

export function useTrainerTeams() {
  return useQuery({
    queryKey: ['trainer', 'teams-list'],
    queryFn: async () => {
      try {
        const res = await apiRequest<{ teams: TeamDto[] }>('/api/teams');
        return (res.teams ?? []).map<TrainerTeam>((t) => ({
          id: t.id,
          name: t.name,
          problemStatementTitle: t.problemStatement?.title ?? 'Citadel Project',
          sprintStatus: 'Active',
        }));
      } catch {
        return [] as TrainerTeam[];
      }
    },
  });
}

export function useTrainerStudents() {
  return useQuery({
    queryKey: ['trainer', 'students'],
    queryFn: async () => {
      try {
        const res = await apiRequest<{
          students: Array<{ id: string; name: string; email: string; builderScore?: number }>;
        }>('/api/colleges/students');
        return (res.students ?? []).map<TrainerStudent>((s) => ({
          id: s.id,
          name: s.name || s.email,
          course: 'Enrolled Cohort',
          score: s.builderScore ?? 0,
          lastActivityLabel: 'Active',
        }));
      } catch {
        return [] as TrainerStudent[];
      }
    },
  });
}

export function useTrainerSubmissions() {
  return useQuery({
    queryKey: ['trainer', 'submissions'],
    queryFn: async () => [] as Submission[],
  });
}

export function useTrainerStats() {
  const { data: courses } = useTrainerCourses();
  const { data: students } = useTrainerStudents();

  return useQuery({
    queryKey: ['trainer', 'stats', courses?.length, students?.length],
    queryFn: async (): Promise<TrainerStats> => ({
      studentsAssigned: students?.length ?? 0,
      coursesTeaching: courses?.length ?? 0,
      sessionsToday: 0,
      pendingGrading: 0,
    }),
  });
}
