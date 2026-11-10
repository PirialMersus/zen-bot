import https from 'https';
import Reminder from '../models/Reminder.js';
import User from '../models/User.js';
import { logError } from '../utils/logger.js';
import { cleanupUser } from './cleanupUser.js';
import { isQuietNow, getQuietEndDate } from './quietHours.js';
import {
  getNextPointerForUser,
  getNextFavoritePointerForUser,
  isPointerInFavorites
} from '../services/pointers.js';
import { buildReminderPointerInlineKeyboard } from '../keyboard/pointers.js';
import { registerDeletionTimer } from './deletionTimers.js';

const TICK_MS = 60 * 1000;
const CREATOR_ID = Number(process.env.CREATOR_ID);
const IS_DEV = process.env.NODE_ENV === 'development';

const INACTIVE_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

const getDeleteAfterSeconds = reminder => {
  if (IS_DEV && Number(reminder.userId) === CREATOR_ID) return 60;
  return reminder.deleteAfterSeconds ?? null;
};

const calcNextRun = (from, minutes) =>
  new Date(from.getTime() + minutes * 60 * 1000);

let lastCleanupDay = null;
let cachedBotUsername = process.env.BOT_USERNAME || '';

const getBotUsername = async bot => {
  if (cachedBotUsername) return cachedBotUsername;
  if (bot?.botInfo?.username) {
    cachedBotUsername = bot.botInfo.username;
    return cachedBotUsername;
  }
  try {
    const me = await bot.telegram.getMe();
    cachedBotUsername = me?.username || '';
  } catch {}
  return cachedBotUsername;
};

const sendPushNotification = async (pushTokens, text, soundId, title = 'Напоминание') => {
  const messages = pushTokens
    .filter(token => token && token.startsWith('ExponentPushToken'))
    .map(token => ({
      to: token,
      sound: 'default',
      title,
      body: text,
      data: { soundId: soundId || 'default' },
    }));

  if (!messages.length) return false;

  const response = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Accept-Encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(messages),
  });

  if (!response.ok) {
    throw new Error(`Expo Push API error: ${response.status}`);
  }

  return true;
};

let isSchedulerTickProcessing = false;

