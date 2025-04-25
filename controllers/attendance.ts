import { Response } from 'express';
import { getDistance } from 'geolib';
import { Code } from '../models/code';
import { Attendance } from '../models/attendance';
import { Class } from '../models/class';
import { Section } from '../models/section';
import logger from '../utils/logger';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/appError';
import { AuthRequest } from '../types/AuthRequest';

export const verifyAttendance = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { code } = req.params;
  const { location, fingerprint } = req.body;

  logger.info(`Verifying QR code: code=${code}`);

  const qrCode = await Code.findOne({ code, isActive: true });
  if (!qrCode || qrCode.expiresAt < new Date()) {
    logger.error(`Invalid or expired QR code: code=${code}`);
    throw new AppError('Invalid or expired QR code', 400);
  }

  const distance = getDistance(
    { latitude: location.latitude, longitude: location.longitude },
    { latitude: qrCode.location.coordinates[1], longitude: qrCode.location.coordinates[0] }
  );

  if (distance > qrCode.location.radius) {
    logger.error(`Location out of radius: code=${code}, location=${JSON.stringify(location)}`);
    throw new AppError('Student is not within the allowed location', 400);
  }

  const classDoc = await Class.findById(qrCode.classId).populate('students');
  if (!classDoc) throw new AppError('Class not found', 404);

  const isEnrolled = classDoc.students.some((student: any) => student._id.toString() === req.user!.id);
  if (!isEnrolled) {
    logger.error(`Student not enrolled: studentId=${req.user!.id}, classId=${qrCode.classId}`);
    throw new AppError('Student not enrolled in this class', 403);
  }

  const section = await Section.findById(qrCode.sectionId);
  if (!section) throw new AppError('Section not found', 404);

  const isInSection = section.students?.some((id) => id.toString() === req.user!.id);
  if (!isInSection) {
    logger.error(`Student not in section: studentId=${req.user!.id}, sectionId=${qrCode.sectionId}`);
    throw new AppError('This is not your assigned section', 403);
  }

  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
  const existingAttendance = await Attendance.findOne({
    studentId: req.user!.id,
    sectionId: qrCode.sectionId,
    dayNumber: qrCode.dayNumber,
    recordedAt: { $gte: tenMinutesAgo },
    $or: [
      { 'deviceInfo.fingerprint': fingerprint },
      { 'deviceInfo.fingerprint': { $exists: false } },
      { 'deviceInfo.fingerprint': null }
    ]
  });

  if (existingAttendance) {
    logger.error(`Duplicate attendance: studentId=${req.user!.id}, fingerprint=${fingerprint}`);
    throw new AppError('Attendance already recorded from this browser', 400);
  }

  await Attendance.create({
    studentId: req.user!.id,
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

  logger.info(`Attendance recorded: studentId=${req.user!.id}, code=${code}, dayNumber=${qrCode.dayNumber}`);
  res.json({ message: 'Attendance recorded successfully' });
});

export const recordManualAttendance = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { studentId, classId, sectionId, status, dayNumber } = req.body;

  if (!studentId || !classId || !sectionId || !status || !dayNumber) {
    throw new AppError('Student ID, class ID, section ID, status, and day number are required', 400);
  }

  const section = await Section.findById(sectionId);
  if (!section) throw new AppError('Section not found', 404);

  const classDoc = await Class.findById(classId);
  if (!classDoc) throw new AppError('Class not found', 404);

  const isEnrolled = classDoc.students.some((id) => id.toString() === studentId);
  if (!isEnrolled) throw new AppError('Student not enrolled in this class', 403);

  const isInSection = section.students?.some((id) => id.toString() === studentId);
  if (!isInSection) throw new AppError('Student not in this section', 403);

  // Find and update or create attendance
  const attendance = await Attendance.findOneAndUpdate(
    { studentId, sectionId, dayNumber },
    {
      $set: {
        classId,
        status,
        recordedAt: new Date(),
        codeId: null,
        location: null,
        deviceInfo: null,
      },
    },
    { new: true, upsert: true } // Create if not exists
  );

  logger.info(`Manual attendance recorded/updated: studentId=${studentId}, sectionId=${sectionId}, dayNumber=${dayNumber}, status=${status}`);
  res.json({ message: 'Manual attendance recorded/updated successfully', data: attendance });
});

