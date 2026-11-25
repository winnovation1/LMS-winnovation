import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CourseAdminCourseDto,
  CourseAdminProfileDto,
  CourseDto,
  CourseStatus,
  TrainerOptionDto,
} from '@forge-loom/shared-types';
import { apiRequest } from '../../lib/apiClient';
import type { CreateCourseInput, UpdateCourseInput } from './types';

const MY_COURSES_KEY = ['course-admin', 'my-courses'];

export function useMyCourses() {
  return useQuery({
    queryKey: MY_COURSES_KEY,
    queryFn: () =>
      apiRequest<{ courses: CourseAdminCourseDto[] }>('/api/courses/mine').then((r) => r.courses),
  });
}

const PROFILE_KEY = ['course-admin', 'profile'];

export function useCourseAdminProfile(enabled = true) {
  return useQuery({
    queryKey: PROFILE_KEY,
    queryFn: () =>
      apiRequest<{ profile: CourseAdminProfileDto }>('/api/course-admin-profile/mine').then(
        (r) => r.profile
      ),
    enabled,
  });
}

export function useUpdateCourseAdminProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; department: string }) =>
      apiRequest<{ profile: CourseAdminProfileDto }>('/api/course-admin-profile/mine', {
        method: 'PATCH',
        body: input,
      }).then((r) => r.profile),
    onSuccess: (profile) => queryClient.setQueryData(PROFILE_KEY, profile),
  });
}

export function useAssignableTrainers() {
  return useQuery({
    queryKey: ['course-admin', 'trainers'],
    queryFn: () =>
      apiRequest<{ trainers: TrainerOptionDto[] }>('/api/courses/trainers').then((r) => r.trainers),
    staleTime: 5 * 60_000,
  });
}

export function useCourse(courseId: string | undefined) {
  return useQuery({
    queryKey: ['course-admin', 'course', courseId],
    queryFn: () =>
      apiRequest<{ course: CourseDto }>(`/api/courses/${courseId}/manage`).then((r) => r.course),
    enabled: Boolean(courseId),
    // 403/404 won't fix themselves on retry.
    retry: false,
  });
}

export function useCreateCourse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCourseInput) =>
      apiRequest<{ course: CourseDto }>('/api/courses', { method: 'POST', body: input }).then(
        (r) => r.course
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: MY_COURSES_KEY });
    },
  });
}

export function useUpdateCourse(courseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateCourseInput) =>
      apiRequest<{ course: CourseDto }>(`/api/courses/${courseId}`, {
        method: 'PATCH',
        body: input,
      }).then((r) => r.course),
    onSuccess: (course) => {
      void queryClient.invalidateQueries({ queryKey: MY_COURSES_KEY });
      queryClient.setQueryData(['course-admin', 'course', courseId], course);
    },
  });
}

export function useDeleteCourse(courseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiRequest<void>(`/api/courses/${courseId}`, { method: 'DELETE' }),
    // The editor navigates away on success; the cached course entry is left
    // alone so the still-mounted editor doesn't refetch and flash a 404.
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: MY_COURSES_KEY });
    },
  });
}

export function useUpdateCourseStatus(courseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (status: CourseStatus) =>
      apiRequest<{ course: CourseDto }>(`/api/courses/${courseId}/status`, {
        method: 'PATCH',
        body: { status },
      }).then((r) => r.course),
    onSuccess: (course) => {
      void queryClient.invalidateQueries({ queryKey: MY_COURSES_KEY });
      queryClient.setQueryData(['course-admin', 'course', courseId], course);
    },
  });
}
