// src/services/pointers.js
import { Pointer } from '../models/Pointer.js';

export const getRandomPointer = async () => {
  const count = await Pointer.countDocuments({ isActive: true });
  if (!count) return null;

  const random = Math.floor(Math.random() * count);

  const [pointer] = await Pointer.find({ isActive: true })
    .skip(random)
    .limit(1);

  return pointer || null;
};
