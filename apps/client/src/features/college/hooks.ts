
import { useQuery } from '@tanstack/react-query';
import type {
  CollegeFacultyMemberDto,
  CollegeProgramDto,
} from '@forge-loom/shared-types';
import { apiRequest } from '../../lib/apiClient';

// College Statistics Type
export interface CollegeStatisticsDto {
  totalStudents: number;
  activeStudents: number;
  inactiveStudents: number;
  totalFaculty: number;
  totalTrainers: number;
  totalMentors: number;
}

// College Programs
export function useCollegePrograms() {
  return useQuery({
    queryKey: ['college', 'programs'],
    queryFn: () =>
      apiRequest<{ programs: CollegeProgramDto[] }>(
        '/api/colleges/mine/programs'
      ).then((response) => response.programs),
  });
}

// College Faculty
export function useCollegeFaculty() {
  return useQuery({
    queryKey: ['college', 'faculty'],
    queryFn: () =>
      apiRequest<{ faculty: CollegeFacultyMemberDto[] }>(
        '/api/colleges/mine/faculty'
      ).then((response) => response.faculty),
  });
}

// College Student and Faculty Statistics
export function useCollegeStatistics() {
  return useQuery({
    queryKey: ['college', 'statistics'],
    queryFn: () =>
      apiRequest<{ statistics: CollegeStatisticsDto }>(
        '/api/colleges/mine/statistics'
      ).then((response) => response.statistics),
  });
}
