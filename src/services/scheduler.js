// src/services/scheduler.js
import https from 'https';
import Reminder from '../models/Reminder.js';
import User from '../models/User.js';
import { isQuietNow } from './quietHours.js';
import { logError } from '../utils/logger.js';
import { cleanupUser } from './cleanupUser.js';

const TICK_MS = 60 * 1000;
const CREATOR_ID = Number(process.env.CREATOR_ID);
const NOTIFICATIONS_PAUSED = false;
const IS_DEV = process.env.NODE_ENV === 'development';

const INACTIVE_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

const getDeleteAfterSeconds = reminder => {
  if (IS_DEV && Number(reminder.userId) === CREATOR_ID) return 60;
  return reminder.deleteAfterSeconds ?? null;
};

const toUserDate = (date, timezone) =>
  timezone
    ? new Date(date.toLocaleString('en-US', { timeZone: timezone }))
    : date;

let lastCleanupDay = null;

export const startScheduler = bot => {
  setInterval(async () => {
    try {
      if (process.env.NODE_ENV === 'production' && process.env.HEALTHCHECKS_URL) {
        https.get(process.env.HEALTHCHECKS_URL, r => r.resume()).on('error', () => {});
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
          await cleanupUser(u.telegramId).catch(() => {});
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
          if (NOTIFICATIONS_PAUSED && Number(r.userId) !== CREATOR_ID) continue;

          let user = usersCache.get(r.userId);
          if (!user) {
            user = await User.findOne({ telegramId: Number(r.userId) }).catch(() => null);
            usersCache.set(r.userId, user);
          }

          if (isQuietNow(user, now)) {
            const byInterval = new Date(
              now.getTime() + r.intervalMinutes * 60 * 1000
            );

            if (!r.nextRunAt || r.nextRunAt < byInterval) {
              r.nextRunAt = byInterval;
              await r.save().catch(() => {});
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
              ? `\n\n(автоудаление через ${deleteAfterSeconds} сек)`
              : '';

            msg = await bot.telegram.sendMessage(r.chatId, r.text + footer);

            if (deleteAfterSeconds) {
              setTimeout(() => {
                bot.telegram.deleteMessage(r.chatId, msg.message_id).catch(() => {});
              }, deleteAfterSeconds * 1000);
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
              await cleanupUser(r.userId).catch(() => {});
            }

            if (code === 400) {
              r.isActive = false;
              await r.save().catch(() => {});
            }

            continue;
          }

          sentThisTick.add(r.userId);
          r.lastSentAt = now;
          r.nextRunAt = new Date(now.getTime() + r.intervalMinutes * 60 * 1000);
          await r.save().catch(() => {});
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
