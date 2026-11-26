import { Router } from 'express';
import { Role } from '@forge-loom/shared-types';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { getMyStats } from './studentStats.controller.js';

export const studentStatsRouter = Router();
studentStatsRouter.get('/me', authenticate, authorize(Role.Student), asyncHandler(getMyStats));