export const getAttendance = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { classId, sectionId } = req.query;
  const query: any = {};

  if (classId) query.classId = classId;
  if (sectionId) {
    query.sectionId = sectionId;
    // Filter by students assigned to the section
    const section = await Section.findById(sectionId).select('students');
    if (!section) throw new AppError('Section not found', 404);
    query.studentId = { $in: section.students || [] };
  }

  const attendance = await Attendance.find(query).populate('studentId', 'name email studentId').lean();
  res.json({ success: true, data: attendance });
});

export const getStudentAttendance = asyncHandler(async (req: AuthRequest, res: Response) => {
  const classId = req.query.classId || req.body.classId; // Check both query and body

  if (!classId) throw new AppError('Class ID is required', 400);

  const classDoc = await Class.findById(classId);
  if (!classDoc) throw new AppError('Class not found', 404);

  const isEnrolled = classDoc.students.some((id) => id.toString() === req.user!.id);
  if (!isEnrolled) throw new AppError('You are not enrolled in this class', 403);

  const sections = await Section.find({ classId, students: req.user!.id }).select('_id sectionNumber');
  const sectionIds = sections.map((s) => s._id);

  const attendance = await Attendance.find({
    classId,
    studentId: req.user!.id,
    sectionId: { $in: sectionIds },
  })
    .populate('sectionId', 'sectionNumber')
    .select('dayNumber status recordedAt sectionId')
    .lean();

  res.json({ success: true, data: attendance });
});

export const getAttendanceStatistics = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { classId } = req.query;

  if (!classId) throw new AppError('Class ID is required', 400);

  const classDoc = await Class.findById(classId).populate('students', 'name email studentId');
  if (!classDoc) throw new AppError('Class not found', 404);

  const sections = await Section.find({ classId }).select('_id sectionNumber students');
  if (sections.length === 0) {
    res.json({ success: true, data: [], message: 'No sections found for this class' });
    return;
  }

  // Aggregate attendance statistics
  const attendanceStats = await Attendance.aggregate([
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

  // Get all distinct day numbers for the class
  const attendanceDays = await Attendance.distinct('dayNumber', {
    classId,
    sectionId: { $in: sections.map((s) => s._id) },
  }).sort({ dayNumber: 1 }); // Ensure days are sorted in ascending order

  const statistics = await Promise.all(
    classDoc.students.map(async (student: any) => {
      // Find sections the student is assigned to
      const studentSections = sections.filter((s) =>
        s.students?.some((id) => id.toString() === student._id.toString())
      );

      // Calculate total possible section-day combinations
      const totalPossibleSessions = studentSections.length * attendanceDays.length;

      // Get attendance stats for the student
      const studentStats = attendanceStats.find((stat) => stat._id.toString() === student._id.toString());
      const attendedSections = studentStats ? studentStats.sectionsAttended : [];
      const totalAttended = studentStats ? studentStats.totalAttended : 0;
      const totalAbsent = studentStats ? studentStats.totalAbsent : 0;
      const totalLate = studentStats ? studentStats.totalLate : 0;

      // Define totalSections as totalAttended + totalLate
      const totalSections = totalAttended + totalLate;

      // Calculate attendance percentage based on total possible sessions
      const attendancePercentage = totalPossibleSessions > 0
        ? ((totalAttended + totalLate) / totalPossibleSessions) * 100
        : 0;

      // Generate sectionAttendance details
      const sectionAttendance = studentSections.map((section) => {
        const sectionDays = attendedSections.filter((att: any) => String(att.sectionId) === String(section._id));
        return {
          sectionNumber: section.sectionNumber,
          // Format days to match Excel output ("P", "L", or "")
          days: attendanceDays.map((day) => {
            const attendance = sectionDays.find((att: any) => String(att.dayNumber) === String(day)); // Fix type mismatch
            const status = attendance
              ? attendance.status === 'present'
                ? 'P'
                : attendance.status === 'late'
                ? 'L'
                : ''
              : '';
            return {
              dayNumber: day,
              status, // Use "P", "L", or "" to match Excel
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
    })
  );

  res.json({ success: true, data: statistics });
});
