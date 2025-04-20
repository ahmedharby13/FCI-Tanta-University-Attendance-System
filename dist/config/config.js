"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const config = {
    NODE_ENV: (process.env.NODE_ENV || 'development'),
    PORT: parseInt(process.env.PORT || '3000', 10),
    MONGO_URI: (process.env.MONGO_URI || 'mongodb://localhost:27017/university-attendance'),
    JWT_SECRET: (process.env.JWT_SECRET || 'your-secure-secret-key'),
    JWT_EXPIRE: (process.env.JWT_EXPIRE || '1h'),
    QR_CODE_EXPIRY_MINUTES: parseInt(process.env.QR_CODE_EXPIRY_MINUTES || '10', 10),
    LOCATION_RADIUS: parseInt(process.env.LOCATION_RADIUS || '50', 10),
    DEFAULT_UNIVERSITY_LOCATION: {
        longitude: parseFloat(process.env.DEFAULT_LONGITUDE || '31.2357'),
        latitude: parseFloat(process.env.DEFAULT_LATITUDE || '30.0444'),
        name: process.env.DEFAULT_LOCATION_NAME || 'University',
    },
    EMAIL_HOST: (process.env.EMAIL_HOST || 'smtp.example.com'),
    EMAIL_PORT: parseInt(process.env.EMAIL_PORT || '587', 10),
    EMAIL_USER: (process.env.EMAIL_USER || 'user@example.com'),
    EMAIL_PASS: (process.env.EMAIL_PASS || 'password'),
};
exports.default = config;
