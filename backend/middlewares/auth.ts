import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User, IUser, UserRole } from '../models/user';
import logger from '../utils/logger';
import { asyncHandler } from '../utils/asyncHandler';

interface AuthRequest extends Request {
  user?: IUser;
}

export const protect = asyncHandler(async (req: AuthRequest, res: Response, next: NextFunction) => {
  let token: string | undefined;

  if (req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    throw new Error('No token provided');
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

    req.user = user;
    next();
  } catch (err) {
    logger.error(`Token verification failed: ${err}`);
    throw new Error('Invalid token');
  }
});