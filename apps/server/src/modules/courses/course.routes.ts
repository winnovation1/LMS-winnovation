import { Router } from 'express';
import { Role } from '@forge-loom/shared-types';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import {
  create,
  getForEditing,
  getOne,
  list,
  listMine,
  listTeaching,
  listTrainers,
  remove,
  update,
  updateStatus,
} from './course.controller.js';
import { getRoster, listSessions } from '../sessions/session.controller.js';
import {
  create as createAssessment,
  list as listAssessments,
} from '../assessments/assessment.controller.js';

export const courseRouter = Router();

// Any authenticated role can browse/read published courses (catalog use case,
// Phase 2) — only mutation and the "mine"/"teaching" listings are role-scoped.
courseRouter.get('/', authenticate, asyncHandler(list));
courseRouter.get('/mine', authenticate, authorize(Role.CourseAdmin), asyncHandler(listMine));
courseRouter.get(
  '/trainers',
  authenticate,
  authorize(Role.CourseAdmin),
  asyncHandler(listTrainers)
);
courseRouter.get('/teaching', authenticate, authorize(Role.Trainer), asyncHandler(listTeaching));
courseRouter.get('/:id/sessions', authenticate, asyncHandler(listSessions));
courseRouter.get('/:id/roster', authenticate, authorize(Role.Trainer), asyncHandler(getRoster));
courseRouter.get('/:id/assessments', authenticate, asyncHandler(listAssessments));
courseRouter.post('/:id/assessments', authenticate, asyncHandler(createAssessment));
courseRouter.get(
  '/:id/manage',
  authenticate,
  authorize(Role.CourseAdmin),
  asyncHandler(getForEditing)
);
courseRouter.get('/:id', authenticate, asyncHandler(getOne));

courseRouter.post('/', authenticate, authorize(Role.CourseAdmin), asyncHandler(create));
courseRouter.patch('/:id', authenticate, authorize(Role.CourseAdmin), asyncHandler(update));
courseRouter.delete('/:id', authenticate, authorize(Role.CourseAdmin), asyncHandler(remove));
courseRouter.patch(
  '/:id/status',
  authenticate,
  authorize(Role.CourseAdmin),
  asyncHandler(updateStatus)
);
