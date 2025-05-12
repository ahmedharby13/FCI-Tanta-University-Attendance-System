import { Router } from 'express';
import { register, login, getMe, allowTo, getAllStudents } from '../controllers/auth';
import { validate } from '../middlewares/validate';
import { protect } from '../middlewares/auth';
import { registerValidation, loginValidation } from '../validation/auth';
import { UserRole } from '../models/user';

const authRouter = Router();

authRouter.post('/register', validate(registerValidation), register);
authRouter.post('/login', validate(loginValidation), login);
authRouter.get('/me', protect, getMe);
authRouter.get('/students', protect,allowTo(UserRole.ADMIN, UserRole.INSTRUCTOR), getAllStudents);

export default authRouter;