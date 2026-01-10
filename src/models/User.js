// src/models/User.js
import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  telegramId: Number,

  lastReminderTexts: {
    type: [String],
    default: []
  },

  quietHours: {
    enabled: { type: Boolean, default: true },
    start: { type: Number, default: 23 },
    end: { type: Number, default: 8 }
  }
});

export default mongoose.model('User', schema);
