// src/models/User.js
import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  telegramId: { type: Number, index: true },
  firstName: { type: String },
  lastName: { type: String },
  username: { type: String },

  lastReminderTexts: {
    type: [String],
    default: []
  },

  quietHours: {
    enabled: { type: Boolean, default: true },
    start: { type: Number, default: 23 },
    end: { type: Number, default: 8 }
  },

  timezone: { type: String, default: 'Europe/Minsk' },
  lastActivityAt: { type: Date },

  shuffleQueue: {
    type: [Number],
    default: []
  },
  shuffleIndex: {
    type: Number,
    default: 0
  },

  // Поля для мобильного приложения
  authCode: { type: String },
  authCodeExpiresAt: { type: Date },
  pushTokens: [{ type: String }],

  // Канал уведомлений: telegram (по умолчанию) или app
  notificationChannel: {
    type: String,
    enum: ['telegram', 'app'],
    default: 'telegram'
  }
}, { timestamps: true });

export default mongoose.model('User', schema);
