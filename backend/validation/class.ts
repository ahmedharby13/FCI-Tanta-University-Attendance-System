// Validation schemas for class-related endpoints
import { z } from 'zod';
import { isValidObjectId } from 'mongoose';

const objectIdSchema = z
  .string()
  .nonempty('ID cannot be empty')
  .refine((value) => isValidObjectId(value), { message: 'Invalid MongoDB ObjectId' });

export const createClassSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Class name is required').trim(),
    teacherId: objectIdSchema,
    semester: z.string().min(1, 'Semester is required').trim(),
  }),
});

export const addStudentsSchema = z.object({
  body: z.object({
    classId: objectIdSchema,
    studentIds: z.array(objectIdSchema).min(1, 'At least one student ID is required'),
  }),
});

export const removeStudentsSchema = z.object({
  body: z.object({
    classId: objectIdSchema,
    studentIds: z.array(objectIdSchema).min(1, 'At least one student ID is required'),
  }),
});

export const updateClassSchema = z.object({
  body: z.object({
    classId: objectIdSchema,
    name: z.string().min(1, 'Class name is required').trim().optional(),
    teacherId: objectIdSchema.optional(),
    semester: z.string().min(1, 'Semester is required').trim().optional(),
    status: z.enum(['active', 'ended']).optional(),
  }),
});

export const deleteClassSchema = z.object({
  body: z.object({
    classId: objectIdSchema,
  }),
});