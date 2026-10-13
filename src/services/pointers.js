import { Pointer } from '../models/Pointer.js';
import User from '../models/User.js';

const buildShuffledIndexArray = (length) => {
  const indexArray = Array.from({ length }, (_, i) => i);
  for (let currentIndex = indexArray.length - 1; currentIndex > 0; currentIndex--) {
    const randomIndex = Math.floor(Math.random() * (currentIndex + 1));
    [indexArray[currentIndex], indexArray[randomIndex]] = [indexArray[randomIndex], indexArray[currentIndex]];
  }
  return indexArray;
};

const appendNewIndicesToExistingQueue = (existingQueue, previousTotalCount, newTotalCount) => {
  const newIndices = [];
  for (let i = previousTotalCount; i < newTotalCount; i++) {
    newIndices.push(i);
  }
  if (newIndices.length === 0) return existingQueue;

  const shuffledNewIndices = buildShuffledIndexArray(newIndices.length).map(i => newIndices[i]);
  return [...existingQueue, ...shuffledNewIndices];
};

export const getNextPointerForUser = async (telegramUserId) => {
  const activePointersQuery = { isActive: true };
  const totalActiveCount = await Pointer.countDocuments(activePointersQuery);
  if (!totalActiveCount) return null;

  let user = await User.findOne({ telegramId: telegramUserId });
  if (!user) {
    user = await User.create({ telegramId: telegramUserId });
  }

  const previousQueueLength = user.shuffleQueue.length;
  let currentQueue = [...user.shuffleQueue];
  let currentIndex = user.shuffleIndex;

  if (previousQueueLength === 0) {
    currentQueue = buildShuffledIndexArray(totalActiveCount);
    currentIndex = 0;
  } else if (totalActiveCount > previousQueueLength) {
    currentQueue = appendNewIndicesToExistingQueue(currentQueue, previousQueueLength, totalActiveCount);
  } else if (currentIndex >= currentQueue.length) {
    currentQueue = buildShuffledIndexArray(totalActiveCount);
    currentIndex = 0;
  }

  const pointerPositionIndex = currentQueue[currentIndex];

  const [pointer] = await Pointer.find(activePointersQuery)
    .skip(pointerPositionIndex)
    .limit(1);

  if (!pointer) {
    const freshQueue = buildShuffledIndexArray(totalActiveCount);
    await User.updateOne(
      { telegramId: telegramUserId },
      { shuffleQueue: freshQueue, shuffleIndex: 0 }
    );
    return null;
  }

  const nextIndex = currentIndex + 1 >= currentQueue.length ? 0 : currentIndex + 1;
  const nextQueue = nextIndex === 0 ? buildShuffledIndexArray(totalActiveCount) : currentQueue;

  await User.updateOne(
    { telegramId: telegramUserId },
    { shuffleQueue: nextQueue, shuffleIndex: nextIndex }
  );

  return pointer;
};
