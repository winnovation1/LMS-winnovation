import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../../lib/apiClient';

export interface PlacementStat {
  domain: string;
  placements: number;
}

export function useCollegePlacements() {
  return useQuery({
    queryKey: ['college', 'placements'],
    queryFn: async () => {
      try {
        const res = await apiRequest<{ placements?: PlacementStat[] }>('/api/colleges/placements');
        return res.placements ?? [];
      } catch {
        return [] as PlacementStat[];
      }
    },
  });
}
