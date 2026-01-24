// src/models/Activity.js
import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  telegramId: { type: Number, index: true },
  type: String,
  createdAt: { type: Date, default: Date.now, expires: 60 * 60 * 24 * 30 }
});

export default mongoose.model('Activity', schema);

