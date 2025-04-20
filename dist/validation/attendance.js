"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeStudentsFromSectionSchema = exports.addStudentsToSectionSchema = exports.deleteSectionSchema = exports.updateSectionSchema = exports.createSectionSchema = exports.getAttendanceStatisticsSchema = exports.manualAttendanceSchema = exports.getAttendanceSchema = exports.verifyQRSchema = exports.closeQRSchema = exports.generateQRSchema = void 0;
const zod_1 = require("zod");
exports.generateQRSchema = zod_1.z.object({
    body: zod_1.z.object({
        classId: zod_1.z.string().nonempty('Class ID is required'),
        sectionNumber: zod_1.z.number().min(1, 'Section number must be at least 1'),
        dayNumber: zod_1.z.number().min(1, 'Day number must be at least 1'),
        location: zod_1.z.object({
            longitude: zod_1.z.number(),
            latitude: zod_1.z.number(),
            name: zod_1.z.string().optional(),
            radius: zod_1.z.number().optional(),
        }),
    }),
});
exports.closeQRSchema = zod_1.z.object({
    body: zod_1.z.object({
        sectionId: zod_1.z.string().nonempty('Section ID is required'),
        dayNumber: zod_1.z.number().min(1, 'Day number must be at least 1'), // Added
    }),
});
exports.verifyQRSchema = zod_1.z.object({
    params: zod_1.z.object({
        code: zod_1.z.string().nonempty('QR code is required'),
    }),
    body: zod_1.z.object({
        location: zod_1.z.object({
            longitude: zod_1.z.number(),
            latitude: zod_1.z.number(),
        }),
        fingerprint: zod_1.z.string().nonempty('Fingerprint is required'),
    }),
});
exports.getAttendanceSchema = zod_1.z.object({
    query: zod_1.z.object({
        classId: zod_1.z.string().optional(),
        sectionId: zod_1.z.string().optional(),
    }),
});
exports.manualAttendanceSchema = zod_1.z.object({
    body: zod_1.z.object({
        studentId: zod_1.z.string().nonempty('Student ID is required'),
        classId: zod_1.z.string().nonempty('Class ID is required'),
        sectionId: zod_1.z.string().nonempty('Section ID is required'),
        status: zod_1.z.enum(['present', 'absent', 'late']),
        dayNumber: zod_1.z.number().min(1, 'Day number must be at least 1'),
    }),
});
exports.getAttendanceStatisticsSchema = zod_1.z.object({
    query: zod_1.z.object({
        classId: zod_1.z.string().nonempty('Class ID is required'),
    }),
});
exports.createSectionSchema = zod_1.z.object({
    body: zod_1.z.object({
        classId: zod_1.z.string().nonempty('Class ID is required'),
        name: zod_1.z.string().nonempty('Name is required'),
        sectionNumber: zod_1.z.number().min(1, 'Section number must be at least 1'),
        studentIds: zod_1.z.array(zod_1.z.string()).optional(),
    }),
});
exports.updateSectionSchema = zod_1.z.object({
    body: zod_1.z.object({
        sectionId: zod_1.z.string().nonempty('Section ID is required'),
        name: zod_1.z.string().optional(),
        sectionNumber: zod_1.z.number().min(1).optional(),
        studentIds: zod_1.z.array(zod_1.z.string()).optional(),
    }),
});
exports.deleteSectionSchema = zod_1.z.object({
    body: zod_1.z.object({
        sectionId: zod_1.z.string().nonempty('Section ID is required'),
    }),
});
exports.addStudentsToSectionSchema = zod_1.z.object({
    body: zod_1.z.object({
        sectionId: zod_1.z.string().nonempty('Section ID is required'),
        studentIds: zod_1.z.array(zod_1.z.string().nonempty('Student ID is required')).nonempty('At least one student ID is required'),
    }),
});
exports.removeStudentsFromSectionSchema = zod_1.z.object({
    body: zod_1.z.object({
        sectionId: zod_1.z.string().nonempty('Section ID is required'),
        studentIds: zod_1.z.array(zod_1.z.string().nonempty('Student ID is required')).nonempty('At least one student ID is required'),
    }),
});
