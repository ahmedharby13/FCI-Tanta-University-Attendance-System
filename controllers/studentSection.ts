import { Response } from 'express';
import { Section } from '../models/section';
import { Class } from '../models/class';
import { User, UserRole } from '../models/user';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/appError';
import { AuthRequest } from '../types/AuthRequest';
import logger from '../utils/logger';

export const addStudentsToSection = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { sectionId, studentIds } = req.body;
  const userId = req.user!.id;
  const userRole = req.user!.role;

  if (userRole !== UserRole.INSTRUCTOR && userRole !== UserRole.ADMIN) {
    throw new AppError('Only instructors or admins can add students to sections', 403);
  }

  const section = await Section.findById(sectionId);
  if (!section) throw new AppError('Section not found', 404);

  const classDoc = await Class.findById(section.classId);
  if (!classDoc) throw new AppError('Class not found', 404);

  if (userRole === UserRole.INSTRUCTOR && classDoc.teacherId.toString() !== userId) {
    throw new AppError('You can only add students to sections in your own classes', 403);
  }

  const students = await User.find({
    studentId: { $in: studentIds },
    role: UserRole.STUDENT,
  });

  if (students.length !== studentIds.length) {
    throw new AppError('Some students not found or are not valid students', 400);
  }

  const studentObjectIds = students.map((student) => student._id);

  // Check if students are enrolled in the class
  const notEnrolled = studentObjectIds.filter(
    (id) => !classDoc.students.some((s) => s.toString() === id.toString())
  );
  if (notEnrolled.length > 0) {
    throw new AppError('Some students are not enrolled in this class', 403);
  }

  // Check if students are already in other sections
  const otherSections = await Section.find({
    classId: section.classId,
    _id: { $ne: sectionId },
    students: { $in: studentObjectIds },
  });
  if (otherSections.length > 0) {
    const duplicateStudents = students
      .filter((s) =>
        otherSections.some((sec) =>
          sec.students.some((id) => id.toString() === s._id.toString())
        )
      )
      .map((s) => s.studentId);
    throw new AppError(
      `Students with IDs ${duplicateStudents.join(', ')} are already in other sections`,
      400
    );
  }

  // Add new students to the section
  const newStudents = studentObjectIds.filter(
    (id) => !section.students.some((existingId) => existingId.toString() === id.toString())
  );
  if (newStudents.length === 0) {
    throw new AppError('All provided students are already in this section', 400);
  }

  section.students.push(...newStudents);
  await section.save();

  logger.info(`Students added to section: sectionId=${sectionId}, studentIds=${studentIds.join(', ')}`);
  res.status(200).json({
    message: 'Students added to section successfully',
    section,
  });
});

export const removeStudentsFromSection = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { sectionId, studentIds } = req.body;
  const userId = req.user!.id;
  const userRole = req.user!.role;

  if (userRole !== UserRole.INSTRUCTOR && userRole !== UserRole.ADMIN) {
    throw new AppError('Only instructors or admins can remove students from sections', 403);
  }

  const section = await Section.findById(sectionId);
  if (!section) throw new AppError('Section not found', 404);

  const classDoc = await Class.findById(section.classId);
  if (!classDoc) throw new AppError('Class not found', 404);

  if (userRole === UserRole.INSTRUCTOR && classDoc.teacherId.toString() !== userId) {
    throw new AppError('You can only remove students from sections in your own classes', 403);
  }

  const students = await User.find({
    studentId: { $in: studentIds },
    role: UserRole.STUDENT,
  });

  if (students.length !== studentIds.length) {
    throw new AppError('Some students not found or are not valid students', 400);
  }

  const studentObjectIds = students.map((student) => student._id);
  section.students = section.students.filter(
    (id) => !studentObjectIds.some((studentId) => studentId.toString() === id.toString())
  );
  await section.save();

  logger.info(`Students removed from section: sectionId=${sectionId}, studentIds=${studentIds.join(', ')}`);
  res.status(200).json({
    message: 'Students removed from section successfully',
    section,
  });
});