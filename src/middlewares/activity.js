import Activity from '../models/Activity.js';
import User from '../models/User.js';
import { escapeHtml } from '../utils/escapeHtml.js';
import { isAdministratorUser } from '../utils/admin.js';
import { SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE, LOCALIZED_LANGUAGE_NAMES } from '../constants/languages.js';
import { logError, suppressExpectedError } from '../utils/logger.js';

const defaultFallbackLanguage = DEFAULT_LANGUAGE;
const userCache = new Map();
const USER_CACHE_TTL_MS = 5 * 60 * 1000;
const ACTIVITY_UPDATE_INTERVAL_MS = 5 * 60 * 1000;
const MAX_USER_CACHE_CAPACITY = 5000;

const pruneExpiredUserCacheEntries = (currentTimeMs) => {
  for (const [cachedTelegramId, cachedUserMetadata] of userCache.entries()) {
    if (currentTimeMs - cachedUserMetadata.cachedAt >= USER_CACHE_TTL_MS) {
      userCache.delete(cachedTelegramId);
    }
  }

  if (userCache.size > MAX_USER_CACHE_CAPACITY) {
    const excessEntriesCount = Math.floor(MAX_USER_CACHE_CAPACITY * 0.2);
    const oldestKeysToPrune = Array.from(userCache.keys()).slice(0, excessEntriesCount);
    for (const keyToPrune of oldestKeysToPrune) {
      userCache.delete(keyToPrune);
    }
  }
};

export const clearUserCache = () => {
  userCache.clear();
};

export const invalidateUserCache = (telegramId) => {
  if (telegramId) {
    userCache.delete(Number(telegramId));
  }
};

export const detectUserLanguage = (userLanguageCode) => {
  if (!userLanguageCode || typeof userLanguageCode !== 'string') {
    return defaultFallbackLanguage;
  }
  const normalizedLanguageCode = userLanguageCode.toLowerCase().trim().slice(0, 2);
  if (normalizedLanguageCode === 'uk') {
    return 'uk';
  }
  if (normalizedLanguageCode === 'es') {
    return 'es';
  }
  const slavicRussianLanguageCodes = ['ru', 'be'];
  if (slavicRussianLanguageCodes.includes(normalizedLanguageCode)) {
    return 'ru';
  }
  return 'en';
};

export const resolveUserLanguage = async (ctx) => {
  if (SUPPORTED_LANGUAGES.includes(ctx.state?.userLanguage)) {
    return ctx.state.userLanguage;
  }
  const telegramId = ctx.from?.id || ctx.callbackQuery?.from?.id;
  if (telegramId) {
    const cachedEntry = userCache.get(Number(telegramId));
    if (cachedEntry && SUPPORTED_LANGUAGES.includes(cachedEntry.language)) {
      ctx.state = ctx.state || {};
      ctx.state.userLanguage = cachedEntry.language;
      return cachedEntry.language;
    }

    const existingUser = await User.findOne({ telegramId })
      .lean()
      .catch(() => null);
    if (SUPPORTED_LANGUAGES.includes(existingUser?.language)) {
      ctx.state = ctx.state || {};
      ctx.state.userLanguage = existingUser.language;
      return existingUser.language;
    }
  }
  const telegramLanguageCode = ctx.from?.language_code || ctx.callbackQuery?.from?.language_code;
  const detectedLanguage = detectUserLanguage(telegramLanguageCode);
  ctx.state = ctx.state || {};
  ctx.state.userLanguage = detectedLanguage;
  return detectedLanguage;
};

