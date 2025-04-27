import { Request, Response } from 'express';
import { Class } from '../models/class';
import { User, UserRole } from '../models/user';
import { Section } from '../models/section';
import { Code } from '../models/code';
import { Attendance } from '../models/attendance';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/appError';
import { AuthRequest } from '../types/AuthRequest';
import logger from '../utils/logger';
import mongoose from 'mongoose';

export const createClass = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { name, teacherId, semester } = req.body;
  const userId = req.user!.id;
  const userRole = req.user!.role;

  if (userRole !== UserRole.ADMIN && teacherId !== userId) {
    throw new AppError('You can only create classes for yourself', 403);
  }

  const teacher = await User.findById(teacherId);
  if (!teacher || teacher.role !== UserRole.INSTRUCTOR) {
    throw new AppError('Invalid teacher ID or user is not an instructor', 400);
  }

  const newClass = await Class.create({
    name,
    teacherId,
    semester,
    students: [],
  });

  logger.info(`Class created: classId=${newClass._id}, name=${name}`);
  res.status(201).json({
    message: 'Class created successfully',
    class: newClass,
  });
});

export const deleteClass = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { classId } = req.body;
  const userRole = req.user!.role;

  if (userRole !== UserRole.ADMIN) {
    throw new AppError('Only admins can delete classes', 403);
  }

  const classDoc = await Class.findById(classId);
  if (!classDoc) {
    throw new AppError('Class not found', 404);
  }

  await Section.deleteMany({ classId });
  await Code.deleteMany({ classId });
  await Attendance.deleteMany({ classId });

  await classDoc.deleteOne();

  logger.info(`Class deleted: classId=${classId}`);
  res.status(200).json({
    message: 'Class and related data deleted successfully',
  });
});

export const getMyClasses = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const userRole = req.user!.role;

  let classes;

  // Fetch classes based on user role
  if (userRole === UserRole.INSTRUCTOR) {
    classes = await Class.find({ teacherId: userId })
      .populate('students', 'name email studentId')
      .populate('sections', 'title _id'); 
  } else if (userRole === UserRole.ADMIN) {
    classes = await Class.find({})
      .populate('students', 'name email studentId')
      .populate('sections', 'title _id');
  } else if (userRole === UserRole.STUDENT) {
    classes = await Class.find({ students: userId })
      .select('-students')
      .populate('sections', 'title _id'); 
  } else {
    throw new AppError('Unauthorized', 403);
  }

  // For instructors and admins, include sectionCount
  let classesWithSectionCount;
  if (userRole === UserRole.INSTRUCTOR || userRole === UserRole.ADMIN) {
    // Aggregate section counts for each class
    const sectionCounts = await Section.aggregate([
      {
        $match: {
          classId: { $in: classes.map((c: any) => c._id) },
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
    const sectionCountMap = new Map<string, number>();
    sectionCounts.forEach((sc) => {
      sectionCountMap.set(sc._id.toString(), sc.sectionCount);
    });

    // Enhance class data with sectionCount
    classesWithSectionCount = classes.map((classDoc: any) => ({
      ...classDoc.toObject(),
      sectionCount: sectionCountMap.get(classDoc._id.toString()) || 0,
    }));
  } else {
    // For students, return classes with sections but without sectionCount
    classesWithSectionCount = classes.map((classDoc: any) => classDoc.toObject());
  }

  res.status(200).json({
    success: true,
    data: classesWithSectionCount,
  });
});

export const addStudents = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { classId, studentIds } = req.body;
  const userId = req.user!.id;
  const userRole = req.user!.role;

  const classDoc = await Class.findById(classId);
  if (!classDoc) {
    throw new AppError('Class not found', 404);
  }

  if (userRole !== UserRole.ADMIN && classDoc.teacherId.toString() !== userId) {
    throw new AppError('You can only add students to your own classes', 403);
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

  const newStudents = studentObjectIds.filter(
    (id: mongoose.Types.ObjectId) =>
      !classDoc.students.some((existingId) => existingId.toString() === id.toString())
  );

  if (newStudents.length === 0) {
    throw new AppError('All provided students are already enrolled', 400);
  }

  classDoc.students.push(...newStudents);
  await classDoc.save();

  logger.info(`Students added to class: classId=${classId}, studentIds=${studentIds.join(', ')}`);
  res.status(200).json({
    message: 'Students added successfully',
    class: classDoc,
  });
});

export const removeStudents = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { classId, studentIds } = req.body;
  const userId = req.user!.id;
  const userRole = req.user!.role;

  const classDoc = await Class.findById(classId);
  if (!classDoc) {
    throw new AppError('Class not found', 404);
  }

  if (userRole !== UserRole.ADMIN && classDoc.teacherId.toString() !== userId) {
    throw new AppError('You can only remove students from your own classes', 403);
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

  classDoc.students = classDoc.students.filter(
    (id: mongoose.Types.ObjectId) =>
      !studentObjectIds.some(
        (studentId: mongoose.Types.ObjectId) => studentId.toString() === id.toString()
      )
  );
  await classDoc.save();

  logger.info(`Students removed from class: classId=${classId}, studentIds=${studentIds.join(', ')}`);
  res.status(200).json({
    message: 'Students removed successfully',
    class: classDoc,
  });
});