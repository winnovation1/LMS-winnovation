import { Role } from '@forge-loom/shared-types';
import { Prisma, type Role as PrismaRole } from '@prisma/client';
import { prisma } from '../../config/prisma.js';
import { ApiError } from '../../utils/ApiError.js';
import { toPrismaEnum } from '../../utils/prismaEnum.js';
import type {
  CreateCourseInput,
  ListCoursesQuery,
  UpdateCourseInput,
} from './course.validation.js';
import { canViewCourse, isCourseAdminOwner, type CourseWithSyllabus } from './courseAccess.js';

type CourseStatus = 'draft' | 'published' | 'archived';

// draft -> published -> archived only. There's no stated use case for moving
// backwards (e.g. un-publishing), so that's rejected rather than silently
// allowed — disclosed here since the roadmap didn't spell out the transition
// rules explicitly.
const ALLOWED_STATUS_TRANSITIONS: Record<CourseStatus, CourseStatus[]> = {
  draft: ['published'],
  published: ['archived'],
  archived: [],
};

const SYLLABUS_INCLUDE = { syllabus: { orderBy: { dayNumber: 'asc' as const } } };

async function getOwnCourseAdminProfile(userId: string) {
  const profile = await prisma.courseAdminProfile.findUnique({ where: { userId } });
  if (!profile) {
    throw new ApiError(404, 'Course admin profile not found');
  }
  return profile;
}

async function getOwnedCourse(
  courseId: string,
  courseAdminProfileId: string
): Promise<CourseWithSyllabus> {
  const course = await prisma.course.findUnique({ where: { id: courseId }, include: SYLLABUS_INCLUDE });
  if (!course) {
    throw new ApiError(404, 'Course not found');
  }
  if (course.createdBy !== courseAdminProfileId) {
    throw new ApiError(403, 'You do not have access to this course');
  }
  return course;
}

async function resolveTrainerId(trainerEmail: string): Promise<string> {
  const trainer = await prisma.user.findFirst({
    where: {
      email: { equals: trainerEmail.trim(), mode: 'insensitive' },
      role: toPrismaEnum<PrismaRole>(Role.Trainer),
    },
  });
  if (!trainer) {
    throw new ApiError(400, `No trainer account found for ${trainerEmail}`);
  }
  return trainer.id;
}

export async function createCourse(
  userId: string,
  input: CreateCourseInput
): Promise<CourseWithSyllabus> {
  const profile = await getOwnCourseAdminProfile(userId);

  const syllabus = (input.syllabus ?? []).map((day) => ({
    dayNumber: day.dayNumber,
    title: day.title,
    description: day.description,
    youtubeVideoId: day.youtubeVideoId ?? null,
  }));

  const trainerId = input.trainerEmail ? await resolveTrainerId(input.trainerEmail) : null;

  return prisma.course.create({
    data: {
      title: input.title,
      description: input.description,
      createdBy: profile.id,
      deliveryMode: input.deliveryMode,
      durationHours: input.durationHours,
      durationDays: input.durationDays,
      price: input.price,
      currency: input.currency ?? 'INR',
      status: 'draft',
      trainerId,
      syllabus: { create: syllabus },
    },
    include: SYLLABUS_INCLUDE,
  });
}

/**
 * Deletes a draft or archived course that nobody has used. Anything with
 * history attached (enrollments carry payments, certificates prove
 * completion) blocks the delete — the DB enforces this too via onDelete:
 * Restrict; this check just turns it into a message a person can act on.
 */
export async function deleteCourse(userId: string, courseId: string): Promise<void> {
  const profile = await getOwnCourseAdminProfile(userId);
  const course = await getOwnedCourse(courseId, profile.id);

  if (course.status === 'published') {
    throw new ApiError(400, 'Archive this course before deleting it.');
  }

  const [enrollments, sessions, videoProgress, assessments, certificates] = await Promise.all([
    prisma.enrollment.count({ where: { courseId } }),
    prisma.courseSession.count({ where: { courseId } }),
    prisma.videoProgress.count({ where: { courseId } }),
    prisma.assessment.count({ where: { courseId } }),
    prisma.certificate.count({ where: { courseId } }),
  ]);
  const blockers = [
    [enrollments, 'enrollment'],
    [certificates, 'certificate'],
    [assessments, 'assessment'],
    [sessions, 'session'],
    [videoProgress, 'video progress record'],
  ] as const;
  const attached = blockers
    .filter(([count]) => count > 0)
    .map(([count, noun]) => `${count} ${noun}${count === 1 ? '' : 's'}`);

  if (attached.length > 0) {
    throw new ApiError(
      409,
      `This course can't be deleted because it has ${attached.join(', ')}. It stays archived so students keep their history.`
    );
  }

  try {
    // Syllabus days cascade.
    await prisma.course.delete({ where: { id: courseId } });
  } catch (err) {
    // Something got attached between the check and the delete.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2003') {
      throw new ApiError(409, 'This course is now in use and can no longer be deleted.');
    }
    throw err;
  }
}

