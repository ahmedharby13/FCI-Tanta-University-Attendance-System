import { z } from 'zod';
import { isValidObjectId } from 'mongoose';

const objectIdSchema = z
  .string()
  .nonempty('ID cannot be empty')
  .refine((value) => isValidObjectId(value), { message: 'Invalid MongoDB ObjectId' });



export const verifyQRSchema = z.object({
  params: z.object({
    code: z.string().nonempty('QR code is required'),
  }),
  body: z.object({
    location: z.object({
      longitude: z.number(),
      latitude: z.number(),
    }),
    fingerprint: z.string().nonempty('Fingerprint is required'),
  }),
});

export const getAttendanceSchema = z.object({
  query: z.object({
    classId: objectIdSchema.optional(),
    sectionId: objectIdSchema.optional(),
  }),
});

export const manualAttendanceSchema = z.object({
  body: z.object({
    studentId: objectIdSchema,
    classId: objectIdSchema,
    sectionId: objectIdSchema,
    status: z.enum(['present', 'absent', 'late']),
    dayNumber: z.number().min(1, 'Day number must be at least 1'),
  }),
});

export const getAttendanceStatisticsSchema = z.object({
  query: z.object({
    classId: objectIdSchema,
  }),
});

