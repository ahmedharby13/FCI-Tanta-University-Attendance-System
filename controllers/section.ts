import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/appError';
import { AuthRequest } from '../types/AuthRequest';
import { Section } from '../models/section';
import { Class } from '../models/class';
import { User, UserRole } from '../models/user';
import logger from '../utils/logger';
import { Response } from 'express';
import mongoose from 'mongoose';

export const createSection = asyncHandler(async (req: AuthRequest, res: Response) => {
  try {
    const { classId, sectionNumber, studentIds, dayNumber } = req.body;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    if (userRole !== UserRole.INSTRUCTOR && userRole !== UserRole.ADMIN) {
      throw new Error();
    }

    const classDoc = await Class.findById(classId);
    if (!classDoc) {
      throw new Error();
    }

    if (userRole === UserRole.INSTRUCTOR && classDoc.teacherId.toString() !== userId) {
      throw new Error();
    }

    // Check for duplicate section
    const existingSection = await Section.findOne({ classId, sectionNumber });
    if (existingSection) {
      throw new Error();
    }

    let studentObjectIds: mongoose.Types.ObjectId[] = [];
    if (studentIds && Array.isArray(studentIds)) {
      const students = await User.find({
        studentId: { $in: studentIds },
        role: UserRole.STUDENT,
      });

      if (students.length !== studentIds.length) {
        throw new Error();
      }

      studentObjectIds = students.map((student) => student._id);
      // Verify students are enrolled in the class
      const notEnrolled = studentObjectIds.filter(
        (id) => !classDoc.students.some((s) => s.toString() === id.toString())
      );
      if (notEnrolled.length > 0) {
        throw new Error();
      }

      // Check for students in other sections of the same class
      const otherSections = await Section.find({
        classId,
        students: { $in: studentObjectIds },
      });
      if (otherSections.length > 0) {
        throw new Error();
      }
    }

    const newSection = await Section.create({
      classId,
      sectionNumber,
      students: studentObjectIds,
      date: new Date(),
      dayNumber,
    });

    logger.info(`Section created: sectionId=${newSection._id}, classId=${classId}`);
    res.status(201).json({
      message: 'Section created successfully',
      section: newSection,
    });
  } catch (error) {
    logger.error(`Error creating section: ${error}`);
    res.status(400).json({
      status: 'error',
      message: 'Something went wrong',
    });
  }
});

export const deleteSection = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { sectionId } = req.body;
  const userId = req.user!.id;
  const userRole = req.user!.role;

  if (userRole !== UserRole.INSTRUCTOR && userRole !== UserRole.ADMIN) {
    throw new AppError('Only instructors or admins can delete sections', 403);
  }

  const section = await Section.findById(sectionId);
  if (!section) {
    throw new AppError('Section not found', 404);
  }

  const classDoc = await Class.findById(section.classId);
  if (!classDoc) {
    throw new AppError('Class not found', 404);
  }

  if (userRole === UserRole.INSTRUCTOR && classDoc.teacherId.toString() !== userId) {
    throw new AppError('You can only delete sections for your own classes', 403);
  }

  await section.deleteOne();

  logger.info(`Section deleted: sectionId=${sectionId}`);
  res.status(200).json({
    message: 'Section deleted successfully',
  });
});

export const getMySections = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const userRole = req.user!.role;

  let sections;

  // Fetch sections based on user role
  if (userRole === UserRole.INSTRUCTOR) {
    // Get classes taught by the instructor
    const classes = await Class.find({ teacherId: userId }).select('_id name');
    const classIds = classes.map((c) => c._id);
    // Get sections for those classes
    sections = await Section.find({ classId: { $in: classIds } })
      .populate('classId', 'name')
      .populate('students', 'name email studentId');
  } else if (userRole === UserRole.ADMIN) {
    // Get all sections
    sections = await Section.find({})
      .populate('classId', 'name')
      .populate('students', 'name email studentId');
  } else if (userRole === UserRole.STUDENT) {
    // Get sections where the student is enrolled
    sections = await Section.find({ students: userId })
      .populate('classId', 'name');
  } else {
    throw new AppError('Unauthorized', 403);
  }

  // Transform sections to include className and relevant fields
  const sectionsWithDetails = sections.map((section: any) => ({
    _id: section._id,
    sectionNumber: section.sectionNumber,
    classId: section.classId._id,
    className: section.classId.name,
    date: section.date,
    dayNumber: section.dayNumber,
    students: userRole === UserRole.STUDENT ? undefined : section.students, // Hide students for students
    createdAt: section.createdAt,
    updatedAt: section.updatedAt,
  }));

  res.status(200).json({
    success: true,
    data: sectionsWithDetails,
  });
});

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

  // Validate studentIds as ObjectIds and query by _id
  const studentObjectIds = studentIds.map((id: string) => new mongoose.Types.ObjectId(id));
  const students = await User.find({
    _id: { $in: studentObjectIds },
    role: UserRole.STUDENT,
  });

  if (students.length !== studentIds.length) {
    throw new AppError('Some students not found or are not valid students', 400);
  }

  // Check if students are enrolled in the class
  const notEnrolled = studentObjectIds.filter(
    (id: { toString: () => string; }) => !classDoc.students.some((s) => s.toString() === id.toString())
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
      .map((s) => s._id.toString());
    throw new AppError(
      `Students with IDs ${duplicateStudents.join(', ')} are already in other sections`,
      400
    );
  }

  // Add new students to the section
  const newStudents = studentObjectIds.filter(
    (id: { toString: () => string; }) => !section.students.some((existingId) => existingId.toString() === id.toString())
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

  // Validate studentIds as ObjectIds and query by _id
  const studentObjectIds = studentIds.map((id: string) => new mongoose.Types.ObjectId(id));
  const students = await User.find({
    _id: { $in: studentObjectIds },
    role: UserRole.STUDENT,
  });

  if (students.length !== studentIds.length) {
    throw new AppError('Some students not found or are not valid students', 400);
  }

  section.students = section.students.filter(
    (id) => !studentObjectIds.some((studentId: { toString: () => string; }) => studentId.toString() === id.toString())
  );
  await section.save();

  logger.info(`Students removed from section: sectionId=${sectionId}, studentIds=${studentIds.join(', ')}`);
  res.status(200).json({
    message: 'Students removed from section successfully',
    section,
  });
});