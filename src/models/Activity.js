// src/models/Activity.js

import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  telegramId: Number,
  type: String,
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Activity', schema);
