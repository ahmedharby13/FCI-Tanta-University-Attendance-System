"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startCleanupJob = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const code_1 = require("../models/code");
const logger_1 = __importDefault(require("./logger"));
const startCleanupJob = () => {
    // Run daily at midnight
    node_cron_1.default.schedule('0 0 * * *', async () => {
        try {
            logger_1.default.info('Starting cleanup job for expired QR codes');
            const today = new Date();
            today.setHours(0, 0, 0, 0); // Start of today
            const yesterday = new Date(today);
            yesterday.setDate(today.getDate() - 1); // Start of yesterday
            // Deactivate QR codes from previous days
            const codeCleanupResult = await code_1.Code.updateMany({
                isActive: true,
                expiresAt: { $lt: yesterday },
            }, { isActive: false });
            logger_1.default.info(`Deactivated ${codeCleanupResult.modifiedCount} expired QR codes from previous days`);
            logger_1.default.info('Cleanup job completed successfully');
        }
        catch (error) {
            logger_1.default.error(`Cleanup job failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    });
    logger_1.default.info('Cleanup job scheduled to run daily at midnight');
};
exports.startCleanupJob = startCleanupJob;
