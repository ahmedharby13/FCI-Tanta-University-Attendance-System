import { Router } from 'express';
import {
  verifyAttendance,
  recordManualAttendance,
  getAttendance,
  getAttendanceStatistics,
  getStudentAttendance,
} from '../controllers/attendance';
import { protect } from '../middlewares/auth';
import { allowTo } from '../controllers/auth';
import { validate } from '../middlewares/validate';
import { UserRole } from '../models/user';
import {
  verifyQRSchema,
  getAttendanceSchema,
  manualAttendanceSchema,
  getAttendanceStatisticsSchema,
} from '../validation/attendance';

const attendanceRouter = Router();


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