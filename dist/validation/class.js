"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteClassSchema = exports.updateClassSchema = exports.removeStudentsSchema = exports.addStudentsSchema = exports.createClassSchema = void 0;
const zod_1 = require("zod");
const mongoose_1 = require("mongoose");
const objectIdSchema = zod_1.z.string().refine((value) => (0, mongoose_1.isValidObjectId)(value), { message: 'Invalid MongoDB ObjectId' });
exports.createClassSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().min(1, 'Class name is required').trim(),
        teacherId: objectIdSchema,
        semester: zod_1.z.string().min(1, 'Semester is required').trim(),
    }),
});
exports.addStudentsSchema = zod_1.z.object({
    body: zod_1.z.object({
        classId: objectIdSchema,
        studentIds: zod_1.z
            .array(zod_1.z.string().min(1, 'Student ID is required'))
            .min(1, 'At least one student ID is required'),
    }),
});
exports.removeStudentsSchema = zod_1.z.object({
    body: zod_1.z.object({
        classId: objectIdSchema,
        studentIds: zod_1.z
            .array(zod_1.z.string().min(1, 'Student ID is required'))
            .min(1, 'At least one student ID is required'),
    }),
});
exports.updateClassSchema = zod_1.z.object({
    body: zod_1.z.object({
        classId: objectIdSchema,
        name: zod_1.z.string().min(1, 'Class name is required').trim().optional(),
        teacherId: objectIdSchema.optional(),
        semester: zod_1.z.string().min(1, 'Semester is required').trim().optional(),
        status: zod_1.z.enum(['active', 'ended']).optional(),
    }),
});
exports.deleteClassSchema = zod_1.z.object({
    body: zod_1.z.object({
        classId: objectIdSchema,
    }),
});
