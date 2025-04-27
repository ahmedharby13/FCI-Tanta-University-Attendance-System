// import cron from 'node-cron';
// import { Code } from '../models/code';
// import logger from './logger';

// export const startCleanupJob = () => {
//   // Run daily at midnight
//   cron.schedule('0 0 * * *', async () => {
//     try {
//       logger.info('Starting cleanup job for expired QR codes');

//       const today = new Date();
//       today.setHours(0, 0, 0, 0); // Start of today
//       const yesterday = new Date(today);
//       yesterday.setDate(today.getDate() - 1); // Start of yesterday

//       // Deactivate QR codes from previous days
//       const codeCleanupResult = await Code.updateMany(
//         {
//           isActive: true,
//           expiresAt: { $lt: yesterday },
//         },
//         { isActive: false }
//       );

//       logger.info(`Deactivated ${codeCleanupResult.modifiedCount} expired QR codes from previous days`);

//       logger.info('Cleanup job completed successfully');
//     } catch (error) {
//       logger.error(`Cleanup job failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
//     }
//   });

//   logger.info('Cleanup job scheduled to run daily at midnight');
// };