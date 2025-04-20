"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.protect = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const user_1 = require("../models/user");
const logger_1 = __importDefault(require("../utils/logger"));
const asyncHandler_1 = require("../utils/asyncHandler");
exports.protect = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    let token;
    if (req.headers.authorization?.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }
    if (!token) {
        throw new Error('No token provided');
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
        req.user = user;
        next();
    }
    catch (err) {
        logger_1.default.error(`Token verification failed: ${err}`);
        throw new Error('Invalid token');
    }
});
