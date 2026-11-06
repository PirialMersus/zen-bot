import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  telegramId: { type: Number, index: true, unique: true, sparse: true },
  firstName: { type: String },
  lastName: { type: String },
  username: { type: String },

  language: {
    type: String,
    enum: ['ru', 'en'],
    default: 'ru'
  },

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

  favoritePointers: [{
    pointerId: { type: mongoose.Schema.Types.ObjectId, index: true },
    addedAt: { type: Date, default: Date.now }
  }],
  favoriteQueue: {
    type: [Number],
    default: []
  },
  favoriteIndex: {
    type: Number,
    default: 0
  },

  authCode: { type: String },
  authCodeExpiresAt: { type: Date },
  pushTokens: [{ type: String }],

  notificationChannel: {
    type: String,
    enum: ['telegram', 'app'],
    default: 'telegram'
  }
}, { timestamps: true });

export default mongoose.model('User', schema);
