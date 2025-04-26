import { z } from 'zod';
import { isValidObjectId } from 'mongoose';

const objectIdSchema = z
  .string()
  .nonempty('ID cannot be empty')
  .refine((value) => isValidObjectId(value), { message: 'Invalid MongoDB ObjectId' });

export const generateQRSchema = z.object({
  body: z.object({
    classId: objectIdSchema,
    sectionNumber: z.number().min(1, 'Section number must be at least 1'),
    dayNumber: z.number().min(1, 'Day number must be at least 1'),
    location: z.object({
      longitude: z.number(),
      latitude: z.number(),
      name: z.string().optional(),
      radius: z.number().optional(),
    }),
  }),
});

export const closeQRSchema = z.object({
  body: z.object({
    sectionId: objectIdSchema,
    dayNumber: z.number().min(1, 'Day number must be at least 1'),
  }),
});

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

export const createSectionSchema = z.object({
  body: z.object({
    classId: objectIdSchema,
    sectionNumber: z.number().min(1, 'Section number must be at least 1'),
    dayNumber: z.number().min(1).optional(),
    studentIds: z.array(objectIdSchema).optional(),
  }),
});

export const updateSectionSchema = z.object({
  body: z.object({
    sectionId: objectIdSchema,
    sectionNumber: z.number().min(1).optional(),
    dayNumber: z.number().min(1).optional(),
    studentIds: z.array(objectIdSchema).optional(),
  }),
});

export const deleteSectionSchema = z.object({
  body: z.object({
    sectionId: objectIdSchema,
  }),
});

export const addStudentsToSectionSchema = z.object({
  body: z.object({
    sectionId: objectIdSchema,
    studentIds: z.array(objectIdSchema).min(1, 'At least one student ID is required'),
  }),
});

export const removeStudentsFromSectionSchema = z.object({
  body: z.object({
    sectionId: objectIdSchema,
    studentIds: z.array(objectIdSchema).min(1, 'At least one student ID is required'),
  }),
});