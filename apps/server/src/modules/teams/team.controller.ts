import type { Request, Response } from 'express';
import { Role } from '@forge-loom/shared-types';
import { ApiError } from '../../utils/ApiError.js';
import { createTeamSchema, updateTeamSchema } from './team.validation.js';
import * as teamService from './team.service.js';
import { toTeamDto } from './team.mapper.js';

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

export async function myStudents(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  const profiles = await teamService.getMentorAssignedStudents(user.userId);
  
  const students = profiles.map((p) => {
    const primaryTeam = p.teamMemberships[0]?.team;
    const sprints = primaryTeam?.sprints ?? [];
    const avgProgress = sprints.length > 0
      ? Math.round(sprints.reduce((acc, s) => acc + s.progressPercent, 0) / sprints.length)
      : 0;
      
    const status = avgProgress >= 50 ? 'on_track' : avgProgress > 0 ? 'at_risk' : 'not_started';

    return {
      id: p.userId,
      name: p.name,
      team: primaryTeam?.name ?? 'No Team',
      course: primaryTeam?.problemStatement?.title ?? p.course ?? 'Citadel Project',
      score: p.builderScore,
      lastActivityLabel: 'Recent',
      status,
    };
  });

  const profileMap: Record<string, any> = {};
  for (const p of profiles) {
    const primaryTeam = p.teamMemberships[0]?.team;
    const sprints = primaryTeam?.sprints ?? [];
    const avgProgress = sprints.length > 0
      ? Math.round(sprints.reduce((acc, s) => acc + s.progressPercent, 0) / sprints.length)
      : 0;

    profileMap[p.userId] = {
      id: p.userId,
      name: p.name,
      team: primaryTeam?.name ?? 'No Team',
      courses: [
        {
          name: primaryTeam?.problemStatement?.title ?? p.course ?? 'Citadel Project',
          progressPercent: avgProgress,
        },
      ],
      upcomingSessionLabel: 'No upcoming session',
      feedbackHistory: [],
    };
  }

  res.json({ students, profiles: profileMap });
}
export async function create(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  if (!user.collegeId) {
    throw new ApiError(403, 'This account is not associated with a college');
  }
  const input = createTeamSchema.parse(req.body);
  const team = await teamService.createTeam(user.collegeId, input);
  res.status(201).json({ team: await toTeamDto(team) });
}

export async function list(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);

  let filter: teamService.TeamListFilter;
  if (user.role === Role.ForgeAdmin) {
    filter = typeof req.query.collegeId === 'string' ? { collegeId: req.query.collegeId } : {};
  } else if (user.role === Role.CollegeAdmin) {
    if (!user.collegeId) {
      throw new ApiError(403, 'This account is not associated with a college');
    }
    filter = { collegeId: user.collegeId };
  } else if (user.role === Role.Trainer) {
    filter = { trainerId: user.userId };
  } else if (user.role === Role.Mentor) {
    filter = { mentorId: user.userId };
  } else if (user.role === Role.Student) {
    filter = { memberStudentId: user.userId };
  } else {
    throw new ApiError(403, 'You do not have access to this resource');
  }

  const teams = await teamService.listTeams(filter);
  res.json({ teams: await Promise.all(teams.map(toTeamDto)) });
}

export async function update(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  const input = updateTeamSchema.parse(req.body);
  const team = await teamService.updateTeam(requireParam(req, 'id'), user, input);
  res.json({ team: await toTeamDto(team) });
}
