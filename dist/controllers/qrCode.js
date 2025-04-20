"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.closeQRCode = exports.generateQRCode = void 0;
const qrcode_1 = __importDefault(require("qrcode"));
const uuid_1 = require("uuid");
const class_1 = require("../models/class");
const section_1 = require("../models/section");
const code_1 = require("../models/code");
const attendance_1 = require("../models/attendance");
const logger_1 = __importDefault(require("../utils/logger"));
const asyncHandler_1 = require("../utils/asyncHandler");
const appError_1 = require("../utils/appError");
const qrCodeIntervals = new Map();
exports.generateQRCode = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { classId, sectionNumber, dayNumber, location } = req.body;
    // Validate inputs
    if (!classId || !sectionNumber || !dayNumber || !location) {
        throw new appError_1.AppError('Class ID, section number, day number, and location are required', 400);
    }
    const classDoc = await class_1.Class.findById(classId);
    if (!classDoc)
        throw new appError_1.AppError('Class not found', 404);
    // Check for an existing section
    let section = await section_1.Section.findOne({ classId, sectionNumber });
    // If no section exists, create a new one
    if (!section) {
        section = await section_1.Section.create({
            classId,
            name: `Section ${sectionNumber}`,
            sectionNumber,
            students: [],
            date: new Date(),
        });
        logger_1.default.info(`New section created: sectionId=${section._id}, classId=${classId}, name=${section.name}`);
    }
    else {
        logger_1.default.info(`Using existing section: sectionId=${section._id}, classId=${classId}, name=${section.name}`);
    }
    const sectionIdStr = String(section._id);
    // Check if an interval is already running for this section
    if (qrCodeIntervals.has(sectionIdStr)) {
        logger_1.default.info(`QR code generation already active for sectionId=${sectionIdStr}, name=${section.name}`);
        const firstCode = await code_1.Code.findOne({ sectionId: section._id, isActive: true });
        if (firstCode) {
            const qrImage = await qrcode_1.default.toDataURL(`${process.env.API_BASE_URL || 'http://localhost:3000'}/api/attendance/verify/${firstCode.code}`);
            return res.json({
                message: 'QR Code generation already active for this section',
                qrImage,
                sectionId: section._id,
                sectionName: section.name,
                codeId: firstCode._id,
                expiresAt: firstCode.expiresAt,
            });
        }
    }
    const generateAndSaveQRCode = async () => {
        // Deactivate any existing active codes for this section
        await code_1.Code.updateMany({ sectionId: section._id, isActive: true }, { isActive: false });
        const uniqueCode = (0, uuid_1.v4)();
        const qrCodeIntervalSeconds = parseInt(process.env.QR_CODE_INTERVAL_SECONDS || '60', 10);
        const expiresAt = new Date(Date.now() + qrCodeIntervalSeconds * 1000);
        const code = await code_1.Code.create({
            code: uniqueCode,
            expiresAt,
            location: {
                type: 'Point',
                coordinates: [location.longitude, location.latitude],
                name: location.name || process.env.DEFAULT_LOCATION_NAME || 'University',
                radius: location.radius || parseInt(process.env.LOCATION_RADIUS || '50', 10),
            },
            classId,
            sectionId: section._id,
            dayNumber, // Store dayNumber in Code model
            createdBy: req.user.id,
            isActive: true,
        });
        logger_1.default.info(`QR Code generated: code=${uniqueCode}, sectionId=${sectionIdStr}, name=${section.name}, dayNumber=${dayNumber}, expiresAt=${expiresAt}`);
        return code;
    };
    const firstCode = await generateAndSaveQRCode();
    const qrCodeIntervalSeconds = parseInt(process.env.QR_CODE_INTERVAL_SECONDS || '60', 10);
    const interval = setInterval(async () => {
        const sectionInDB = await section_1.Section.findById(section._id);
        if (!sectionInDB) {
            clearInterval(interval);
            qrCodeIntervals.delete(sectionIdStr);
            logger_1.default.info(`Stopped QR code generation for sectionId=${sectionIdStr}, name=${section.name}`);
            return;
        }
        await generateAndSaveQRCode();
    }, qrCodeIntervalSeconds * 1000);
    qrCodeIntervals.set(sectionIdStr, interval);
    const qrImage = await qrcode_1.default.toDataURL(`${process.env.API_BASE_URL || 'http://localhost:3000'}/api/attendance/verify/${firstCode.code}`);
    res.json({
        message: 'QR Code generated and scheduled',
        qrImage,
        sectionId: section._id,
        sectionName: section.name,
        codeId: firstCode._id,
        expiresAt: firstCode.expiresAt,
    });
});
exports.closeQRCode = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { sectionId, dayNumber } = req.body;
    if (!sectionId || !dayNumber)
        throw new appError_1.AppError('Section ID and day number are required', 400);
    const section = await section_1.Section.findById(sectionId);
    if (!section)
        throw new appError_1.AppError('Section not found', 404);
    // Deactivate all active QR codes for this section and day
    await code_1.Code.updateMany({ sectionId, dayNumber, isActive: true }, { isActive: false });
    // Record absences for students who didn't attend
    const students = section.students || [];
    for (const studentId of students) {
        const attendance = await attendance_1.Attendance.findOne({ studentId, sectionId, dayNumber });
        if (!attendance) {
            await attendance_1.Attendance.create({
                studentId,
                codeId: null,
                classId: section.classId,
                sectionId,
                dayNumber,
                location: null,
                deviceInfo: null,
                status: 'absent',
                recordedAt: new Date(),
            });
        }
    }
    // Clear the QR code generation interval
    const interval = qrCodeIntervals.get(sectionId.toString());
    if (interval) {
        clearInterval(interval);
        qrCodeIntervals.delete(sectionId.toString());
        logger_1.default.info(`QR code interval cleared for sectionId=${sectionId}, name=${section.name}`);
    }
    logger_1.default.info(`Section closed: sectionId=${sectionId}, name=${section.name}, dayNumber=${dayNumber}`);
    res.json({ message: `Section ${section.name} closed successfully for day ${dayNumber}` });
});
