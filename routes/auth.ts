import { Router } from 'express';
import { register, login, updatePassword, getMe } from '../controllers/auth';
import { validate } from '../middlewares/validate';
import { protect } from '../middlewares/auth';
import { registerValidation, loginValidation, changePasswordValidation } from '../validation/auth';

const authRouter = Router();

authRouter.post('/register', validate(registerValidation), register);
authRouter.post('/login', validate(loginValidation), login);
authRouter.patch('/update-password', protect, validate(changePasswordValidation), updatePassword);
authRouter.get('/me', protect, getMe);

export default authRouter;