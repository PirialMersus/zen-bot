// src/models/Reminder.js
import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  userId: String,
  chatId: { type: Number, index: true },
  text: String,
  intervalMinutes: Number,
  deleteAfterSeconds: Number,
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },

  lastSentAt: Date,
  nextRunAt: { type: Date, index: true },

  // Поле для мобильного приложения
  soundId: { type: String, default: 'default' }
});

export default mongoose.model('Reminder', schema);
