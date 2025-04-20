import express, { Express } from 'express';
import dotenv from 'dotenv';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { dbConnection } from '../config/db';
import authRoutes from '../routes/auth';
import attendanceRoutes from '../routes/attendance';
import classRoutes from '../routes/class';
import exportRoutes from '../routes/export';
import { errorHandler } from '../middlewares/errorHandler';
import logger from '../utils/logger';
import { startCleanupJob } from '../utils/cleanup';

// Load environment variables from .env file
dotenv.config();

// Initialize Express app
const app: Express = express();

// Define port with fallback to 3000
const PORT = parseInt(process.env.PORT || '3000', 10);

// Security middleware
app.use(helmet()); // Protect HTTP headers
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || '*', // Adjust based on your frontend URL
    credentials: true,
  })
);

// Rate limiting to prevent abuse
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});
app.use(limiter);

// Parse incoming JSON requests
app.use(express.json());

// Connect to the database
dbConnection()

// Start cleanup job for old sections and QR codes
startCleanupJob();

// Define API routes
app.use('/api/auth', authRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/class', classRoutes);
app.use('/api/export', exportRoutes);

// Default route
app.get('/', (req, res) => {
  res.send('University Attendance System is running!');
});

// Global error handling middleware
app.use(errorHandler);

// Start the server
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error(`Uncaught Exception: ${err.message}, Stack: ${err.stack}`);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err: Error) => {
  logger.error(`Unhandled Rejection: ${err.message}, Stack: ${err.stack}`);
  process.exit(1);
});