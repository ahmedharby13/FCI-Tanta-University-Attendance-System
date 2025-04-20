"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.allowTo = exports.getMe = exports.updatePassword = exports.login = exports.register = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const user_1 = require("../models/user");
const asyncHandler_1 = require("../utils/asyncHandler");
const logger_1 = __importDefault(require("../utils/logger"));
exports.register = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { name, email, password, studentId, department, role } = req.body;
    const existingUser = await user_1.User.findOne({ email });
    if (existingUser) {
        throw new Error('Email already registered');
    }
    // Determine the role to assign
    const assignedRole = role || user_1.UserRole.STUDENT;
    // If creating a student account, verify authentication and role
    if (assignedRole === user_1.UserRole.STUDENT) {
        let token;
        if (req.headers.authorization?.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }
        if (!token) {
            throw new Error('No token provided for student account creation');
        }
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            logger_1.default.error('Environment variable JWT_SECRET is missing');
            throw new Error('Internal server error');
        }
        try {
            const decoded = jsonwebtoken_1.default.verify(token, jwtSecret);
            const user = await user_1.User.findById(decoded.id);
            if (!user) {
                throw new Error('User not found');
            }
            if (![user_1.UserRole.ADMIN, user_1.UserRole.INSTRUCTOR].includes(user.role)) {
                throw new Error('Only admins or instructors can create student accounts');
            }
            req.user = user; // Set req.user for consistency
        }
        catch (err) {
            logger_1.default.error(`Token verification failed: ${err}`);
            throw new Error('Invalid token');
        }
    }
    // Prepare user data, only include studentId and department for students
    const userData = {
        name,
        email,
        password,
        role: assignedRole,
    };
    if (assignedRole === user_1.UserRole.STUDENT) {
        userData.studentId = studentId || null;
        userData.department = department || null;
    }
    const user = await user_1.User.create(userData);
    sendTokenResponse(user, 201, res);
});
exports.login = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        throw new Error('Email and password are required');
    }
    const user = await user_1.User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
        throw new Error('Invalid credentials');
    }
    sendTokenResponse(user, 200, res);
});
exports.updatePassword = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const user = await user_1.User.findById(req.user.id).select('+password');
    if (!user || !(await user.comparePassword(req.body.currentPassword))) {
        throw new Error('Current password is incorrect');
    }
    user.password = req.body.newPassword;
    await user.save();
    sendTokenResponse(user, 200, res);
});
exports.getMe = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const user = await user_1.User.findById(req.user.id);
    res.json({ success: true, data: user });
});
const sendTokenResponse = (user, statusCode, res) => {
    const jwtSecret = process.env.JWT_SECRET;
    const jwtExpire = process.env.JWT_EXPIRE || '1h';
    if (!jwtSecret) {
        console.error('Environment variable JWT_SECRET is missing');
        throw new Error('Internal server error');
    }
    const token = jsonwebtoken_1.default.sign({ id: user._id.toString(), role: user.role }, jwtSecret, { expiresIn: jwtExpire });
    res.status(statusCode).json({ success: true, token, role: user.role, id: user._id });
};
const allowTo = (...roles) => (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
        throw new Error('Unauthorized access');
    }
    next();
});
exports.allowTo = allowTo;
