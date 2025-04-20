import { Router } from 'express';
import { exportAttendance } from '../controllers/export';
import { protect } from '../middlewares/auth';
import { allowTo } from '../controllers/auth';
import { UserRole } from '../models/user';
import { validate } from '../middlewares/validate';
// import { exportAttendanceSchema } from '../validation/export';

const exportRouter = Router();

// exportRouter.get(
//   '/',
//   protect,
//   allowTo(UserRole.INSTRUCTOR, UserRole.ADMIN),
//   validate(exportAttendanceSchema),
//   exportAttendance
// );
// exportRouter.get('/',validate(exportAttendanceSchema), exportAttendance);
exportRouter.get('/', exportAttendance);
export default exportRouter;