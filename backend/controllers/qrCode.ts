import { Response } from 'express';
import QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import { Class } from '../models/class';
import { Section } from '../models/section';
import { Code } from '../models/code';
import { Attendance } from '../models/attendance';
import logger from '../utils/logger';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/appError';
import { AuthRequest } from '../types/AuthRequest';

const qrCodeIntervals: Map<string, NodeJS.Timeout> = new Map();

export const generateQRCode = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { classId, sectionId, sectionNumber, dayNumber, location } = req.body;

  // Validate inputs
  if (!classId || (!sectionId && !sectionNumber) || !dayNumber || !location) {
    throw new AppError('Class ID, section ID or section number, day number, and location are required', 400);
  }

  const classDoc = await Class.findById(classId);
  if (!classDoc) throw new AppError('Class not found', 404);

  // Check for an existing section
  let section;
  if (sectionId) {
    // Prefer sectionId if provided
    section = await Section.findById(sectionId);
    if (!section || section.classId.toString() !== classId) {
      throw new AppError('Section not found or does not belong to the specified class', 404);
    }
  } else {
    // Fallback to sectionNumber
    section = await Section.findOne({ classId, sectionNumber });
    if (!section) {
      throw new AppError('Section not found', 404);
    }
  }

  const sectionIdStr = String(section._id);

  // Check if an interval is already running for this section
  if (qrCodeIntervals.has(sectionIdStr)) {
    logger.info(`QR code generation already active for sectionId=${sectionIdStr}, sectionNumber=${section.sectionNumber}`);
    const firstCode = await Code.findOne({ sectionId: section._id, isActive: true });
    if (firstCode) {
      const qrImage = await QRCode.toDataURL(
        `${process.env.API_BASE_URL || 'http://localhost:3000'}/api/attendance/verify/${firstCode.code}`
      );
      return res.json({
        message: 'QR Code generation already active for this section',
        qrImage,
        sectionId: section._id,
        sectionNumber: section.sectionNumber,
        codeId: firstCode._id,
        expiresAt: firstCode.expiresAt,
      });
    }
  }

  const generateAndSaveQRCode = async () => {
    // Deactivate any existing active codes for this section
    await Code.updateMany({ sectionId: section._id, isActive: true }, { isActive: false });

    const uniqueCode = uuidv4();
    const qrCodeIntervalSeconds = parseInt(process.env.QR_CODE_INTERVAL_SECONDS || '60', 10);
    const expiresAt = new Date(Date.now() + qrCodeIntervalSeconds * 1000);

    const code = await Code.create({
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
      dayNumber,
      createdBy: req.user!.id,
      isActive: true,
    });

    logger.info(`QR Code generated: code=${uniqueCode}, sectionId=${sectionIdStr}, sectionNumber=${section.sectionNumber}, dayNumber=${dayNumber}, expiresAt=${expiresAt}`);
    return code;
  };

  const firstCode = await generateAndSaveQRCode();

  const qrCodeIntervalSeconds = parseInt(process.env.QR_CODE_INTERVAL_SECONDS || '60', 10);
  const interval = setInterval(async () => {
    const sectionInDB = await Section.findById(section._id);
    if (!sectionInDB) {
      clearInterval(interval);
      qrCodeIntervals.delete(sectionIdStr);
      logger.info(`Stopped QR code generation for sectionId=${sectionIdStr}, sectionNumber=${section.sectionNumber}`);
      return;
    }
    await generateAndSaveQRCode();
  }, qrCodeIntervalSeconds * 1000);

  qrCodeIntervals.set(sectionIdStr, interval);

  const qrImage = await QRCode.toDataURL(
    `${process.env.API_BASE_URL || 'http://localhost:3000'}/api/attendance/verify/${firstCode.code}`
  );

  res.json({
    message: 'QR Code generated and scheduled',
    qrImage,
    sectionId: section._id,
    sectionNumber: section.sectionNumber,
    codeId: firstCode._id,
    expiresAt: firstCode.expiresAt,
  });
});

export const closeQRCode = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { sectionId, dayNumber } = req.body;

  if (!sectionId || !dayNumber) throw new AppError('Section ID and day number are required', 400);

  const section = await Section.findById(sectionId);
  if (!section) throw new AppError('Section not found', 404);

  // Deactivate all active QR codes for this section and day
  await Code.updateMany({ sectionId, dayNumber, isActive: true }, { isActive: false });

  // Record absences for students who didn't attend
  const students = section.students || [];
  for (const studentId of students) {
    const attendance = await Attendance.findOne({ studentId, sectionId, dayNumber });
    if (!attendance) {
      await Attendance.create({
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
    logger.info(`QR code interval cleared for sectionId=${sectionId}, sectionNumber=${section.sectionNumber}`);
  }

  logger.info(`Section closed: sectionId=${sectionId}, sectionNumber=${section.sectionNumber}, dayNumber=${dayNumber}`);
  res.json({ message: `Section ${section.sectionNumber} closed successfully for day ${dayNumber}` });
});