/** The editor's read: only the owning course admin, whatever the status. */
export async function getCourseForEditing(
  userId: string,
  courseId: string
): Promise<CourseWithSyllabus> {
  const profile = await getOwnCourseAdminProfile(userId);
  return getOwnedCourse(courseId, profile.id);
}

export async function updateCourse(
  userId: string,
  courseId: string,
  input: UpdateCourseInput
): Promise<CourseWithSyllabus> {
  const profile = await getOwnCourseAdminProfile(userId);
  const course = await getOwnedCourse(courseId, profile.id);

  // Archived is a final state — students may still be using the material, and
  // there's no way back to draft, so the content is frozen.
  if (course.status === 'archived') {
    throw new ApiError(400, "Archived courses can't be edited.");
  }

  const trainerId =
    input.trainerEmail === undefined
      ? undefined
      : input.trainerEmail === null
        ? null
        : await resolveTrainerId(input.trainerEmail);

  const fieldUpdates = {
    ...(input.title !== undefined && { title: input.title }),
    ...(input.description !== undefined && { description: input.description }),
    ...(input.deliveryMode !== undefined && { deliveryMode: input.deliveryMode }),
    ...(input.durationHours !== undefined && { durationHours: input.durationHours }),
    ...(input.durationDays !== undefined && { durationDays: input.durationDays }),
    ...(input.price !== undefined && { price: input.price }),
    ...(input.currency !== undefined && { currency: input.currency }),
    ...(trainerId !== undefined && { trainerId }),
  };

  const plan =
    input.syllabus !== undefined
      ? await planSyllabusChange(course, input.syllabus)
      : null;

  if (!plan && Object.keys(fieldUpdates).length === 0) {
    return course;
  }

  const effectiveTrainerId = trainerId !== undefined ? trainerId : course.trainerId;

  await prisma.$transaction(
    async (tx) => {
      if (Object.keys(fieldUpdates).length > 0) {
        await tx.course.update({ where: { id: courseId }, data: fieldUpdates });
      }

      // Reassigning the trainer hands over the sessions that haven't happened
      // yet. Completed/cancelled sessions keep their trainer as a historical
      // record of who actually ran (or would have run) that day.
      if (trainerId !== undefined) {
        await tx.courseSession.updateMany({
          where: { courseId, status: 'scheduled' },
          data: { trainerId },
        });
      }

      if (!plan) return;

      // Days keep their id across saves, so a day that moves stays the same
      // row; recreating is just the simplest way past the
      // (courseId, dayNumber) unique constraint while numbers shuffle.
      await tx.syllabusDay.deleteMany({ where: { courseId } });
      await tx.syllabusDay.createMany({ data: plan.rows.map((row) => ({ ...row, courseId })) });

      // Video progress is keyed by dayNumber, so it has to follow its day:
      // drop progress for removed days, then renumber moved days in two steps
      // (via negative numbers) to avoid unique-key collisions mid-shuffle.
      await tx.videoProgress.deleteMany({
        where: { courseId, dayNumber: { notIn: [...plan.keptOldNumbers] } },
      });
      for (const [oldNumber, newNumber] of plan.moves) {
        await tx.videoProgress.updateMany({
          where: { courseId, dayNumber: oldNumber },
          data: { dayNumber: -newNumber },
        });
      }
      if (plan.moves.size > 0) {
        await tx.videoProgress.updateMany({
          where: { courseId, dayNumber: { lt: 0 } },
          data: { dayNumber: { multiply: -1 } },
        });
      }

      // Offline sessions are dated slots ("Day N"), so they stay put while the
      // content moves. Only the number of slots needs to follow the syllabus.
      await syncSessionSlots(tx, courseId, plan.newNumbers, effectiveTrainerId);
    },
    { timeout: 20_000 }
  );

  return prisma.course.findUniqueOrThrow({ where: { id: courseId }, include: SYLLABUS_INCLUDE });
}