const notifyAdministratorAboutNewUser = async (ctx, telegramId) => {
  const administratorTelegramIdentifier = process.env.CREATOR_ID;
  if (!administratorTelegramIdentifier) return;
  if (isAdministratorUser(telegramId)) return;

  const userFirstName = ctx.from?.first_name || '';
  const userLastName = ctx.from?.last_name || '';
  const userFullName = [userFirstName, userLastName].filter(Boolean).join(' ') || 'Без имени';
  const usernameString = ctx.from?.username ? `@${ctx.from.username}` : 'нет username';
  const userLanguageCode = ctx.from?.language_code || 'не указан';

  const userCountsByLanguage = await User.aggregate([
    {
      $group: {
        _id: { $ifNull: ['$language', defaultFallbackLanguage] },
        count: { $sum: 1 }
      }
    }
  ]).catch(() => []);

  const languageStatsMap = new Map(
    userCountsByLanguage.map((item) => [item._id, item.count])
  );

  const formattedLanguageBreakdown = SUPPORTED_LANGUAGES.map((langCode) => {
    const languageLabel = LOCALIZED_LANGUAGE_NAMES[langCode] || langCode;
    const count = languageStatsMap.get(langCode) || 0;
    return `• ${languageLabel}: <b>${count}</b>`;
  }).join('\n');

  const alertMessageText = [
    '👤 <b>Новый пользователь в боте!</b>',
    '',
    `Имя: <b>${escapeHtml(userFullName)}</b>`,
    `Аккаунт: ${escapeHtml(usernameString)}`,
    `ID: <code>${escapeHtml(telegramId)}</code>`,
    `Язык в Telegram: <code>${escapeHtml(userLanguageCode)}</code>`,
    '',
    '📊 <b>Пользователи по языкам:</b>',
    formattedLanguageBreakdown
  ].join('\n');

  if (ctx.telegram?.sendMessage) {
    await ctx.telegram
      .sendMessage(administratorTelegramIdentifier, alertMessageText, {
        parse_mode: 'HTML'
      })
      .catch(suppressExpectedError);
  }
};

export const activityMiddleware = async (ctx, next) => {
  if (ctx.myChatMember) return next();

  const telegramId = ctx.from?.id || ctx.callbackQuery?.from?.id || ctx.message?.from?.id;

  if (!telegramId) return next();

  const numericTelegramId = Number(telegramId);
  const now = new Date();
  const currentTimeMs = now.getTime();

  let cachedEntry = userCache.get(numericTelegramId);
  let existingUserRecord = null;

  if (cachedEntry && currentTimeMs - cachedEntry.cachedAt < USER_CACHE_TTL_MS) {
    existingUserRecord = cachedEntry.userRecord;
  } else {
    existingUserRecord = await User.findOne({ telegramId: numericTelegramId })
      .lean()
      .catch(() => null);
  }

  const isBrandNewUser = !existingUserRecord;
  if (isBrandNewUser) {
    await notifyAdministratorAboutNewUser(ctx, numericTelegramId);
  }

  const telegramLanguageCode = ctx.from?.language_code || ctx.callbackQuery?.from?.language_code;
  const initialLanguageForNewUser = detectUserLanguage(telegramLanguageCode);

  const effectiveLanguage = SUPPORTED_LANGUAGES.includes(existingUserRecord?.language)
    ? existingUserRecord.language
    : initialLanguageForNewUser;

  ctx.state = ctx.state || {};
  ctx.state.userLanguage = effectiveLanguage;

  const lastActivityTimestamp = cachedEntry?.lastActivityUpdated || 0;
  const shouldUpdateDatabaseActivity =
    isBrandNewUser || currentTimeMs - lastActivityTimestamp >= ACTIVITY_UPDATE_INTERVAL_MS;

  if (shouldUpdateDatabaseActivity) {
    await User.updateOne(
      { telegramId: numericTelegramId },
      {
        $set: {
          lastActivityAt: now,
          firstName: ctx.from?.first_name || null,
          lastName: ctx.from?.last_name || null,
          username: ctx.from?.username || null
        },
        $setOnInsert: {
          language: effectiveLanguage
        }
      },
      { upsert: true }
    ).catch((error) => {
      logError(error, { context: 'USER_ACTIVITY_UPSERT' });
    });

    if (userCache.size >= MAX_USER_CACHE_CAPACITY) {
      pruneExpiredUserCacheEntries(currentTimeMs);
    }

    userCache.set(numericTelegramId, {
      cachedAt: currentTimeMs,
      lastActivityUpdated: currentTimeMs,
      language: effectiveLanguage,
      userRecord: existingUserRecord || {
        telegramId: numericTelegramId,
        language: effectiveLanguage
      }
    });
  } else if (!cachedEntry) {
    if (userCache.size >= MAX_USER_CACHE_CAPACITY) {
      pruneExpiredUserCacheEntries(currentTimeMs);
    }

    userCache.set(numericTelegramId, {
      cachedAt: currentTimeMs,
      lastActivityUpdated: currentTimeMs,
      language: effectiveLanguage,
      userRecord: existingUserRecord
    });
  }

  Activity.create({
    telegramId: numericTelegramId,
    type: ctx.callbackQuery ? 'callback' : 'message'
  }).catch((error) => {
    logError(error, { context: 'ACTIVITY_LOG_CREATE' });
  });

  return next();
};
