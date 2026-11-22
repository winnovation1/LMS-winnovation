import type { TalentSearchPageDto } from '@forge-loom/shared-types';
import { prisma } from '../../config/prisma.js';
import { getViewerFlags, type TalentSearchResult } from './talentPool.service.js';

export async function toTalentSearchPageDto(
  hrUserId: string,
  result: TalentSearchResult
): Promise<TalentSearchPageDto> {
  const collegeIds = [...new Set(result.profiles.map((p) => p.collegeId).filter(Boolean))] as string[];
  const [colleges, flags] = await Promise.all([
    prisma.college.findMany({ where: { id: { in: collegeIds } } }),
    getViewerFlags(hrUserId, result.profiles),
  ]);
  const nameByCollegeId = new Map(colleges.map((c) => [c.id, c.name]));

  return {
    results: result.profiles.map((profile) => ({
      studentId: profile.id,
      name: profile.name,
      domain: profile.domain ?? undefined,
      skills: profile.skills,
      score: profile.builderScore,
      collegeName: profile.collegeId ? nameByCollegeId.get(profile.collegeId) : undefined,
      course: profile.course ?? undefined,
      linkedIn: profile.linkedIn ?? undefined,
      shortlisted: flags.shortlistedIds.has(profile.id),
      messaged: flags.messagedUserIds.has(profile.userId),
    })),
    nextCursor: result.nextCursor,
  };
}
