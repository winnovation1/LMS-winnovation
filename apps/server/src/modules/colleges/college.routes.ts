
import { Router } from 'express';
import { Role } from '@forge-loom/shared-types';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import {
  create,
  list,
  myFaculty,
  myPrograms,
  myStatistics,
  partners,
} from './college.controller.js';

export const collegeRouter = Router();

// Public college listing for registration
collegeRouter.get('/', asyncHandler(list));

// Create college — Forge Admin only
collegeRouter.post(
  '/',
  authenticate,
  authorize(Role.ForgeAdmin),
  asyncHandler(create)
);

// Partner colleges — Sponsor only
collegeRouter.get(
  '/partners',
  authenticate,
  authorize(Role.Sponsor),
  asyncHandler(partners)
);

// College programs — College Admin only
collegeRouter.get(
  '/mine/programs',
  authenticate,
  authorize(Role.CollegeAdmin),
  asyncHandler(myPrograms)
);

// College faculty — College Admin only
collegeRouter.get(
  '/mine/faculty',
  authenticate,
  authorize(Role.CollegeAdmin),
  asyncHandler(myFaculty)
);

// College student and faculty statistics — College Admin only
collegeRouter.get(
  '/mine/statistics',
  authenticate,
  authorize(Role.CollegeAdmin),
  asyncHandler(myStatistics)
);
