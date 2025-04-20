"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.changePasswordValidation = exports.resetPasswordValidation = exports.forgotPasswordValidation = exports.loginValidation = exports.registerValidation = void 0;
const zod_1 = require("zod");
const user_1 = require("../models/user");
exports.registerValidation = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().min(1, 'Name is required'),
        email: zod_1.z.string().email('Invalid email address'),
        password: zod_1.z.string().min(6, 'Password must be at least 6 characters'),
        role: zod_1.z.enum(Object.values(user_1.UserRole)).optional(),
        studentId: zod_1.z.string().optional(),
        department: zod_1.z.string().optional(),
    }),
});
exports.loginValidation = zod_1.z.object({
    body: zod_1.z.object({
        email: zod_1.z.string().email('Invalid email address'),
        password: zod_1.z.string().min(1, 'Password is required'),
    }),
});
exports.forgotPasswordValidation = zod_1.z.object({
    body: zod_1.z.object({
        email: zod_1.z.string().email('Invalid email address'),
    }),
});
exports.resetPasswordValidation = zod_1.z.object({
    body: zod_1.z.object({
        password: zod_1.z.string().min(6, 'Password must be at least 6 characters'),
    }),
});
exports.changePasswordValidation = zod_1.z.object({
    body: zod_1.z.object({
        currentPassword: zod_1.z.string().min(1, 'Current password is required'),
        newPassword: zod_1.z.string().min(6, 'New password must be at least 6 characters'),
    }),
});
