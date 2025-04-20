"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const appError_1 = require("../utils/appError");
const logger_1 = __importDefault(require("../utils/logger"));
// Define error handler with explicit Express ErrorRequestHandler type
const errorHandler = (err, req, res, next) => {
    if (err instanceof appError_1.AppError && err.isOperational) {
        logger_1.default.error(`Operational Error: ${err.message}, Status: ${err.statusCode}`);
        res.status(err.statusCode).json({
            status: err.status,
            message: err.message,
        });
        return; // Explicit return to satisfy void
    }
    // Non-operational or unexpected errors
    logger_1.default.error(`Unexpected error: ${err.message}, Stack: ${err.stack}`);
    res.status(500).json({
        status: 'error',
        message: 'Something went wrong',
    });
};
exports.errorHandler = errorHandler;
