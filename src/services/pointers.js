import { Pointer, PointerEn } from '../models/Pointer.js';
import User from '../models/User.js';

const buildShuffledIndexArray = length => {
  const indexArray = Array.from({ length }, (_, i) => i);
  for (let currentIndex = indexArray.length - 1; currentIndex > 0; currentIndex--) {
    const randomIndex = Math.floor(Math.random() * (currentIndex + 1));
    [indexArray[currentIndex], indexArray[randomIndex]] = [indexArray[randomIndex], indexArray[currentIndex]];
  }
  return indexArray;
};

const resolveEffectiveTagFilter = (tagFilter, userLanguage) => {
  if (!tagFilter) return null;
  if (userLanguage === 'en' && tagFilter === 'тишина') {
    return 'stillness';
  }
  if (userLanguage === 'ru' && tagFilter === 'stillness') {
    return 'тишина';
  }
  return tagFilter;
};

const selectPointerModelByLanguage = language => {
  return language === 'en' ? PointerEn : Pointer;
};

const escapeRegularExpressionString = unescapedTextString => {
  return unescapedTextString.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

const buildTextSearchCriteria = rawSearchQuery => {
  const normalizedSearchQuery = typeof rawSearchQuery === 'string' ? rawSearchQuery.trim() : '';
  if (!normalizedSearchQuery) {
    return null;
  }

  const escapedSearchPattern = escapeRegularExpressionString(normalizedSearchQuery);
  return {
    text: { $regex: escapedSearchPattern, $options: 'i' },
    isActive: true
  };
};

export const findPointersByText = async (rawSearchQuery, language = 'ru', maximumRecordsLimit = 10) => {
  const searchCriteria = buildTextSearchCriteria(rawSearchQuery);
  if (!searchCriteria) {
    return [];
  }

  const targetPointerModel = selectPointerModelByLanguage(language);
  return await targetPointerModel
    .find(searchCriteria)
    .sort({ number: 1 })
    .limit(maximumRecordsLimit);
};

export const countPointersByText = async (rawSearchQuery, language = 'ru') => {
  const searchCriteria = buildTextSearchCriteria(rawSearchQuery);
  if (!searchCriteria) {
    return 0;
  }

  const targetPointerModel = selectPointerModelByLanguage(language);
  return await targetPointerModel.countDocuments(searchCriteria);
};

export const getPointerByNumber = async (pointerNumber, language = 'ru') => {
  const numericPointerIdentifier = Number(pointerNumber);
  if (!numericPointerIdentifier || isNaN(numericPointerIdentifier)) return null;

  const targetPointerModel = selectPointerModelByLanguage(language);
  return await targetPointerModel.findOne({ number: numericPointerIdentifier, isActive: true });
};

export const getNextPointerForUser = async (telegramUserId, tagFilter = null) => {
  let user = await User.findOne({ telegramId: telegramUserId });
  if (!user) {
    user = await User.create({ telegramId: telegramUserId });
  }

  const userLanguage = user?.language === 'en' ? 'en' : 'ru';
  const effectiveTagFilter = resolveEffectiveTagFilter(tagFilter, userLanguage);
  const targetPointerModel = selectPointerModelByLanguage(userLanguage);

  const activePointersQuery = {
    isActive: true
  };

  if (effectiveTagFilter) {
    activePointersQuery.tags = effectiveTagFilter;
  }

  const totalActiveCount = await targetPointerModel.countDocuments(activePointersQuery);
  if (!totalActiveCount) return null;

  const previousQueueLength = user.shuffleQueue.length;
  let currentQueue = [...user.shuffleQueue];
  let currentIndex = user.shuffleIndex;

  if (previousQueueLength === 0 || previousQueueLength !== totalActiveCount) {
    currentQueue = buildShuffledIndexArray(totalActiveCount);
    currentIndex = 0;
  } else if (currentIndex >= currentQueue.length) {
    currentQueue = buildShuffledIndexArray(totalActiveCount);
    currentIndex = 0;
  }

  const pointerPositionIndex = currentQueue[currentIndex];

  const [pointer] = await targetPointerModel.find(activePointersQuery)
    .sort({ number: 1, _id: 1 })
    .skip(pointerPositionIndex)
    .limit(1);

  if (!pointer) {
    const freshQueue = buildShuffledIndexArray(totalActiveCount);
    await User.updateOne(
      { telegramId: telegramUserId },
      { shuffleQueue: freshQueue, shuffleIndex: 0 }
    );
    const [fallbackPointer] = await targetPointerModel.find(activePointersQuery)
      .sort({ number: 1, _id: 1 })
      .limit(1);
    return fallbackPointer || null;
  }

  const nextIndex = currentIndex + 1 >= currentQueue.length ? 0 : currentIndex + 1;
  const nextQueue = nextIndex === 0 ? buildShuffledIndexArray(totalActiveCount) : currentQueue;

  await User.updateOne(
    { telegramId: telegramUserId },
    { shuffleQueue: nextQueue, shuffleIndex: nextIndex }
  );

  return pointer;
};
