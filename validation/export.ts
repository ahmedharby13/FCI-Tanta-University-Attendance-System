import { z } from 'zod';

export const exportAttendanceSchema = z.object({
  query: z.object({
    classId: z.string().min(1, 'Class ID is required'),
    format: z.enum(['excel', 'pdf'], {
      errorMap: () => ({ message: 'Format must be excel or pdf' }),
    }),
  }),
});