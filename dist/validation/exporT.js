"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportAttendanceSchema = void 0;
// validation/export.ts
const zod_1 = require("zod");
exports.exportAttendanceSchema = zod_1.z.object({
    query: zod_1.z.object({
        classId: zod_1.z.string().min(1, 'Class ID is required'),
        format: zod_1.z.enum(['excel', 'pdf'], {
            errorMap: () => ({ message: 'Format must be excel or pdf' }),
        }),
    }),
});