type SyllabusInput = NonNullable<UpdateCourseInput['syllabus']>;
type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

interface SyllabusPlan {
  rows: {
    id?: string;
    dayNumber: number;
    title: string;
    description: string | undefined;
    youtubeVideoId: string | null;
  }[];
  /** old dayNumber -> new dayNumber, for kept days whose number changed */
  moves: Map<number, number>;
  /** dayNumbers (before the edit) of days that survive the edit */
  keptOldNumbers: Set<number>;
  newNumbers: number[];
}

async function planSyllabusChange(
  course: CourseWithSyllabus,
  incoming: SyllabusInput
): Promise<SyllabusPlan> {
  const existingById = new Map(course.syllabus.map((day) => [day.id, day]));
  const incomingById = new Map(
    incoming.filter((day) => day.id).map((day) => [day.id as string, day])
  );

  for (const id of incomingById.keys()) {
    if (!existingById.has(id)) {
      throw new ApiError(
        409,
        'This syllabus was changed elsewhere since you opened it. Reload the page and try again.'
      );
    }
  }

  // A day whose session already happened (or was cancelled) has attendance
  // history tied to its slot, so it must stay where it is.
  const heldSessions = await prisma.courseSession.findMany({
    where: { courseId: course.id, status: { not: 'scheduled' } },
    orderBy: { dayNumber: 'asc' },
  });
  for (const session of heldSessions) {
    const day = course.syllabus.find((d) => d.dayNumber === session.dayNumber);
    if (!day) continue;
    const after = incomingById.get(day.id);
    if (!after || after.dayNumber !== day.dayNumber) {
      throw new ApiError(
        400,
        `Day ${day.dayNumber} ("${day.title}") already has a ${session.status} session, so it can't be moved or removed.`
      );
    }
  }

  const moves = new Map<number, number>();
  const keptOldNumbers = new Set<number>();
  for (const [id, day] of incomingById) {
    const before = existingById.get(id)!;
    keptOldNumbers.add(before.dayNumber);
    if (before.dayNumber !== day.dayNumber) {
      moves.set(before.dayNumber, day.dayNumber);
    }
  }

  return {
    rows: incoming.map((day) => ({
      ...(day.id && { id: day.id }),
      dayNumber: day.dayNumber,
      title: day.title,
      description: day.description,
      youtubeVideoId: day.youtubeVideoId ?? null,
    })),
    moves,
    keptOldNumbers,
    newNumbers: incoming.map((day) => day.dayNumber),
  };
}

async function syncSessionSlots(
  tx: Tx,
  courseId: string,
  newNumbers: number[],
  trainerId: string | null
): Promise<void> {
  const sessions = await tx.courseSession.findMany({
    where: { courseId },
    orderBy: { dayNumber: 'asc' },
  });
  // No sessions yet means none have been materialized (online course, or no
  // enrollments so far) — ensureSessionsForCourse will build them later.
  const anchor = sessions[0];
  if (!anchor) return;

  const wanted = new Set(newNumbers);
  await tx.courseSession.deleteMany({
    where: {
      courseId,
      status: 'scheduled',
      dayNumber: { notIn: newNumbers },
      attendanceRecords: { none: {} },
    },
  });

  const have = new Set(sessions.map((s) => s.dayNumber));
  const missing = [...wanted].filter((n) => !have.has(n));
  if (missing.length === 0) return;

  const DAY_MS = 24 * 60 * 60 * 1000;
  await tx.courseSession.createMany({
    data: missing.map((dayNumber) => ({
      courseId,
      dayNumber,
      scheduledDate: new Date(anchor.scheduledDate.getTime() + (dayNumber - anchor.dayNumber) * DAY_MS),
      mode: 'offline' as const,
      status: 'scheduled' as const,
      trainerId,
    })),
  });
}

export async function updateCourseStatus(
  userId: string,
  courseId: string,
  nextStatus: CourseStatus
): Promise<CourseWithSyllabus> {
  const profile = await getOwnCourseAdminProfile(userId);
  const course = await getOwnedCourse(courseId, profile.id);

  const allowed = ALLOWED_STATUS_TRANSITIONS[course.status as CourseStatus];
  if (!allowed.includes(nextStatus)) {
    throw new ApiError(400, `Cannot move a course from "${course.status}" to "${nextStatus}"`);
  }

  if (nextStatus === 'published' && course.syllabus.length === 0) {
    throw new ApiError(400, 'Add at least one syllabus day before publishing this course.');
  }

  return prisma.course.update({
    where: { id: courseId },
    data: { status: nextStatus },
    include: SYLLABUS_INCLUDE,
  });
}

