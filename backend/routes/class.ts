import { Router } from 'express';
import {
  createClass,
  addStudents,
  removeStudents,
  deleteClass,
  getMyClasses,
} from '../controllers/class';
import { protect } from '../middlewares/auth';
import { allowTo } from '../controllers/auth';
import { validate } from '../middlewares/validate';
import { UserRole } from '../models/user';
import {
  createClassSchema,
  addStudentsSchema,
  removeStudentsSchema,
  deleteClassSchema,
} from '../validation/class';

const classRouter = Router();

classRouter.post(
  '/create',
  protect,
  allowTo(UserRole.INSTRUCTOR, UserRole.ADMIN),
  validate(createClassSchema),
  createClass
);

classRouter.post(
  '/add-students',
  protect,
  allowTo(UserRole.INSTRUCTOR, UserRole.ADMIN),
  validate(addStudentsSchema),
  addStudents
);

classRouter.delete(
  '/remove-students',
  protect,
  allowTo(UserRole.INSTRUCTOR, UserRole.ADMIN),
  validate(removeStudentsSchema),
  removeStudents
);

classRouter.delete(
  '/delete',
  protect,
  allowTo(UserRole.ADMIN),
  validate(deleteClassSchema),
  deleteClass
);

classRouter.get(
  '/my-classes',
  protect,
  allowTo(UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.STUDENT),
  getMyClasses
);

export default classRouter;