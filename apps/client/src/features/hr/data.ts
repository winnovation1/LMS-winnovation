import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import type {
  EventDto,
  HrCompanyProfileDto,
  PostedProblemStatementDto,
  TalentSearchPageDto,
} from '@forge-loom/shared-types';
import { apiRequest } from '../../lib/apiClient';

export type HrCompanyProfile = HrCompanyProfileDto;

export interface HrUpcomingEvent {
  id: string;
  title: string;
  dateLabel: string;
  venue?: string;
  isRegistered: boolean;
}

export interface TalentSearchFilters {
  query?: string;
  domain?: string;
  minScore?: number;
  shortlistedOnly?: boolean;
}

export function useHrCompanyProfile() {
  return useQuery({
    queryKey: ['hr', 'company-profile'],
    queryFn: () =>
      apiRequest<{ profile: HrCompanyProfileDto }>('/api/hr-profile/mine').then((r) => r.profile),
  });
}

export interface UpdateHrProfileInput {
  companyName: string;
  industry: string;
  description: string;
}

export function useUpdateHrProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateHrProfileInput) =>
      apiRequest<{ profile: HrCompanyProfileDto }>('/api/hr-profile/mine', {
        method: 'PATCH',
        // The API names the free-text field `companyDetails`; the DTO calls it `description`.
        body: {
          companyName: input.companyName,
          industry: input.industry,
          companyDetails: input.description,
        },
      }).then((r) => r.profile),
    onSuccess: (profile) => {
      queryClient.setQueryData(['hr', 'company-profile'], profile);
    },
  });
}

export function useHrUpcomingEvents() {
  return useQuery({
    queryKey: ['hr', 'upcoming-events'],
    queryFn: () =>
      apiRequest<{ events: EventDto[] }>('/api/events').then((r) =>
        r.events
          .filter((e) => new Date(e.scheduledAt).getTime() > Date.now())
          .map(
            (e): HrUpcomingEvent => ({
              id: e.id,
              title: e.title,
              venue: e.venue,
              isRegistered: e.isRegistered,
              dateLabel: new Date(e.scheduledAt).toLocaleDateString(undefined, {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              }),
            })
          )
      ),
  });
}

export function useHrRegisterForEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (eventId: string) =>
      apiRequest(`/api/events/${eventId}/register`, { method: 'POST' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['hr', 'upcoming-events'] });
    },
  });
}

const TALENT_PAGE_SIZE = 6;

export function useTalentPool(filters: TalentSearchFilters) {
  return useInfiniteQuery({
    queryKey: ['hr', 'talent-pool', filters],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams({ limit: String(TALENT_PAGE_SIZE) });
      if (filters.query) params.set('query', filters.query);
      if (filters.domain && filters.domain !== 'all') params.set('domain', filters.domain);
      if (filters.minScore) params.set('minScore', String(filters.minScore));
      if (filters.shortlistedOnly) params.set('shortlisted', 'true');
      if (pageParam) params.set('cursor', pageParam);
      return apiRequest<TalentSearchPageDto>(`/api/talent-pool?${params.toString()}`);
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    // Keep showing the old results while a new filter loads; otherwise every
    // keystroke drops back to the full-page loader and the search box unmounts.
    placeholderData: keepPreviousData,
  });
}

export function useToggleShortlist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (studentId: string) =>
      apiRequest<{ shortlisted: boolean }>(`/api/talent-pool/${studentId}/shortlist`, {
        method: 'POST',
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['hr', 'talent-pool'] });
    },
  });
}

export function useSendTalentMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { studentId: string; body: string }) =>
      apiRequest<{ sentAt: string }>(`/api/talent-pool/${input.studentId}/messages`, {
        method: 'POST',
        body: { body: input.body },
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['hr', 'talent-pool'] });
    },
  });
}

export function useMyOpportunities() {
  return useQuery({
    queryKey: ['hr', 'opportunities'],
    queryFn: () =>
      apiRequest<{ problemStatements: PostedProblemStatementDto[] }>(
        '/api/problem-statements/mine'
      ).then((r) => r.problemStatements),
  });
}

export function useCreateOpportunity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { title: string; description: string }) =>
      apiRequest('/api/problem-statements', {
        method: 'POST',
        body: {
          title: input.title,
          description: input.description,
          source: 'industry',
          domain: 'General',
          teamSize: 1,
          durationWeeks: 4,
          difficulty: 'medium',
        },
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['hr', 'opportunities'] });
      void queryClient.invalidateQueries({ queryKey: ['student', 'problem-statements'] });
    },
  });
}
