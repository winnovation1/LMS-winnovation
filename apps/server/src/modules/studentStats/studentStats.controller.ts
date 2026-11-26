import type{ Request, Response} from 'express';
import {prisma} from '../../config/prisma.js';
import{ApiError} from '../../utils/ApiError.js';

export async function getMyStats(req: Request, res:Response):Promise<void>{
 if (!req.user) {
throw new ApiError(401, 'Not authenticated');   
}
const userId =req.user.userId;
const profile =await prisma.studentProfile.findUnique({ where:{userId}});
const coursesEnrolled = await prisma.enrollment.count({where:{studentId:userId}});
res.json({
    coursesEnrolled,
    tasksCompleted: 0,
    currentStreak: profile?.currentStreak ?? 0,
    xpEarned: profile?.xp ?? 0,
})
}