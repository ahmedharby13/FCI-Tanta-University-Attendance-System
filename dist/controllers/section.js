"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteSection = exports.updateSection = exports.createSection = void 0;
const asyncHandler_1 = require("../utils/asyncHandler");
const appError_1 = require("../utils/appError");
const section_1 = require("../models/section");
const class_1 = require("../models/class");
const user_1 = require("../models/user");
const logger_1 = __importDefault(require("../utils/logger"));
exports.createSection = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { classId, name, sectionNumber, studentIds } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;
    if (userRole !== user_1.UserRole.INSTRUCTOR && userRole !== user_1.UserRole.ADMIN) {
        throw new appError_1.AppError('Only instructors or admins can create sections', 403);
    }
    const classDoc = await class_1.Class.findById(classId);
    if (!classDoc) {
        throw new appError_1.AppError('Class not found', 404);
    }
    if (userRole === user_1.UserRole.INSTRUCTOR && classDoc.teacherId.toString() !== userId) {
        throw new appError_1.AppError('You can only create sections for your own classes', 403);
    }
    // Check for duplicate sectionNumber within the class
    const existingSection = await section_1.Section.findOne({ classId, sectionNumber });
    if (existingSection) {
        throw new appError_1.AppError('A section with this number already exists in the class', 400);
    }
    let studentObjectIds = [];
    if (studentIds && Array.isArray(studentIds)) {
        const students = await user_1.User.find({
            studentId: { $in: studentIds },
            role: user_1.UserRole.STUDENT,
        });
        if (students.length !== studentIds.length) {
            throw new appError_1.AppError('Some students not found or are not valid students', 400);
        }
        studentObjectIds = students.map((student) => student._id);
        // Verify students are enrolled in the class
        const notEnrolled = studentObjectIds.filter((id) => !classDoc.students.some((s) => s.toString() === id.toString()));
        if (notEnrolled.length > 0) {
            throw new appError_1.AppError('Some students are not enrolled in this class', 403);
        }
        // Check for students in other sections of the same class
        const otherSections = await section_1.Section.find({
            classId,
            students: { $in: studentObjectIds },
        });
        if (otherSections.length > 0) {
            const duplicateStudents = students
                .filter((s) => otherSections.some((sec) => sec.students.some((id) => id.toString() === s._id.toString())))
                .map((s) => s.studentId);
            throw new appError_1.AppError(`Students with IDs ${duplicateStudents.join(', ')} are already in other sections`, 400);
        }
    }
    const newSection = await section_1.Section.create({
        classId,
        name,
        sectionNumber,
        students: studentObjectIds,
        date: new Date(),
    });
    logger_1.default.info(`Section created: sectionId=${newSection._id}, classId=${classId}`);
    res.status(201).json({
        message: 'Section created successfully',
        section: newSection,
    });
});
exports.updateSection = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { sectionId, name, sectionNumber, studentIds } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;
    if (userRole !== user_1.UserRole.INSTRUCTOR && userRole !== user_1.UserRole.ADMIN) {
        throw new appError_1.AppError('Only instructors or admins can update sections', 403);
    }
    const section = await section_1.Section.findById(sectionId);
    if (!section) {
        throw new appError_1.AppError('Section not found', 404);
    }
    const classDoc = await class_1.Class.findById(section.classId);
    if (!classDoc) {
        throw new appError_1.AppError('Class not found', 404);
    }
    if (userRole === user_1.UserRole.INSTRUCTOR && classDoc.teacherId.toString() !== userId) {
        throw new appError_1.AppError('You can only update sections for your own classes', 403);
    }
    if (sectionNumber && sectionNumber !== section.sectionNumber) {
        const existingSection = await section_1.Section.findOne({
            classId: section.classId,
            sectionNumber,
        });
        if (existingSection) {
            throw new appError_1.AppError('A section with this number already exists in the class', 400);
        }
        section.sectionNumber = sectionNumber;
    }
    if (name)
        section.name = name;
    if (studentIds && Array.isArray(studentIds)) {
        const students = await user_1.User.find({
            studentId: { $in: studentIds },
            role: user_1.UserRole.STUDENT,
        });
        if (students.length !== studentIds.length) {
            throw new appError_1.AppError('Some students not found or are not valid students', 400);
        }
        const studentObjectIds = students.map((student) => student._id);
        const notEnrolled = studentObjectIds.filter((id) => !classDoc.students.some((s) => s.toString() === id.toString()));
        if (notEnrolled.length > 0) {
            throw new appError_1.AppError('Some students are not enrolled in this class', 403);
        }
        // Check for students in other sections
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
        section.students = studentObjectIds;
    }
    await section.save();
    logger_1.default.info(`Section updated: sectionId=${sectionId}`);
    res.status(200).json({
        message: 'Section updated successfully',
        section,
    });
});
exports.deleteSection = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { sectionId } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;
    if (userRole !== user_1.UserRole.INSTRUCTOR && userRole !== user_1.UserRole.ADMIN) {
        throw new appError_1.AppError('Only instructors or admins can delete sections', 403);
    }
    const section = await section_1.Section.findById(sectionId);
    if (!section) {
        throw new appError_1.AppError('Section not found', 404);
    }
    const classDoc = await class_1.Class.findById(section.classId);
    if (!classDoc) {
        throw new appError_1.AppError('Class not found', 404);
    }
    if (userRole === user_1.UserRole.INSTRUCTOR && classDoc.teacherId.toString() !== userId) {
        throw new appError_1.AppError('You can only delete sections for your own classes', 403);
    }
    await section.deleteOne();
    logger_1.default.info(`Section deleted: sectionId=${sectionId}`);
    res.status(200).json({
        message: 'Section deleted successfully',
    });
});
