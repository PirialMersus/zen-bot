import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: () => ({})
  },
  updatedAt: {
    type: Date,
    default: Date.now,
    expires: 60 * 60 * 24 * 7
  }
});

export default mongoose.model('Session', sessionSchema);
