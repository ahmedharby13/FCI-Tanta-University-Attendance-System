import { z } from 'zod';

export const generateQRSchema = z.object({
  body: z.object({
    classId: z.string().nonempty('Class ID is required'),
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
    sectionId: z.string().nonempty('Section ID is required'),
    dayNumber: z.number().min(1, 'Day number must be at least 1'), // Added
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
    classId: z.string().optional(),
    sectionId: z.string().optional(),
  }),
});

export const manualAttendanceSchema = z.object({
  body: z.object({
    studentId: z.string().nonempty('Student ID is required'),
    classId: z.string().nonempty('Class ID is required'),
    sectionId: z.string().nonempty('Section ID is required'),
    status: z.enum(['present', 'absent', 'late']),
    dayNumber: z.number().min(1, 'Day number must be at least 1'),
  }),
});

export const getAttendanceStatisticsSchema = z.object({
  query: z.object({
    classId: z.string().nonempty('Class ID is required'),
  }),
});

export const createSectionSchema = z.object({
  body: z.object({
    classId: z.string().nonempty('Class ID is required'),
    name: z.string().nonempty('Name is required'),
    sectionNumber: z.number().min(1, 'Section number must be at least 1'),
    studentIds: z.array(z.string()).optional(),
  }),
});

export const updateSectionSchema = z.object({
  body: z.object({
    sectionId: z.string().nonempty('Section ID is required'),
    name: z.string().optional(),
    sectionNumber: z.number().min(1).optional(),
    studentIds: z.array(z.string()).optional(),
  }),
});

export const deleteSectionSchema = z.object({
  body: z.object({
    sectionId: z.string().nonempty('Section ID is required'),
  }),
});

export const addStudentsToSectionSchema = z.object({
  body: z.object({
    sectionId: z.string().nonempty('Section ID is required'),
    studentIds: z.array(z.string().nonempty('Student ID is required')).nonempty('At least one student ID is required'),
  }),
});

export const removeStudentsFromSectionSchema = z.object({
  body: z.object({
    sectionId: z.string().nonempty('Section ID is required'),
    studentIds: z.array(z.string().nonempty('Student ID is required')).nonempty('At least one student ID is required'),
  }),
});