// scripts/fixStuckReminders.js
import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../src/storage/db.js';
import Reminder from '../src/models/Reminder.js';

await connectDB();

const now = new Date();

const stuck = await Reminder.find({
  isActive: true,
  nextRunAt: {
    $gt: new Date(now.getTime() + 6 * 60 * 60 * 1000)
  }
});

let fixed = 0;

for (const r of stuck) {
  if (!r.intervalMinutes) continue;

  r.nextRunAt = new Date(now.getTime() + r.intervalMinutes * 60 * 1000);
  await r.save();
  fixed++;
}

console.log(`Fixed stuck reminders: ${fixed}`);

await mongoose.disconnect();
process.exit(0);
