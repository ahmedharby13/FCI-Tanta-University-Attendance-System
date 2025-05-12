import mongoose from 'mongoose';
import logger from '../utils/logger';

export const dbConnection = () => {
  mongoose
    .connect(process.env.MONGO_URI as string)
    .then(() => {
      logger.info('Database connected successfully');
    })
    .catch((err) => {
      logger.error(`Database connection error: ${err.message}`);
    });
};