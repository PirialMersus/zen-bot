import { Pointer } from '../models/Pointer.js';

export const getRandomPointer = async (tag = null) => {
  const query = { isActive: true };
  if (tag) {
    query.tags = tag;
  }
  const count = await Pointer.countDocuments(query);
  if (!count) return null;

  const random = Math.floor(Math.random() * count);

  const [pointer] = await Pointer.find(query)
    .skip(random)
    .limit(1);

  return pointer || null;
};
