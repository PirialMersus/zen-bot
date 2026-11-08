import mongoose from 'mongoose';
import { Pointer, PointerEn, PointerUk } from '../models/Pointer.js';
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
  if (userLanguage === 'en' && (tagFilter === 'тишина' || tagFilter === 'тиша')) {
    return 'stillness';
  }
  if (userLanguage === 'ru' && (tagFilter === 'stillness' || tagFilter === 'тиша')) {
    return 'тишина';
  }
  if (userLanguage === 'uk' && (tagFilter === 'stillness' || tagFilter === 'тишина')) {
    return 'тиша';
  }
  return tagFilter;
};

const selectPointerModelByLanguage = language => {
  if (language === 'en') return PointerEn;
  if (language === 'uk') return PointerUk;
  return Pointer;
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

  const userLanguage = ['en', 'uk'].includes(user?.language) ? user.language : 'ru';
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

export const isPointerInFavorites = async (telegramUserId, pointerId) => {
  if (!pointerId || !mongoose.Types.ObjectId.isValid(pointerId)) return false;
  const user = await User.findOne({
    telegramId: telegramUserId,
    'favoritePointers.pointerId': pointerId
  }).lean();
  return Boolean(user);
};

export const toggleFavoritePointer = async (telegramUserId, pointerId) => {
  if (!pointerId || !mongoose.Types.ObjectId.isValid(pointerId)) {
    return { isFavorite: false, totalFavorites: 0 };
  }

  let user = await User.findOne({ telegramId: telegramUserId });
  if (!user) {
    user = await User.create({ telegramId: telegramUserId });
  }

  const existingIndex = user.favoritePointers.findIndex(
    item => String(item.pointerId) === String(pointerId)
  );

  let isFavoriteNow = false;

  if (existingIndex >= 0) {
    user.favoritePointers = user.favoritePointers.filter(
      item => String(item.pointerId) !== String(pointerId)
    );
    user.favoriteQueue = [];
    user.favoriteIndex = 0;
    isFavoriteNow = false;
  } else {
    user.favoritePointers.push({ pointerId });
    user.favoriteQueue = [];
    user.favoriteIndex = 0;
    isFavoriteNow = true;
  }

  await user.save();
  return { isFavorite: isFavoriteNow, totalFavorites: user.favoritePointers.length };
};

export const getNextFavoritePointerForUser = async (telegramUserId) => {
  let user = await User.findOne({ telegramId: telegramUserId });
  if (!user || !user.favoritePointers || user.favoritePointers.length === 0) {
    return null;
  }

  const userLanguage = ['en', 'uk'].includes(user?.language) ? user.language : 'ru';
  const targetPointerModel = selectPointerModelByLanguage(userLanguage);
  const fallbackPointerModels = [Pointer, PointerEn, PointerUk].filter(model => model !== targetPointerModel);

  const validFavorites = [];
  const resolvedPointersMap = new Map();

  for (const item of user.favoritePointers) {
    if (!item?.pointerId || !mongoose.Types.ObjectId.isValid(item.pointerId)) {
      continue;
    }
    let doc = await targetPointerModel.findById(item.pointerId);
    if (!doc) {
      for (const fallbackModel of fallbackPointerModels) {
        doc = await fallbackModel.findById(item.pointerId);
        if (doc) break;
      }
    }
    if (doc && doc.isActive) {
      validFavorites.push(item);
      resolvedPointersMap.set(String(doc._id), doc);
    }
  }

  if (validFavorites.length === 0) {
    if (user.favoritePointers.length > 0) {
      user.favoritePointers = [];
      user.favoriteQueue = [];
      user.favoriteIndex = 0;
      await user.save();
    }
    return null;
  }

  if (validFavorites.length !== user.favoritePointers.length) {
    user.favoritePointers = validFavorites;
    user.favoriteQueue = [];
    user.favoriteIndex = 0;
  }

  const totalFavoritesCount = validFavorites.length;
  let currentQueue = [...user.favoriteQueue];
  let currentIndex = user.favoriteIndex;

  if (currentQueue.length === 0 || currentQueue.length !== totalFavoritesCount || currentIndex >= currentQueue.length) {
    currentQueue = buildShuffledIndexArray(totalFavoritesCount);
    currentIndex = 0;
  }

  const selectedPositionIndex = currentQueue[currentIndex];
  const selectedFavoriteItem = validFavorites[selectedPositionIndex];
  const pointer = resolvedPointersMap.get(String(selectedFavoriteItem.pointerId));

  const nextIndex = currentIndex + 1 >= currentQueue.length ? 0 : currentIndex + 1;
  const nextQueue = nextIndex === 0 ? buildShuffledIndexArray(totalFavoritesCount) : currentQueue;

  await User.updateOne(
    { telegramId: telegramUserId },
    {
      favoritePointers: validFavorites,
      favoriteQueue: nextQueue,
      favoriteIndex: nextIndex
    }
  );

  if (pointer) {
    pointer.favoritePosition = currentIndex + 1;
    pointer.totalFavorites = totalFavoritesCount;
  }

  return pointer;
};

export const countUserFavoritePointers = async (telegramUserId) => {
  const user = await User.findOne({ telegramId: telegramUserId }).lean();
  return user?.favoritePointers?.length || 0;
};
