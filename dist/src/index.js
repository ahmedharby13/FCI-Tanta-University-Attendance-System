"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const helmet_1 = __importDefault(require("helmet"));
const cors_1 = __importDefault(require("cors"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const db_1 = require("../config/db");
const auth_1 = __importDefault(require("../routes/auth"));
const attendance_1 = __importDefault(require("../routes/attendance"));
const class_1 = __importDefault(require("../routes/class"));
const export_1 = __importDefault(require("../routes/export"));
const errorHandler_1 = require("../middlewares/errorHandler");
const logger_1 = __importDefault(require("../utils/logger"));
const cleanup_1 = require("../utils/cleanup");
// Load environment variables from .env file
dotenv_1.default.config();
// Initialize Express app
const app = (0, express_1.default)();
// Define port with fallback to 3000
const PORT = parseInt(process.env.PORT || '3000', 10);
// Security middleware
app.use((0, helmet_1.default)()); // Protect HTTP headers
app.use((0, cors_1.default)({
    origin: process.env.CORS_ORIGIN || '*', // Adjust based on your frontend URL
    credentials: true,
}));
// Rate limiting to prevent abuse
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
});
app.use(limiter);
// Parse incoming JSON requests
app.use(express_1.default.json());
// Connect to the database
(0, db_1.dbConnection)();
// Start cleanup job for old sections and QR codes
(0, cleanup_1.startCleanupJob)();
// Define API routes
app.use('/api/auth', auth_1.default);
app.use('/api/attendance', attendance_1.default);
app.use('/api/class', class_1.default);
app.use('/api/export', export_1.default);
// Default route
app.get('/', (req, res) => {
    res.send('University Attendance System is running!');
});
// Global error handling middleware
app.use(errorHandler_1.errorHandler);
// Start the server
app.listen(PORT, () => {
    logger_1.default.info(`Server running on port ${PORT}`);
});
// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    logger_1.default.error(`Uncaught Exception: ${err.message}, Stack: ${err.stack}`);
    process.exit(1);
});
// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    logger_1.default.error(`Unhandled Rejection: ${err.message}, Stack: ${err.stack}`);
    process.exit(1);
});
