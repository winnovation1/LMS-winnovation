
import { Role } from '@forge-loom/shared-types';
import type { College, Role as PrismaRole } from '@prisma/client';
import { prisma } from '../../config/prisma.js';
import { toPrismaEnum } from '../../utils/prismaEnum.js';
import type { CreateCollegeInput } from './college.validation.js';
import type {
  CollegeFacultyMemberDto,
  CollegeProgramDto,
} from '@forge-loom/shared-types';

export async function createCollege(input: CreateCollegeInput): Promise<College> {
  return prisma.college.create({
    data: {
      name: input.name,
      location: input.location,
      partnerTier: input.partnerTier ?? 'bronze',
    },
  });
}

export async function listColleges(): Promise<College[]> {
  return prisma.college.findMany({
    orderBy: { name: 'asc' },
  });
}

// College Programs
export async function getCollegePrograms(
  collegeId: string
): Promise<CollegeProgramDto[]> {
  const students = await prisma.studentProfile.findMany({
    where: { collegeId },
    select: { userId: true },
  });

  const studentIds = students.map((student) => student.userId);

  if (studentIds.length === 0) {
    return [];
  }

  const enrollments = await prisma.enrollment.groupBy({
    by: ['courseId'],
    where: {
      studentId: { in: studentIds },
      status: { in: ['active', 'completed'] },
    },
    _count: { _all: true },
  });

  const courses = await prisma.course.findMany({
    where: {
      id: { in: enrollments.map((enrollment) => enrollment.courseId) },
    },
  });

  const countByCourseId = new Map(
    enrollments.map((enrollment) => [
      enrollment.courseId,
      enrollment._count._all,
    ])
  );

  return courses.map((course) => ({
    courseId: course.id,
    title: course.title,
    status: course.status,
    studentsEnrolled: countByCourseId.get(course.id) ?? 0,
  }));
}

// Partner College Data
export interface PartnerCollegeRow {
  college: College;
  studentCount: number;
  activePhase: 'activation' | 'bootcamp' | 'citadel' | null;
  contactEmail: string | null;
}

export async function listPartnerColleges(): Promise<PartnerCollegeRow[]> {
  const colleges = await prisma.college.findMany({
    orderBy: { name: 'asc' },
  });

  const collegeIds = colleges.map((college) => college.id);

  const [studentCounts, latestCohorts, collegeAdmins] = await Promise.all([
    prisma.studentProfile.groupBy({
      by: ['collegeId'],
      where: { collegeId: { in: collegeIds } },
      _count: { _all: true },
    }),

    prisma.cohort.findMany({
      where: { collegeId: { in: collegeIds } },
      orderBy: { startDate: 'desc' },
    }),

    prisma.user.findMany({
      where: {
        role: toPrismaEnum<PrismaRole>(Role.CollegeAdmin),
        collegeId: { in: collegeIds },
      },
    }),
  ]);

  const studentCountByCollege = new Map(
    studentCounts.map((row) => [
      row.collegeId as string,
      row._count._all,
    ])
  );

  const latestPhaseByCollege = new Map<
    string,
    'activation' | 'bootcamp' | 'citadel'
  >();

  for (const cohort of latestCohorts) {
    if (!latestPhaseByCollege.has(cohort.collegeId)) {
      latestPhaseByCollege.set(cohort.collegeId, cohort.phase);
    }
  }

  const contactEmailByCollege = new Map(
    collegeAdmins
      .filter((admin) => admin.collegeId)
      .map((admin) => [admin.collegeId!, admin.email])
  );

  return colleges.map((college) => ({
    college,
    studentCount: studentCountByCollege.get(college.id) ?? 0,
    activePhase: latestPhaseByCollege.get(college.id) ?? null,
    contactEmail: contactEmailByCollege.get(college.id) ?? null,
  }));
}

// College Faculty
export async function getCollegeFaculty(
  collegeId: string
): Promise<CollegeFacultyMemberDto[]> {
  const [trainers, mentors] = await Promise.all([
    prisma.trainerProfile.findMany({
      where: { collegeId },
    }),

    prisma.mentorProfile.findMany({
      where: { collegeId },
    }),
  ]);

  const userIds = [
    ...trainers.map((trainer) => trainer.userId),
    ...mentors.map((mentor) => mentor.userId),
  ];

  const users = userIds.length
    ? await prisma.user.findMany({
        where: { id: { in: userIds } },
      })
    : [];

  const emailByUserId = new Map(
    users.map((user) => [user.id, user.email])
  );

  const [trainerWorkloads, mentorWorkloads] = await Promise.all([
    Promise.all(
      trainers.map((trainer) =>
        prisma.team.count({
          where: { trainerId: trainer.userId },
        })
      )
    ),

    Promise.all(
      mentors.map((mentor) =>
        prisma.studentProfile.count({
          where: { mentorId: mentor.id },
        })
      )
    ),
  ]);

  return [
    ...trainers.map((trainer, index) => ({
      userId: trainer.userId,
      email: emailByUserId.get(trainer.userId) ?? '',
      role: 'trainer' as const,
      workload: trainerWorkloads[index] ?? 0,
    })),

    ...mentors.map((mentor, index) => ({
      userId: mentor.userId,
      email: emailByUserId.get(mentor.userId) ?? '',
      role: 'mentor' as const,
      workload: mentorWorkloads[index] ?? 0,
    })),
  ];
}

// College Dashboard Statistics
export interface CollegeStatisticsDto {
  totalStudents: number;
  activeStudents: number;
  inactiveStudents: number;
  totalFaculty: number;
  totalTrainers: number;
  totalMentors: number;
}

export async function getCollegeStatistics(
  collegeId: string
): Promise<CollegeStatisticsDto> {
  const [students, totalTrainers, totalMentors] = await Promise.all([
    prisma.studentProfile.findMany({
      where: { collegeId },
      select: { userId: true },
    }),

    prisma.trainerProfile.count({
      where: { collegeId },
    }),

    prisma.mentorProfile.count({
      where: { collegeId },
    }),
  ]);

  const studentIds = students.map((student) => student.userId);

  const activeStudentGroups = studentIds.length
    ? await prisma.enrollment.groupBy({
        by: ['studentId'],
        where: {
          studentId: { in: studentIds },
          status: 'active',
        },
      })
    : [];

  const totalStudents = students.length;
  const activeStudents = activeStudentGroups.length;

  return {
    totalStudents,
    activeStudents,
    inactiveStudents: totalStudents - activeStudents,
    totalFaculty: totalTrainers + totalMentors,
    totalTrainers,
    totalMentors,
  };
}
