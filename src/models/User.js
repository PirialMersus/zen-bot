import mongoose from 'mongoose';
import { DEFAULT_TIMEZONE } from '../constants/timezones.js';
import { SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE } from '../constants/languages.js';

const schema = new mongoose.Schema(
  {
    telegramId: { type: Number, index: true, unique: true, sparse: true },
    firstName: { type: String },
    lastName: { type: String },
    username: { type: String },

    language: {
      type: String,
      enum: SUPPORTED_LANGUAGES,
      default: DEFAULT_LANGUAGE
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

    timezone: { type: String, default: DEFAULT_TIMEZONE },
    lastActivityAt: { type: Date },

    shuffleQueue: {
      type: [Number],
      default: []
    },
    shuffleIndex: {
      type: Number,
      default: 0
    },
    tagShuffleQueue: {
      type: [Number],
      default: []
    },
    tagShuffleIndex: {
      type: Number,
      default: 0
    },
    shuffleFavoriteQueue: {
      type: [mongoose.Schema.Types.ObjectId],
      default: []
    },
    shuffleFavoriteIndex: {
      type: Number,
      default: 0
    },
    tagShuffleFavoriteQueue: {
      type: [mongoose.Schema.Types.ObjectId],
      default: []
    },
    tagShuffleFavoriteIndex: {
      type: Number,
      default: 0
    },

    favoritePointers: [
      {
        pointerId: { type: mongoose.Schema.Types.ObjectId, index: true },
        addedAt: { type: Date, default: Date.now }
      }
    ],
    favoriteQueue: {
      type: [Number],
      default: []
    },
    favoriteIndex: {
      type: Number,
      default: 0
    },

    authCode: { type: String, index: true },
    authCodeExpiresAt: { type: Date },
    pushTokens: [{ type: String }],

    notificationChannel: {
      type: String,
      enum: ['telegram', 'app'],
      default: 'telegram'
    }
  },
  { timestamps: true }
);

schema.index({ authCode: 1, authCodeExpiresAt: 1 });

export default mongoose.model('User', schema);
