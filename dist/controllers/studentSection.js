"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeStudentsFromSection = exports.addStudentsToSection = void 0;
const section_1 = require("../models/section");
const class_1 = require("../models/class");
const user_1 = require("../models/user");
const asyncHandler_1 = require("../utils/asyncHandler");
const appError_1 = require("../utils/appError");
const logger_1 = __importDefault(require("../utils/logger"));
exports.addStudentsToSection = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { sectionId, studentIds } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;
    if (userRole !== user_1.UserRole.INSTRUCTOR && userRole !== user_1.UserRole.ADMIN) {
        throw new appError_1.AppError('Only instructors or admins can add students to sections', 403);
    }
    const section = await section_1.Section.findById(sectionId);
    if (!section)
        throw new appError_1.AppError('Section not found', 404);
    const classDoc = await class_1.Class.findById(section.classId);
    if (!classDoc)
        throw new appError_1.AppError('Class not found', 404);
    if (userRole === user_1.UserRole.INSTRUCTOR && classDoc.teacherId.toString() !== userId) {
        throw new appError_1.AppError('You can only add students to sections in your own classes', 403);
    }
    const students = await user_1.User.find({
        studentId: { $in: studentIds },
        role: user_1.UserRole.STUDENT,
    });
    if (students.length !== studentIds.length) {
        throw new appError_1.AppError('Some students not found or are not valid students', 400);
    }
    const studentObjectIds = students.map((student) => student._id);
    // Check if students are enrolled in the class
    const notEnrolled = studentObjectIds.filter((id) => !classDoc.students.some((s) => s.toString() === id.toString()));
    if (notEnrolled.length > 0) {
        throw new appError_1.AppError('Some students are not enrolled in this class', 403);
    }
    // Check if students are already in other sections
    const otherSections = await section_1.Section.find({
        classId: section.classId,
        _id: { $ne: sectionId },
        students: { $in: studentObjectIds },
    });
    if (otherSections.length > 0) {
        const duplicateStudents = students
            .filter((s) => otherSections.some((sec) => sec.students.some((id) => id.toString() === s._id.toString())))
            .map((s) => s.studentId);
        throw new appError_1.AppError(`Students with IDs ${duplicateStudents.join(', ')} are already in other sections`, 400);
    }
    // Add new students to the section
    const newStudents = studentObjectIds.filter((id) => !section.students.some((existingId) => existingId.toString() === id.toString()));
    if (newStudents.length === 0) {
        throw new appError_1.AppError('All provided students are already in this section', 400);
    }
    section.students.push(...newStudents);
    await section.save();
    logger_1.default.info(`Students added to section: sectionId=${sectionId}, studentIds=${studentIds.join(', ')}`);
    res.status(200).json({
        message: 'Students added to section successfully',
        section,
    });
});
exports.removeStudentsFromSection = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { sectionId, studentIds } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;
    if (userRole !== user_1.UserRole.INSTRUCTOR && userRole !== user_1.UserRole.ADMIN) {
        throw new appError_1.AppError('Only instructors or admins can remove students from sections', 403);
    }
    const section = await section_1.Section.findById(sectionId);
    if (!section)
        throw new appError_1.AppError('Section not found', 404);
    const classDoc = await class_1.Class.findById(section.classId);
    if (!classDoc)
        throw new appError_1.AppError('Class not found', 404);
    if (userRole === user_1.UserRole.INSTRUCTOR && classDoc.teacherId.toString() !== userId) {
        throw new appError_1.AppError('You can only remove students from sections in your own classes', 403);
    }
    const students = await user_1.User.find({
        studentId: { $in: studentIds },
        role: user_1.UserRole.STUDENT,
    });
    if (students.length !== studentIds.length) {
        throw new appError_1.AppError('Some students not found or are not valid students', 400);
    }
    const studentObjectIds = students.map((student) => student._id);
    section.students = section.students.filter((id) => !studentObjectIds.some((studentId) => studentId.toString() === id.toString()));
    await section.save();
    logger_1.default.info(`Students removed from section: sectionId=${sectionId}, studentIds=${studentIds.join(', ')}`);
    res.status(200).json({
        message: 'Students removed from section successfully',
        section,
    });
});
