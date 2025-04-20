"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const nodemailer_1 = __importDefault(require("nodemailer"));
const config_1 = __importDefault(require("../config/config"));
const logger_1 = __importDefault(require("./logger"));
const sendEmail = async (options) => {
    try {
        const transporter = nodemailer_1.default.createTransport({
            host: config_1.default.EMAIL_HOST,
            port: config_1.default.EMAIL_PORT,
            secure: false, // true for port 465, false for port 587
            auth: {
                user: config_1.default.EMAIL_USER,
                pass: config_1.default.EMAIL_PASS,
            },
            tls: {
                rejectUnauthorized: false,
            },
        });
        const mailOptions = {
            from: `"University Attendance" <${config_1.default.EMAIL_USER}>`,
            to: options.email,
            subject: options.subject,
            text: options.message,
        };
        await transporter.sendMail(mailOptions);
        logger_1.default.info(`Email sent to ${options.email}`);
    }
    catch (error) {
        logger_1.default.error(`Email sending failed: ${error.message}`);
        throw new Error('Failed to send email');
    }
};
exports.default = sendEmail;
