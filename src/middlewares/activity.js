import Activity from '../models/Activity.js';
import User from '../models/User.js';
import { escapeHtml } from '../utils/escapeHtml.js';

const defaultFallbackLanguage = 'ru';
const userCache = new Map();
const USER_CACHE_TTL_MS = 5 * 60 * 1000;
const ACTIVITY_UPDATE_INTERVAL_MS = 5 * 60 * 1000;

export const clearUserCache = () => {
  userCache.clear();
};

export const invalidateUserCache = telegramId => {
  if (telegramId) {
    userCache.delete(Number(telegramId));
  }
};

export const detectUserLanguage = userLanguageCode => {
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

export const resolveUserLanguage = async ctx => {
  if (['en', 'ru', 'uk', 'es'].includes(ctx.state?.userLanguage)) {
    return ctx.state.userLanguage;
  }
  const telegramId = ctx.from?.id || ctx.callbackQuery?.from?.id;
  if (telegramId) {
    const cachedEntry = userCache.get(Number(telegramId));
    if (cachedEntry && ['en', 'ru', 'uk', 'es'].includes(cachedEntry.language)) {
      ctx.state = ctx.state || {};
      ctx.state.userLanguage = cachedEntry.language;
      return cachedEntry.language;
    }

    const existingUser = await User.findOne({ telegramId }).lean().catch(() => null);
    if (['en', 'ru', 'uk', 'es'].includes(existingUser?.language)) {
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
  if (String(telegramId) === String(administratorTelegramIdentifier)) return;

  const userFirstName = ctx.from?.first_name || '';
  const userLastName = ctx.from?.last_name || '';
  const userFullName = [userFirstName, userLastName].filter(Boolean).join(' ') || 'Без имени';
  const usernameString = ctx.from?.username ? `@${ctx.from.username}` : 'нет username';
  const userLanguageCode = ctx.from?.language_code || 'не указан';

  const alertMessageText = [
    '👤 <b>Новый пользователь в боте!</b>',
    '',
    `Имя: <b>${escapeHtml(userFullName)}</b>`,
    `Аккаунт: ${escapeHtml(usernameString)}`,
    `ID: <code>${escapeHtml(telegramId)}</code>`,
    `Язык: <code>${escapeHtml(userLanguageCode)}</code>`
  ].join('\n');

  if (ctx.telegram?.sendMessage) {
    await ctx.telegram.sendMessage(administratorTelegramIdentifier, alertMessageText, {
      parse_mode: 'HTML'
    }).catch(() => {});
  }
};

export const activityMiddleware = async (ctx, next) => {
  const telegramId =
    ctx.from?.id ||
    ctx.callbackQuery?.from?.id ||
    ctx.message?.from?.id;

  if (!telegramId) return next();

  const numericTelegramId = Number(telegramId);
  const now = new Date();
  const currentTimeMs = now.getTime();

  let cachedEntry = userCache.get(numericTelegramId);
  let existingUserRecord = null;

  if (cachedEntry && currentTimeMs - cachedEntry.cachedAt < USER_CACHE_TTL_MS) {
    existingUserRecord = cachedEntry.userRecord;
  } else {
    existingUserRecord = await User.findOne({ telegramId: numericTelegramId }).lean().catch(() => null);
  }

  const isBrandNewUser = !existingUserRecord;
  if (isBrandNewUser) {
    await notifyAdministratorAboutNewUser(ctx, numericTelegramId);
  }

  const telegramLanguageCode = ctx.from?.language_code || ctx.callbackQuery?.from?.language_code;
  const initialLanguageForNewUser = detectUserLanguage(telegramLanguageCode);

  const effectiveLanguage = ['en', 'ru', 'uk', 'es'].includes(existingUserRecord?.language)
    ? existingUserRecord.language
    : initialLanguageForNewUser;

  ctx.state = ctx.state || {};
  ctx.state.userLanguage = effectiveLanguage;

  const lastActivityTimestamp = cachedEntry?.lastActivityUpdated || 0;
  const shouldUpdateDatabaseActivity = isBrandNewUser || (currentTimeMs - lastActivityTimestamp >= ACTIVITY_UPDATE_INTERVAL_MS);

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
    ).catch(() => {});

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
  }).catch(() => {});

  return next();
};
