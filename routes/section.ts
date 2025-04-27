import { Router } from 'express';
import {
  getMySections,
  createSection,
  deleteSection,
  addStudentsToSection,
  removeStudentsFromSection,
} from '../controllers/section';
import { protect } from '../middlewares/auth';
import { allowTo } from '../controllers/auth';
import { validate } from '../middlewares/validate';
import { UserRole } from '../models/user';
import {
  createSectionSchema,
  deleteSectionSchema,
  addStudentsToSectionSchema,
  removeStudentsFromSectionSchema
} from '../validation/section';

const sectionRouter = Router();

sectionRouter.get(
  '/my-sections',
  protect,
  allowTo(UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.STUDENT),
  getMySections
);


sectionRouter.post(
  '/create',
  protect,
  allowTo(UserRole.INSTRUCTOR, UserRole.ADMIN),
  validate(createSectionSchema),
  createSection
);

sectionRouter.delete(
  '/delete',
  protect,
  allowTo(UserRole.INSTRUCTOR, UserRole.ADMIN),
  validate(deleteSectionSchema),
  deleteSection
);

sectionRouter.post(
  '/add-students',
  protect,
  allowTo(UserRole.INSTRUCTOR, UserRole.ADMIN),
  validate(addStudentsToSectionSchema),
  addStudentsToSection
);

sectionRouter.delete(
  '/remove-students',
  protect,
  allowTo(UserRole.INSTRUCTOR, UserRole.ADMIN),
  validate(removeStudentsFromSectionSchema),
  removeStudentsFromSection
);

export default sectionRouter;