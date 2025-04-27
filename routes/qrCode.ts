import { Router } from 'express';
import { generateQRCode, closeQRCode } from '../controllers/qrCode';
import { protect } from '../middlewares/auth';
import { allowTo } from '../controllers/auth';
import { validate } from '../middlewares/validate';
import { UserRole } from '../models/user';
import { generateQRSchema, closeQRSchema } from '../validation/qrCode';

const qrCodeRouter = Router();

qrCodeRouter.post(
  '/generate',
  protect,
  allowTo(UserRole.INSTRUCTOR),
  validate(generateQRSchema),
  generateQRCode
);

qrCodeRouter.post(
  '/close',
  protect,
  allowTo(UserRole.INSTRUCTOR),
  validate(closeQRSchema),
  closeQRCode
);

export default qrCodeRouter;