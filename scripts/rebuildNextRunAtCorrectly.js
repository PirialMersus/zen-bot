// scripts/rebuildNextRunAtCorrectly.js
import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../src/storage/db.js';
import Reminder from '../src/models/Reminder.js';

await connectDB();

const now = new Date();

const reminders = await Reminder.find({
  intervalMinutes: { $exists: true }
});

let fixed = 0;

for (const r of reminders) {
  const intervalMs = r.intervalMinutes * 60 * 1000;
  let base = r.lastSentAt ?? r.createdAt;

  if (!base) continue;

  let next = new Date(base.getTime() + intervalMs);

  while (next <= now) {
    next = new Date(next.getTime() + intervalMs);
  }

  r.nextRunAt = next;
  await r.save();
  fixed++;
}

console.log('Recalculated nextRunAt:', fixed);

await mongoose.disconnect();
process.exit(0);
