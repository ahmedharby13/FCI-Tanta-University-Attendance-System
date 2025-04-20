"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMyClasses = exports.deleteClass = exports.updateClass = exports.removeStudents = exports.addStudents = exports.createClass = void 0;
const class_1 = require("../models/class");
const user_1 = require("../models/user");
const section_1 = require("../models/section");
const code_1 = require("../models/code");
const attendance_1 = require("../models/attendance");
const asyncHandler_1 = require("../utils/asyncHandler");
const appError_1 = require("../utils/appError");
const logger_1 = __importDefault(require("../utils/logger"));
exports.createClass = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { name, teacherId, semester } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;
    if (userRole !== user_1.UserRole.ADMIN && teacherId !== userId) {
        throw new appError_1.AppError('You can only create classes for yourself', 403);
    }
    const teacher = await user_1.User.findById(teacherId);
    if (!teacher || teacher.role !== user_1.UserRole.INSTRUCTOR) {
        throw new appError_1.AppError('Invalid teacher ID or user is not an instructor', 400);
    }
    const newClass = await class_1.Class.create({
        name,
        teacherId,
        semester,
        students: [],
    });
    logger_1.default.info(`Class created: classId=${newClass._id}, name=${name}`);
    res.status(201).json({
        message: 'Class created successfully',
        class: newClass,
    });
});
exports.addStudents = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { classId, studentIds } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;
    const classDoc = await class_1.Class.findById(classId);
    if (!classDoc) {
        throw new appError_1.AppError('Class not found', 404);
    }
    if (userRole !== user_1.UserRole.ADMIN && classDoc.teacherId.toString() !== userId) {
        throw new appError_1.AppError('You can only add students to your own classes', 403);
    }
    const students = await user_1.User.find({
        studentId: { $in: studentIds },
        role: user_1.UserRole.STUDENT,
    });
    if (students.length !== studentIds.length) {
        throw new appError_1.AppError('Some students not found or are not valid students', 400);
    }
    const studentObjectIds = students.map((student) => student._id);
    const newStudents = studentObjectIds.filter((id) => !classDoc.students.some((existingId) => existingId.toString() === id.toString()));
    if (newStudents.length === 0) {
        throw new appError_1.AppError('All provided students are already enrolled', 400);
    }
    classDoc.students.push(...newStudents);
    await classDoc.save();
    logger_1.default.info(`Students added to class: classId=${classId}, studentIds=${studentIds.join(', ')}`);
    res.status(200).json({
        message: 'Students added successfully',
        class: classDoc,
    });
});
exports.removeStudents = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { classId, studentIds } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;
    const classDoc = await class_1.Class.findById(classId);
    if (!classDoc) {
        throw new appError_1.AppError('Class not found', 404);
    }
    if (userRole !== user_1.UserRole.ADMIN && classDoc.teacherId.toString() !== userId) {
        throw new appError_1.AppError('You can only remove students from your own classes', 403);
    }
    const students = await user_1.User.find({
        studentId: { $in: studentIds },
        role: user_1.UserRole.STUDENT,
    });
    if (students.length !== studentIds.length) {
        throw new appError_1.AppError('Some students not found or are not valid students', 400);
    }
    const studentObjectIds = students.map((student) => student._id);
    classDoc.students = classDoc.students.filter((id) => !studentObjectIds.some((studentId) => studentId.toString() === id.toString()));
    await classDoc.save();
    logger_1.default.info(`Students removed from class: classId=${classId}, studentIds=${studentIds.join(', ')}`);
    res.status(200).json({
        message: 'Students removed successfully',
        class: classDoc,
    });
});
exports.updateClass = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { classId, name, teacherId, semester, status } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;
    const classDoc = await class_1.Class.findById(classId);
    if (!classDoc) {
        throw new appError_1.AppError('Class not found', 404);
    }
    if (userRole !== user_1.UserRole.ADMIN && classDoc.teacherId.toString() !== userId) {
        throw new appError_1.AppError('You can only update your own classes', 403);
    }
    if (teacherId && userRole !== user_1.UserRole.ADMIN) {
        throw new appError_1.AppError('Only admins can change the teacher', 403);
    }
    if (teacherId) {
        const teacher = await user_1.User.findById(teacherId);
        if (!teacher || teacher.role !== user_1.UserRole.INSTRUCTOR) {
            throw new appError_1.AppError('Invalid teacher ID or user is not an instructor', 400);
        }
        classDoc.teacherId = teacherId;
    }
    if (name)
        classDoc.name = name;
    if (semester)
        classDoc.semester = semester;
    if (status)
        classDoc.status = status;
    await classDoc.save();
    logger_1.default.info(`Class updated: classId=${classId}`);
    res.status(200).json({
        message: 'Class updated successfully',
        class: classDoc,
    });
});
exports.deleteClass = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { classId } = req.body;
    const userRole = req.user.role;
    if (userRole !== user_1.UserRole.ADMIN) {
        throw new appError_1.AppError('Only admins can delete classes', 403);
    }
    const classDoc = await class_1.Class.findById(classId);
    if (!classDoc) {
        throw new appError_1.AppError('Class not found', 404);
    }
    await section_1.Section.deleteMany({ classId });
    await code_1.Code.deleteMany({ classId });
    await attendance_1.Attendance.deleteMany({ classId });
    await classDoc.deleteOne();
    logger_1.default.info(`Class deleted: classId=${classId}`);
    res.status(200).json({
        message: 'Class and related data deleted successfully',
    });
});
exports.getMyClasses = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user.id;
    const userRole = req.user.role;
    let classes;
    // Fetch classes based on user role
    if (userRole === user_1.UserRole.INSTRUCTOR) {
        classes = await class_1.Class.find({ teacherId: userId }).populate('students', 'name email studentId');
    }
    else if (userRole === user_1.UserRole.ADMIN) {
        classes = await class_1.Class.find({}).populate('students', 'name email studentId');
    }
    else if (userRole === user_1.UserRole.STUDENT) {
        classes = await class_1.Class.find({ students: userId }).select('-students');
    }
    else {
        throw new appError_1.AppError('Unauthorized', 403);
    }
    // For instructors and admins, include sectionCount
    let classesWithSectionCount;
    if (userRole === user_1.UserRole.INSTRUCTOR || userRole === user_1.UserRole.ADMIN) {
        // Aggregate section counts for each class
        const sectionCounts = await section_1.Section.aggregate([
            {
                $match: {
                    classId: { $in: classes.map((c) => c._id) },
                },
            },
            {
                $group: {
                    _id: '$classId',
                    sectionCount: { $sum: 1 },
                },
            },
        ]);
        // Create a map of classId to sectionCount
        const sectionCountMap = new Map();
        sectionCounts.forEach((sc) => {
            sectionCountMap.set(sc._id.toString(), sc.sectionCount);
        });
        // Enhance class data with sectionCount
        classesWithSectionCount = classes.map((classDoc) => ({
            ...classDoc.toObject(),
            sectionCount: sectionCountMap.get(classDoc._id.toString()) || 0,
        }));
    }
    else {
        // For students, return classes without sectionCount
        classesWithSectionCount = classes.map((classDoc) => classDoc.toObject());
    }
    res.status(200).json({
        success: true,
        data: classesWithSectionCount,
    });
});