export const startScheduler = bot => {
  setInterval(async () => {
    if (isSchedulerTickProcessing) {
      logError(new Error('Scheduler tick skipped: previous tick is still in progress'), { scope: 'schedulerTickOverlap' });
      return;
    }

    isSchedulerTickProcessing = true;

    try {
      if (process.env.NODE_ENV === 'production' && process.env.HEALTHCHECKS_URL) {
        https.get(process.env.HEALTHCHECKS_URL, r => r.resume()).on('error', () => { });
      }

      const now = new Date();

      const currentDay = now.toISOString().slice(0, 10);
      if (lastCleanupDay !== currentDay) {
        lastCleanupDay = currentDay;
        const cutoff = new Date(now.getTime() - INACTIVE_DAYS * DAY_MS);

        try {
          const inactiveUsers = await User.find(
            {
              lastActivityAt: { $lt: cutoff },
              pushTokens: { $exists: true, $not: { $size: 0 } }
            },
            { telegramId: 1 }
          ).lean();

          for (const u of inactiveUsers) {
            await cleanupUser(u.telegramId).catch(() => { });
          }
        } catch (e) {
          logError(e, { scope: 'inactiveUserCleanup' });
        }
      }

      const reminders = await Reminder.find({
        isActive: true,
        nextRunAt: { $lte: now }
      })
        .sort({ nextRunAt: 1 })
        .lean(false)
        .catch(() => []);

      if (!reminders.length) return;

      const usersCache = new Map();
      const sentThisTick = new Set();

      for (const r of reminders) {
        try {
          if (!r.text || !r.intervalMinutes) continue;

          let user = usersCache.get(r.userId);
          if (!user) {
            user = await User.findOne({ telegramId: Number(r.userId) }).catch(() => null);
            usersCache.set(r.userId, user);
          }

          if (isQuietNow(user, now)) {
            const quietEndDate = getQuietEndDate(user, now);
            const nextRunByInterval = calcNextRun(now, r.intervalMinutes);
            const nextScheduledDate = nextRunByInterval < quietEndDate ? nextRunByInterval : quietEndDate;

            r.nextRunAt = nextScheduledDate;
            await r.save().catch(() => { });

            continue;
          }

          if (sentThisTick.has(r.userId)) {
            continue;
          }

          let msg;
          try {
            let messageText = r.text;
            let currentPointer = null;
            const userLanguage = ['en', 'uk', 'es'].includes(user?.language) ? user.language : 'ru';

            if (r.isFavoritePointer) {
              const favoritePointer = await getNextFavoritePointerForUser(Number(r.userId)).catch(() => null);
              if (favoritePointer) {
                currentPointer = favoritePointer;
                messageText = favoritePointer.source
                  ? `${favoritePointer.text}\n\n— ${favoritePointer.source}`
                  : favoritePointer.text;
              }
            } else if (r.isRandomPointer) {
              const pointer = await getNextPointerForUser(Number(r.userId), 'тишина').catch(() => null);
              if (pointer) {
                currentPointer = pointer;
                messageText = pointer.source
                  ? `${pointer.text}\n\n— ${pointer.source}`
                  : pointer.text;
              }
            }

            const isPointerMessage = Boolean(currentPointer);
            const deleteAfterSeconds = getDeleteAfterSeconds(r);
            const footer = (deleteAfterSeconds && !isPointerMessage)
              ? (userLanguage === 'en'
                ? `\n\n<i>(auto-delete in ${deleteAfterSeconds} sec)</i>`
                : (userLanguage === 'uk'
                  ? `\n\n<i>(автовидалення через ${deleteAfterSeconds} сек)</i>`
                  : (userLanguage === 'es'
                    ? `\n\n<i>(autoeliminación en ${deleteAfterSeconds} seg)</i>`
                    : `\n\n<i>(автоудаление через ${deleteAfterSeconds} сек)</i>`)))
              : '';

            const useApp = user?.notificationChannel === 'app' && user?.pushTokens?.length > 0;
            const pushTitle = userLanguage === 'en'
              ? 'Reminder'
              : (userLanguage === 'uk' ? 'Нагадування' : (userLanguage === 'es' ? 'Recordatorio' : 'Напоминание'));

            if (r.photoFileId) {
              const photoCaption = r.caption ? `${r.caption}${footer}` : (footer ? footer.trim() : '');
              if (useApp) {
                const fallbackCaption = userLanguage === 'en' ? '📷 Photo' : (userLanguage === 'es' ? '📷 Foto' : (userLanguage === 'uk' ? '📷 Фотографія' : '📷 Фотография'));
                await sendPushNotification(user.pushTokens, r.caption || fallbackCaption, r.soundId, pushTitle);
              } else {
                msg = await bot.telegram.sendPhoto(
                  r.chatId,
                  r.photoFileId,
                  photoCaption ? { caption: photoCaption, parse_mode: 'HTML' } : {}
                );

                if (deleteAfterSeconds && msg) {
                  setTimeout(() => {
                    bot.telegram.deleteMessage(r.chatId, msg.message_id).catch(() => { });
                  }, deleteAfterSeconds * 1000);
                }
              }
            } else if (r.videoFileId) {
              const videoCaption = r.caption ? `${r.caption}${footer}` : (footer ? footer.trim() : '');
              if (useApp) {
                const fallbackCaption = userLanguage === 'en' ? '🎬 Video' : (userLanguage === 'es' ? '🎬 Video' : (userLanguage === 'uk' ? '🎬 Відео' : '🎬 Видео'));
                await sendPushNotification(user.pushTokens, r.caption || fallbackCaption, r.soundId, pushTitle);
              } else {
                msg = await bot.telegram.sendVideo(
                  r.chatId,
                  r.videoFileId,
                  videoCaption ? { caption: videoCaption, parse_mode: 'HTML' } : {}
                );

                if (deleteAfterSeconds && msg) {
                  setTimeout(() => {
                    bot.telegram.deleteMessage(r.chatId, msg.message_id).catch(() => { });
                  }, deleteAfterSeconds * 1000);
                }
              }
            } else {
              if (useApp) {
                await sendPushNotification(user.pushTokens, messageText, r.soundId, pushTitle);
              } else {
                if (isPointerMessage) {
                  const isFavorite = await isPointerInFavorites(r.userId, currentPointer._id);
                  const reminderKeyboard = buildReminderPointerInlineKeyboard({
                    pointerId: currentPointer._id,
                    isFavorite,
                    deleteAfterSeconds,
                    showKeepButton: Boolean(deleteAfterSeconds),
                    language: userLanguage
                  });

                  msg = await bot.telegram.sendMessage(
                    r.chatId,
                    messageText,
                    { parse_mode: 'HTML', ...(reminderKeyboard || {}) }
                  );

                  if (deleteAfterSeconds && msg) {
                    registerDeletionTimer(r.chatId, msg.message_id, deleteAfterSeconds, async () => {
                      await bot.telegram.deleteMessage(r.chatId, msg.message_id).catch(() => {});
                    });
                  }
                } else {
                  msg = await bot.telegram.sendMessage(
                    r.chatId,
                    messageText + footer,
                    { parse_mode: 'HTML' }
                  );

                  if (deleteAfterSeconds && msg) {
                    setTimeout(() => {
                      bot.telegram.deleteMessage(r.chatId, msg.message_id).catch(() => { });
                    }, deleteAfterSeconds * 1000);
                  }
                }
              }
            }
          } catch (e) {
            const code = e?.response?.error_code;

            logError(e, {
              scope: 'sendMessage',
              code,
              reminderId: r._id,
              userId: r.userId,
              chatId: r.chatId
            });

            if (code === 403) {
              await cleanupUser(r.userId).catch(() => { });
            }

            if (code === 400) {
              r.isActive = false;
              await r.save().catch(() => { });
            }

            continue;
          }

          sentThisTick.add(r.userId);

          r.lastSentAt = now;
          r.nextRunAt = calcNextRun(now, r.intervalMinutes);
          await r.save().catch(() => { });
        } catch (e) {
          logError(e, { scope: 'reminderItem', reminderId: r._id });
        }
      }
    } catch (e) {
      logError(e, { scope: 'schedulerTick' });
    } finally {
      isSchedulerTickProcessing = false;
    }
  }, TICK_MS);
};
