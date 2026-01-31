// src/services/scheduler.js
import https from 'https';
import Reminder from '../models/Reminder.js';
import User from '../models/User.js';
import { logError } from '../utils/logger.js';
import { cleanupUser } from './cleanupUser.js';
import { isQuietNow } from './quietHours.js';

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

// Expo Push API
const sendPushNotification = async (pushTokens, text, soundId) => {
  const messages = pushTokens
    .filter(token => token && token.startsWith('ExponentPushToken'))
    .map(token => ({
      to: token,
      sound: 'default',
      title: 'Напоминание',
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

export const startScheduler = bot => {
  setInterval(async () => {
    try {
      if (process.env.NODE_ENV === 'production' && process.env.HEALTHCHECKS_URL) {
        https.get(process.env.HEALTHCHECKS_URL, r => r.resume()).on('error', () => { });
      }

      const now = new Date();

      const today = now.toISOString().slice(0, 10);
      if (lastCleanupDay !== today) {
        lastCleanupDay = today;
        const border = new Date(Date.now() - INACTIVE_DAYS * DAY_MS);

        const users = await User.find(
          { lastActivityAt: { $lt: border } },
          { telegramId: 1 }
        ).limit(100).catch(() => []);

        for (const u of users) {
          await cleanupUser(u.telegramId).catch(() => { });
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
            const byInterval = calcNextRun(now, r.intervalMinutes);

            if (!r.nextRunAt || r.nextRunAt < byInterval) {
              r.nextRunAt = byInterval;
              await r.save().catch(() => { });
            }

            continue;
          }

          if (sentThisTick.has(r.userId)) {
            continue;
          }

          let msg;
          try {
            const deleteAfterSeconds = getDeleteAfterSeconds(r);
            const footer = deleteAfterSeconds
              ? `\n\n<i>(автоудаление через ${deleteAfterSeconds} сек)</i>`
              : '';

            // Проверяем канал уведомлений
            const useApp = user?.notificationChannel === 'app' && user?.pushTokens?.length > 0;

            if (useApp) {
              // Отправка через Expo Push API
              await sendPushNotification(user.pushTokens, r.text, r.soundId);
            } else {
              // Отправка в Telegram
              msg = await bot.telegram.sendMessage(
                r.chatId,
                r.text + footer,
                { parse_mode: 'HTML' }
              );

              if (deleteAfterSeconds && msg) {
                setTimeout(() => {
                  bot.telegram.deleteMessage(r.chatId, msg.message_id).catch(() => { });
                }, deleteAfterSeconds * 1000);
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
          logError(e, {
            scope: 'scheduler:loop',
            reminderId: r?._id,
            userId: r?.userId
          });
        }
      }
    } catch (e) {
      logError(e, { scope: 'scheduler:tick' });
    }
  }, TICK_MS);
};
