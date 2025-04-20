import { Router } from 'express';
import {
  verifyAttendance,
  recordManualAttendance,
  getAttendance,
  getAttendanceStatistics,
  getStudentAttendance,
} from '../controllers/attendance';
import { generateQRCode, closeQRCode } from '../controllers/qrCode';
import { createSection, updateSection, deleteSection } from '../controllers/section';
import { addStudentsToSection, removeStudentsFromSection } from '../controllers/studentSection';
import { protect } from '../middlewares/auth';
import { allowTo } from '../controllers/auth';
import { validate } from '../middlewares/validate';
import { UserRole } from '../models/user';
import {
  generateQRSchema,
  closeQRSchema,
  verifyQRSchema,
  getAttendanceSchema,
  manualAttendanceSchema,
  getAttendanceStatisticsSchema,
  createSectionSchema,
  updateSectionSchema,
  deleteSectionSchema,
  addStudentsToSectionSchema,
  removeStudentsFromSectionSchema,
} from '../validation/attendance';

const attendanceRouter = Router();

attendanceRouter.post(
  '/section/create',
  protect,
  allowTo(UserRole.INSTRUCTOR, UserRole.ADMIN),
  validate(createSectionSchema),
  createSection
);

attendanceRouter.patch(
  '/section/update',
  protect,
  allowTo(UserRole.INSTRUCTOR, UserRole.ADMIN),
  validate(updateSectionSchema),
  updateSection
);

attendanceRouter.delete(
  '/section/delete',
  protect,
  allowTo(UserRole.INSTRUCTOR, UserRole.ADMIN),
  validate(deleteSectionSchema),
  deleteSection
);

attendanceRouter.post(
  '/section/add-students',
  protect,
  allowTo(UserRole.INSTRUCTOR, UserRole.ADMIN),
  validate(addStudentsToSectionSchema),
  addStudentsToSection
);

attendanceRouter.delete(
  '/section/remove-students',
  protect,
  allowTo(UserRole.INSTRUCTOR, UserRole.ADMIN),
  validate(removeStudentsFromSectionSchema),
  removeStudentsFromSection
);

attendanceRouter.post(
  '/generate',
  protect,
  allowTo(UserRole.INSTRUCTOR),
  validate(generateQRSchema),
  generateQRCode
);

attendanceRouter.post(
  '/close',
  protect,
  allowTo(UserRole.INSTRUCTOR),
  validate(closeQRSchema),
  closeQRCode
);

attendanceRouter.post(
  '/verify/:code',
  protect,
  allowTo(UserRole.STUDENT),
  validate(verifyQRSchema),
  verifyAttendance
);

attendanceRouter.patch(
  '/manual',
  protect,
  allowTo(UserRole.INSTRUCTOR, UserRole.ADMIN),
  validate(manualAttendanceSchema),
  recordManualAttendance
);

attendanceRouter.get(
  '/',
  protect,
  allowTo(UserRole.INSTRUCTOR, UserRole.ADMIN),
  validate(getAttendanceSchema),
  getAttendance
);

attendanceRouter.get(
  '/student',
  protect,
  allowTo(UserRole.STUDENT),
  validate(getAttendanceSchema),
  getStudentAttendance
);

attendanceRouter.get(
  '/statistics',
  protect,
  allowTo(UserRole.INSTRUCTOR, UserRole.ADMIN),
  validate(getAttendanceStatisticsSchema),
  getAttendanceStatistics
);

export default attendanceRouter;