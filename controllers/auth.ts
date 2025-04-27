import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User, UserRole, IUser } from '../models/user';
import { asyncHandler } from '../utils/asyncHandler';
import logger from '../utils/logger';
import { count } from 'console';
import { Logger } from 'winston';

const sendTokenResponse = (user: IUser, statusCode: number, res: Response) => {
  const jwtSecret = process.env.JWT_SECRET;
  const jwtExpire = process.env.JWT_EXPIRE || '1h';

  if (!jwtSecret) {
    console.error('Environment variable JWT_SECRET is missing');
    throw new Error('Internal server error');
  }

  const token = jwt.sign(
    { id: user._id.toString(), role: user.role },
    jwtSecret,
    { expiresIn: jwtExpire }
  );

  res.status(statusCode).json({ success: true, token, role: user.role, id: user._id });
};
interface AuthRequest extends Request {
  user?: IUser;
}

export const register = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { name, email, password, studentId, department, role } = req.body;

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new Error('Email already registered');
  }

  // Determine the role to assign
  const assignedRole = role || UserRole.STUDENT;

  // If creating a student account, verify authentication and role
  if (assignedRole === UserRole.STUDENT) {
    let token: string | undefined;
    if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      throw new Error('No token provided for student account creation');
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      logger.error('Environment variable JWT_SECRET is missing');
      throw new Error('Internal server error');
    }

    try {
      const decoded = jwt.verify(token, jwtSecret) as { id: string; role: UserRole };
      const user = await User.findById(decoded.id);
      if (!user) {
        throw new Error('User not found');
      }
      if (![UserRole.ADMIN, UserRole.INSTRUCTOR].includes(user.role)) {
        throw new Error('Only admins or instructors can create student accounts');
      }
      req.user = user; // Set req.user for consistency
    } catch (err) {
      logger.error(`Token verification failed: ${err}`);
      throw new Error('Invalid token');
    }
  }

  // Prepare user data, only include studentId and department for students
  const userData: Partial<IUser> = {
    name,
    email,
    password,
    role: assignedRole,
  };

  if (assignedRole === UserRole.STUDENT) {
    userData.studentId = studentId || null;
    userData.department = department || null;
  }

  const user = await User.create(userData);

  sendTokenResponse(user, 201, res);
});

export const login = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new Error('Email and password are required');
  }

  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    throw new Error('Invalid credentials');
  }

  sendTokenResponse(user, 200, res);
});

export const getMe = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = await User.findById(req.user!.id);
  res.json({ success: true, data: user });
});

export const allowTo = (...roles: UserRole[]) => asyncHandler(async (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user || !roles.includes(req.user.role)) {
    throw new Error('Unauthorized access');
  }
  next();
});

export const getAllStudents = asyncHandler(async (req: AuthRequest, res: Response) => {
  const students = await User.find({ role: UserRole.STUDENT }).select('-password');
  res.status(200).json({
     success: true,
     count: students.length,
      data: students 
    });
});

