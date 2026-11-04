// src/models/Pointer.js

import mongoose from 'mongoose';

const PointerSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true
  },
  source: {
    type: String,
    default: null
  },
  tags: {
    type: [String],
    default: []
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

export const Pointer = mongoose.model('Pointer', PointerSchema);
