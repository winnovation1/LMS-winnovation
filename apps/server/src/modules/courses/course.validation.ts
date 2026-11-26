import { z } from 'zod';
import { parseYouTubeVideoId } from '@forge-loom/shared-types';

// Accepts a bare video id or any YouTube URL and stores just the 11-char id.
// Empty string means "no video".
const youtubeVideoIdSchema = z
  .string()
  .optional()
  .transform((value, ctx) => {
    if (value === undefined || value.trim() === '') return undefined;
    const id = parseYouTubeVideoId(value);
    if (!id) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Not a valid YouTube link or video ID' });
      return z.NEVER;
    }
    return id;
  });

export const syllabusDaySchema = z.object({
  id: z.string().min(1).optional(),
  dayNumber: z.number().int().positive(),
  title: z.string().trim().min(1, 'Every syllabus day needs a title'),
  description: z.string().optional(),
  youtubeVideoId: youtubeVideoIdSchema,
});

const syllabusSchema = z.array(syllabusDaySchema).superRefine((days, ctx) => {
  const seenNumbers = new Set<number>();
  const seenIds = new Set<string>();
  days.forEach((day, index) => {
    if (seenNumbers.has(day.dayNumber)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Day ${day.dayNumber} appears more than once`,
        path: [index, 'dayNumber'],
      });
    }
    seenNumbers.add(day.dayNumber);
    if (day.id) {
      if (seenIds.has(day.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'The same syllabus day was sent twice',
          path: [index, 'id'],
        });
      }
      seenIds.add(day.id);
    }
  });
});

// Matches the DB column: price is Decimal(10, 2).
const MAX_PRICE = 99_999_999.99;

const wholeNumber = (label: string, max: number) =>
  z
    .number()
    .int(`${label} must be a whole number`)
    .min(0, `${label} can't be negative`)
    .max(max, `${label} can't be more than ${max.toLocaleString('en-US')}`);

export const createCourseSchema = z.object({
  title: z.string().trim().min(1, 'Course title is required').max(200, 'Course title is too long'),
  description: z.string().optional(),
  deliveryMode: z.enum(['online', 'offline']),
  durationHours: wholeNumber('Duration (hours)', 10_000),
  durationDays: wholeNumber('Duration (days)', 3_650),
  price: z
    .number()
    .min(0, "Price can't be negative")
    .max(MAX_PRICE, `Price can't be more than ${MAX_PRICE.toLocaleString('en-US')}`)
    .refine(
      (value) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-6,
      'Price can have at most 2 decimal places'
    ),
  currency: z.string().min(1).optional(),
  syllabus: syllabusSchema.optional(),
  // Resolved server-side to a Trainer's userId — omit to leave the current
  // assignment (if any) unchanged; there's no dedicated faculty picker UI
  // yet (that's Phase 6), so an email is the minimal input for now.
  trainerEmail: z.string().email().optional(),
});

export const updateCourseSchema = createCourseSchema.partial().extend({
  // undefined = leave unchanged, null = unassign the current trainer.
  trainerEmail: z.string().email().nullable().optional(),
});

export const updateCourseStatusSchema = z.object({
  status: z.enum(['draft', 'published', 'archived']),
});

export const listCoursesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).optional(),
  cursor: z.string().optional(),
  deliveryMode: z.enum(['online', 'offline']).optional(),
});

export type CreateCourseInput = z.infer<typeof createCourseSchema>;
export type UpdateCourseInput = z.infer<typeof updateCourseSchema>;
export type UpdateCourseStatusInput = z.infer<typeof updateCourseStatusSchema>;
export type ListCoursesQuery = z.infer<typeof listCoursesQuerySchema>;
