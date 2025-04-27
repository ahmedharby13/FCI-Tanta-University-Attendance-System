import express, { Express } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { dbConnection } from '../config/db';
import authRoutes from '../routes/auth';
import attendanceRoutes from '../routes/attendance';
import classRoutes from '../routes/class';
import exportRoutes from '../routes/export';
import { errorHandler } from '../middlewares/errorHandler';
import logger from '../utils/logger';
import sectionRouter from '../routes/section';
import qrCodeRouter from '../routes/qrCode';

dotenv.config();

const app: Express = express();

const PORT = parseInt(process.env.PORT || '3000', 10);

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || '*', //your frontend URL
    credentials: true,
  })
);

app.use(express.json());

dbConnection()


// API routes
app.use('/api/auth', authRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/qrcodes', qrCodeRouter);
app.use('/api/class', classRoutes);
app.use('/api/sections', sectionRouter);
app.use('/api/export', exportRoutes);

app.get('/', (req, res) => {
  res.send('University Attendance System is running!');
});

app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});

process.on('uncaughtException', (err) => {
  logger.error(`Uncaught Exception: ${err.message}, Stack: ${err.stack}`);
  process.exit(1);
});

process.on('unhandledRejection', (err: Error) => {
  logger.error(`Unhandled Rejection: ${err.message}, Stack: ${err.stack}`);
  process.exit(1);
});