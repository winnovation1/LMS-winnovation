import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { Role, type CourseAdminProfileDto } from '@forge-loom/shared-types';
import type { CourseAdminProfile } from '@prisma/client';
import { prisma } from '../../config/prisma.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { ApiError } from '../../utils/ApiError.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

const updateCourseAdminProfileSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100, 'Name is too long').optional(),
  // '' clears the department.
  department: z.string().trim().max(100, 'Department is too long').optional(),
});

function toDto(profile: CourseAdminProfile): CourseAdminProfileDto {
  return { name: profile.name, department: profile.department ?? null };
}

async function getOwnProfile(userId: string): Promise<CourseAdminProfile> {
  const profile = await prisma.courseAdminProfile.findUnique({ where: { userId } });
  if (!profile) {
    throw new ApiError(404, 'Course admin profile not found');
  }
  return profile;
}

function requireUserId(req: Request): string {
  if (!req.user) {
    throw new ApiError(401, 'Not authenticated');
  }
  return req.user.userId;
}

async function getMine(req: Request, res: Response): Promise<void> {
  const profile = await getOwnProfile(requireUserId(req));
  res.json({ profile: toDto(profile) });
}

async function updateMine(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const input = updateCourseAdminProfileSchema.parse(req.body);
  await getOwnProfile(userId);
  const profile = await prisma.courseAdminProfile.update({
    where: { userId },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.department !== undefined && { department: input.department || null }),
    },
  });
  res.json({ profile: toDto(profile) });
}

export const courseAdminProfileRouter = Router();

courseAdminProfileRouter.get(
  '/mine',
  authenticate,
  authorize(Role.CourseAdmin),
  asyncHandler(getMine)
);
courseAdminProfileRouter.patch(
  '/mine',
  authenticate,
  authorize(Role.CourseAdmin),
  asyncHandler(updateMine)
);
