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

// export const updateSection = asyncHandler(async (req: AuthRequest, res: Response) => {
//   try {
//     const { sectionId, sectionNumber, studentIds, dayNumber } = req.body;
//     const userId = req.user!.id;
//     const userRole = req.user!.role;

//     if (userRole !== UserRole.INSTRUCTOR && userRole !== UserRole.ADMIN) {
//       throw new Error();
//     }

//     const section = await Section.findById(sectionId);
//     if (!section) {
//       throw new Error();
//     }

//     const classDoc = await Class.findById(section.classId);
//     if (!classDoc) {
//       throw new Error();
//     }

//     if (userRole === UserRole.INSTRUCTOR && classDoc.teacherId.toString() !== userId) {
//       throw new Error();
//     }

//     if (sectionNumber && sectionNumber !== section.sectionNumber) {
//       const existingSection = await Section.findOne({
//         classId: section.classId,
//         sectionNumber,
//       });
//       if (existingSection) {
//         throw new Error();
//       }
//       section.sectionNumber = sectionNumber;
//     }

//     if (dayNumber !== undefined) {
//       section.dayNumber = dayNumber;
//     }

//     if (studentIds && Array.isArray(studentIds)) {
//       const students = await User.find({
//         studentId: { $in: studentIds },
//         role: UserRole.STUDENT,
//       });

//       if (students.length !== studentIds.length) {
//         throw new Error();
//       }

//       const studentObjectIds = students.map((student) => student._id);
//       const notEnrolled = studentObjectIds.filter(
//         (id) => !classDoc.students.some((s) => s.toString() === id.toString())
//       );
//       if (notEnrolled.length > 0) {
//         throw new Error();
//       }

//       // Check for students in other sections
//       const otherSections = await Section.find({
//         classId: section.classId,
//         _id: { $ne: sectionId },
//         students: { $in: studentObjectIds },
//       });
//       if (otherSections.length > 0) {
//         throw new Error();
//       }

//       section.students = studentObjectIds;
//     }

//     await section.save();

//     logger.info(`Section updated: sectionId=${sectionId}`);
//     res.status(200).json({
//       message: 'Section updated successfully',
//       section,
//     });
//   } catch (error) {
//     logger.error(`Error updating section: ${error}`);
//     res.status(400).json({
//       status: 'error',
//       message: 'Something went wrong',
//     });
//   }
// });

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