"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAttendanceStatistics = exports.getStudentAttendance = exports.getAttendance = exports.recordManualAttendance = exports.verifyAttendance = void 0;
const geolib_1 = require("geolib");
const code_1 = require("../models/code");
const attendance_1 = require("../models/attendance");
const class_1 = require("../models/class");
const section_1 = require("../models/section");
const logger_1 = __importDefault(require("../utils/logger"));
const asyncHandler_1 = require("../utils/asyncHandler");
const appError_1 = require("../utils/appError");
exports.verifyAttendance = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { code } = req.params;
    const { location, fingerprint } = req.body;
    logger_1.default.info(`Verifying QR code: code=${code}`);
    const qrCode = await code_1.Code.findOne({ code, isActive: true });
    if (!qrCode || qrCode.expiresAt < new Date()) {
        logger_1.default.error(`Invalid or expired QR code: code=${code}`);
        throw new appError_1.AppError('Invalid or expired QR code', 400);
    }
    const distance = (0, geolib_1.getDistance)({ latitude: location.latitude, longitude: location.longitude }, { latitude: qrCode.location.coordinates[1], longitude: qrCode.location.coordinates[0] });
    if (distance > qrCode.location.radius) {
        logger_1.default.error(`Location out of radius: code=${code}, location=${JSON.stringify(location)}`);
        throw new appError_1.AppError('Student is not within the allowed location', 400);
    }
    const classDoc = await class_1.Class.findById(qrCode.classId).populate('students');
    if (!classDoc)
        throw new appError_1.AppError('Class not found', 404);
    const isEnrolled = classDoc.students.some((student) => student._id.toString() === req.user.id);
    if (!isEnrolled) {
        logger_1.default.error(`Student not enrolled: studentId=${req.user.id}, classId=${qrCode.classId}`);
        throw new appError_1.AppError('Student not enrolled in this class', 403);
    }
    const section = await section_1.Section.findById(qrCode.sectionId);
    if (!section)
        throw new appError_1.AppError('Section not found', 404);
    const isInSection = section.students?.some((id) => id.toString() === req.user.id);
    if (!isInSection) {
        logger_1.default.error(`Student not in section: studentId=${req.user.id}, sectionId=${qrCode.sectionId}`);
        throw new appError_1.AppError('This is not your assigned section', 403);
    }
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const existingAttendance = await attendance_1.Attendance.findOne({
        studentId: req.user.id,
        sectionId: qrCode.sectionId,
        dayNumber: qrCode.dayNumber, // Use dayNumber from Code
        recordedAt: { $gte: tenMinutesAgo },
        'deviceInfo.fingerprint': fingerprint,
    });
    if (existingAttendance) {
        logger_1.default.error(`Duplicate attendance: studentId=${req.user.id}, fingerprint=${fingerprint}`);
        throw new appError_1.AppError('Attendance already recorded from this browser', 400);
    }
    await attendance_1.Attendance.create({
        studentId: req.user.id,
        codeId: qrCode._id,
        classId: qrCode.classId,
        sectionId: qrCode.sectionId,
        dayNumber: qrCode.dayNumber, // Store dayNumber from Code
        location: {
            type: 'Point',
            coordinates: [location.longitude, location.latitude],
        },
        deviceInfo: {
            userAgent: req.headers['user-agent'],
            ip: req.ip,
            fingerprint,
        },
        status: 'present',
        recordedAt: new Date(),
    });
    logger_1.default.info(`Attendance recorded: studentId=${req.user.id}, code=${code}, dayNumber=${qrCode.dayNumber}`);
    res.json({ message: 'Attendance recorded successfully' });
});
exports.recordManualAttendance = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { studentId, classId, sectionId, status, dayNumber } = req.body;
    if (!studentId || !classId || !sectionId || !status || !dayNumber) {
        throw new appError_1.AppError('Student ID, class ID, section ID, status, and day number are required', 400);
    }
    const section = await section_1.Section.findById(sectionId);
    if (!section)
        throw new appError_1.AppError('Section not found', 404);
    const classDoc = await class_1.Class.findById(classId);
    if (!classDoc)
        throw new appError_1.AppError('Class not found', 404);
    const isEnrolled = classDoc.students.some((id) => id.toString() === studentId);
    if (!isEnrolled)
        throw new appError_1.AppError('Student not enrolled in this class', 403);
    const isInSection = section.students?.some((id) => id.toString() === studentId);
    if (!isInSection)
        throw new appError_1.AppError('Student not in this section', 403);
    const existingAttendance = await attendance_1.Attendance.findOne({
        studentId,
        sectionId,
        dayNumber,
        recordedAt: { $gte: new Date(Date.now() - 10 * 60 * 1000) },
    });
    if (existingAttendance) {
        throw new appError_1.AppError('Attendance already recorded for this student in this section on this day', 400);
    }
    const attendance = await attendance_1.Attendance.create({
        studentId,
        codeId: null,
        classId,
        sectionId,
        dayNumber, // Store dayNumber from request
        location: null,
        deviceInfo: null,
        status,
        recordedAt: new Date(),
    });
    logger_1.default.info(`Manual attendance recorded: studentId=${studentId}, sectionId=${sectionId}, dayNumber=${dayNumber}, status=${status}`);
    res.json({ message: 'Manual attendance recorded successfully', data: attendance });
});
exports.getAttendance = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { classId, sectionId } = req.query;
    const query = {};
    if (classId)
        query.classId = classId;
    if (sectionId) {
        query.sectionId = sectionId;
        // Filter by students assigned to the section
        const section = await section_1.Section.findById(sectionId).select('students');
        if (!section)
            throw new appError_1.AppError('Section not found', 404);
        query.studentId = { $in: section.students || [] };
    }
    const attendance = await attendance_1.Attendance.find(query).populate('studentId', 'name email studentId').lean();
    res.json({ success: true, data: attendance });
});
exports.getStudentAttendance = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { classId } = req.query;
    if (!classId)
        throw new appError_1.AppError('Class ID is required', 400);
    const classDoc = await class_1.Class.findById(classId);
    if (!classDoc)
        throw new appError_1.AppError('Class not found', 404);
    const isEnrolled = classDoc.students.some((id) => id.toString() === req.user.id);
    if (!isEnrolled)
        throw new appError_1.AppError('You are not enrolled in this class', 403);
    const sections = await section_1.Section.find({ classId, students: req.user.id }).select('_id sectionNumber');
    const sectionIds = sections.map((s) => s._id);
    const attendance = await attendance_1.Attendance.find({
        classId,
        studentId: req.user.id,
        sectionId: { $in: sectionIds },
    })
        .populate('sectionId', 'sectionNumber')
        .select('dayNumber status recordedAt sectionId') // Include dayNumber
        .lean();
    res.json({ success: true, data: attendance });
});
exports.getAttendanceStatistics = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { classId } = req.query;
    if (!classId)
        throw new appError_1.AppError('Class ID is required', 400);
    const classDoc = await class_1.Class.findById(classId).populate('students', 'name email studentId');
    if (!classDoc)
        throw new appError_1.AppError('Class not found', 404);
    const sections = await section_1.Section.find({ classId }).select('_id sectionNumber');
    if (sections.length === 0) {
        res.json({ success: true, data: [], message: 'No sections found for this class' });
        return;
    }
    // Aggregate attendance statistics using dayNumber from Attendance
    const attendanceStats = await attendance_1.Attendance.aggregate([
        { $match: { classId: classDoc._id } },
        {
            $lookup: {
                from: 'sections',
                localField: 'sectionId',
                foreignField: '_id',
                as: 'section',
            },
        },
        { $unwind: '$section' },
        {
            $match: {
                $expr: {
                    $in: ['$studentId', '$section.students'],
                },
            },
        },
        {
            $group: {
                _id: { studentId: '$studentId', sectionId: '$sectionId', dayNumber: '$dayNumber' },
                status: { $first: '$status' },
            },
        },
        {
            $group: {
                _id: '$_id.studentId',
                sectionsAttended: {
                    $push: {
                        sectionId: '$_id.sectionId',
                        dayNumber: '$_id.dayNumber',
                        status: '$status',
                    },
                },
                totalAttended: {
                    $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] },
                },
                totalAbsent: {
                    $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] },
                },
                totalLate: {
                    $sum: { $cond: [{ $eq: ['$status', 'late'] }, 1, 0] },
                },
            },
        },
    ]);
    const statistics = classDoc.students.map(async (student) => {
        const studentSections = sections.filter((s) => s.students?.some((id) => id.toString() === student._id.toString()));
        // Calculate total unique section-day combinations
        const attendanceDays = await attendance_1.Attendance.distinct('dayNumber', {
            classId,
            sectionId: { $in: sections.map((s) => s._id) },
        });
        const totalSections = studentSections.length * attendanceDays.length;
        const studentStats = attendanceStats.find((stat) => stat._id.toString() === student._id.toString());
        const attendedSections = studentStats ? studentStats.sectionsAttended : [];
        const totalAttended = studentStats ? studentStats.totalAttended : 0;
        const totalAbsent = studentStats ? studentStats.totalAbsent : 0;
        const totalLate = studentStats ? studentStats.totalLate : 0;
        const attendancePercentage = totalSections > 0 ? (totalAttended / totalSections) * 100 : 0;
        const sectionAttendance = studentSections.map((section) => {
            const sectionDays = attendedSections.filter((att) => String(att.sectionId) === String(section._id));
            return {
                sectionNumber: section.sectionNumber,
                days: attendanceDays.map((day) => {
                    const attendance = sectionDays.find((att) => att.dayNumber === day);
                    return {
                        dayNumber: day,
                        attended: attendance ? attendance.status === 'present' : false,
                        absent: attendance ? attendance.status === 'absent' : !attendance,
                        late: attendance ? attendance.status === 'late' : false,
                    };
                }),
            };
        });
        return {
            studentId: student._id,
            name: student.name,
            email: student.email,
            studentCode: student.studentId,
            totalAttended,
            totalAbsent,
            totalLate,
            totalSections,
            attendancePercentage: attendancePercentage.toFixed(2),
            sectionAttendance,
        };
    });
    res.json({ success: true, data: statistics });
});
