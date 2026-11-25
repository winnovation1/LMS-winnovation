export type CourseDeliveryMode = 'online' | 'offline';
export type CourseStatus = 'draft' | 'published' | 'archived';

export interface CourseAdminProfileDto {
  name: string;
  department: string | null;
}

export interface SyllabusDayDto {
  // Stable identity of a saved day. Send it back on update so student progress
  // follows the day when it's moved; omit it for newly added days.
  id?: string;
  dayNumber: number;
  title: string;
  description?: string;
  // Online-only: the syllabus day's video (Phase 4). Unlisted YouTube videos
  // only — Private videos fail to embed for students.
  youtubeVideoId?: string;
}

export interface CourseDto {
  id: string;
  title: string;
  description?: string;
  deliveryMode: CourseDeliveryMode;
  durationHours: number;
  durationDays: number;
  price: number;
  currency: string;
  status: CourseStatus;
  syllabus: SyllabusDayDto[];
  // The Trainer assigned to teach this course (Phase 3) — null until a
  // course_admin assigns one. No dedicated faculty/roster system exists yet
  // (that's Phase 6); this is the minimal bridge until then.
  trainerId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CourseStatsDto {
  /** Active + completed enrollments (i.e. students who have paid / been admitted). */
  enrolledCount: number;
  completedCount: number;
  pendingPaymentCount: number;
  /** Sum of payments from active + completed enrollments, in the course's currency. */
  revenue: number;
}

/** A course as listed for its owning course_admin (GET /api/courses/mine). */
export interface CourseAdminCourseDto extends CourseDto {
  stats: CourseStatsDto;
  trainerEmail: string | null;
}

/** An assignable trainer for the course editor's dropdown. */
export interface TrainerOptionDto {
  id: string;
  email: string;
  collegeName?: string;
}

export interface CourseListPageDto {
  courses: CourseDto[];
  nextCursor: string | null;
}