export interface CourseStats {
  enrolledCount: number;
  completedCount: number;
  pendingPaymentCount: number;
  revenue: number;
}

export interface OwnedCourseRow {
  course: CourseWithSyllabus;
  stats: CourseStats;
  trainerEmail: string | null;
}

export async function listMyCourses(userId: string): Promise<OwnedCourseRow[]> {
  const profile = await getOwnCourseAdminProfile(userId);
  const courses = await prisma.course.findMany({
    where: { createdBy: profile.id },
    orderBy: { createdAt: 'desc' },
    include: { ...SYLLABUS_INCLUDE, trainer: { select: { email: true } } },
  });

  const grouped = await prisma.enrollment.groupBy({
    by: ['courseId', 'status'],
    where: { courseId: { in: courses.map((c) => c.id) } },
    _count: { _all: true },
    _sum: { paymentAmount: true },
  });

  const statsByCourse = new Map<string, CourseStats>();
  for (const row of grouped) {
    const stats = statsByCourse.get(row.courseId) ?? {
      enrolledCount: 0,
      completedCount: 0,
      pendingPaymentCount: 0,
      revenue: 0,
    };
    const count = row._count._all;
    if (row.status === 'active' || row.status === 'completed') {
      stats.enrolledCount += count;
      stats.revenue += row._sum.paymentAmount?.toNumber() ?? 0;
    }
    if (row.status === 'completed') stats.completedCount += count;
    if (row.status === 'pending_payment') stats.pendingPaymentCount += count;
    statsByCourse.set(row.courseId, stats);
  }

  return courses.map(({ trainer, ...course }) => ({
    course,
    trainerEmail: trainer?.email ?? null,
    stats: statsByCourse.get(course.id) ?? {
      enrolledCount: 0,
      completedCount: 0,
      pendingPaymentCount: 0,
      revenue: 0,
    },
  }));
}

export interface TrainerOption {
  id: string;
  email: string;
  collegeName?: string;
}

export async function listAssignableTrainers(): Promise<TrainerOption[]> {
  const trainers = await prisma.user.findMany({
    where: { role: toPrismaEnum<PrismaRole>(Role.Trainer), status: 'active' },
    orderBy: { email: 'asc' },
    select: { id: true, email: true, college: { select: { name: true } } },
  });
  return trainers.map((t) => ({ id: t.id, email: t.email, collegeName: t.college?.name }));
}

export async function listTeachingCourses(trainerUserId: string): Promise<CourseWithSyllabus[]> {
  return prisma.course.findMany({
    where: { trainerId: trainerUserId },
    orderBy: { createdAt: 'desc' },
    include: SYLLABUS_INCLUDE,
  });
}

export interface CourseListPage {
  courses: CourseWithSyllabus[];
  nextCursor: string | null;
}

export async function listPublishedCourses(query: ListCoursesQuery): Promise<CourseListPage> {
  const limit = query.limit ?? 20;

  const rows = await prisma.course.findMany({
    where: {
      status: 'published',
      ...(query.deliveryMode && { deliveryMode: query.deliveryMode }),
      ...(query.cursor && { createdAt: { lt: new Date(query.cursor) } }),
    },
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
    include: SYLLABUS_INCLUDE,
  });

  const hasMore = rows.length > limit;
  const courses = hasMore ? rows.slice(0, limit) : rows;
  const last = courses[courses.length - 1];

  return {
    courses,
    nextCursor: hasMore && last ? last.createdAt.toISOString() : null,
  };
}

export async function getCourseById(
  courseId: string,
  viewer: { userId: string; role: string }
): Promise<CourseWithSyllabus> {
  const course = await prisma.course.findUnique({ where: { id: courseId }, include: SYLLABUS_INCLUDE });
  if (!course) {
    throw new ApiError(404, 'Course not found');
  }

  if (course.status === 'published') {
    return course;
  }

  // Archiving takes a course off the catalog, but the people already in it
  // (enrolled students, its trainer) keep access to the material.
  if (course.status === 'archived' && (await canViewCourse(course, viewer))) {
    return course;
  }

  // Drafts are only visible to the course_admin who owns them.
  if (await isCourseAdminOwner(course, viewer.userId)) {
    return course;
  }

  throw new ApiError(404, 'Course not found');
}
