// scripts/migrateNextRunAt.js
import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../src/storage/db.js';
import Reminder from '../src/models/Reminder.js';

await connectDB();

const result = await Reminder.updateMany(
  {
    nextRunAt: { $exists: false },
    isActive: true
  },
  [
    {
      $set: {
        nextRunAt: {
          $add: [
            { $ifNull: ['$lastSentAt', '$createdAt'] },
            { $multiply: ['$intervalMinutes', 60000] }
          ]
        }
      }
    }
  ],
  { updatePipeline: true }
);

console.log('Migrated reminders:', result.modifiedCount);

await mongoose.disconnect();
process.exit(0);
