// src/models/Reminder.js
import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  userId: String,
  chatId: Number,
  text: String,
  intervalMinutes: Number,
  deleteAfterSeconds: Number,
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  lastSentAt: Date
});

export default mongoose.model('Reminder', schema);
