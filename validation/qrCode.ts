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