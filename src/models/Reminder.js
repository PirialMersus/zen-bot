import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  userId: { type: String, index: true },
  chatId: { type: Number, index: true },
  text: String,
  photoFileId: { type: String, default: null },
  videoFileId: { type: String, default: null },
  caption: { type: String, default: null },
  intervalMinutes: Number,
  deleteAfterSeconds: Number,
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },

  lastSentAt: Date,
  nextRunAt: { type: Date, index: true },

  soundId: { type: String, default: 'default' },

  isRandomPointer: { type: Boolean, default: false }
});

schema.index({ isActive: 1, nextRunAt: 1 });

export default mongoose.model('Reminder', schema);
