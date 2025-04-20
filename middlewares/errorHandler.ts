import { ErrorRequestHandler } from 'express';
import { AppError } from '../utils/appError';
import logger from '../utils/logger';

// Define error handler with explicit Express ErrorRequestHandler type
export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  if (err instanceof AppError && err.isOperational) {
    logger.error(`Operational Error: ${err.message}, Status: ${err.statusCode}`);
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
    return; // Explicit return to satisfy void
  }

  // Non-operational or unexpected errors
  logger.error(`Unexpected error: ${err.message}, Stack: ${err.stack}`);
  res.status(500).json({
    status: 'error',
    message: 'Something went wrong',
  });
};