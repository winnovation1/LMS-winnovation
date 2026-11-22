import type { Request, Response } from 'express';
import { ApiError } from '../../utils/ApiError.js';
import { searchTalentPoolSchema, sendMessageSchema } from './talentPool.validation.js';
import * as talentPoolService from './talentPool.service.js';
import { toTalentSearchPageDto } from './talentPool.mapper.js';

function requireUser(req: Request) {
  if (!req.user) {
    throw new ApiError(401, 'Not authenticated');
  }
  return req.user;
}

function requireParam(req: Request, name: string): string {
  const value = req.params[name];
  if (!value) {
    throw new ApiError(400, `Missing required parameter: ${name}`);
  }
  return value;
}

export async function search(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  const input = searchTalentPoolSchema.parse(req.query);
  const result = await talentPoolService.searchTalentPool(user.userId, input);
  res.json(await toTalentSearchPageDto(user.userId, result));
}

export async function shortlist(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  const shortlisted = await talentPoolService.toggleShortlist(
    user.userId,
    requireParam(req, 'studentId')
  );
  res.json({ shortlisted });
}

export async function message(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  const { body } = sendMessageSchema.parse(req.body);
  const sentAt = await talentPoolService.sendMessage(
    user.userId,
    requireParam(req, 'studentId'),
    body
  );
  res.status(201).json({ sentAt: sentAt.toISOString() });
}
