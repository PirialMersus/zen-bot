// src/services/scheduler.js
import https from 'https';
import Reminder from '../models/Reminder.js';
import User from '../models/User.js';
import { isQuietNow } from './quietHours.js';
import { logError } from '../utils/logger.js';

const TICK_MS = 60 * 1000;
const CREATOR_ID = Number(process.env.CREATOR_ID);
const NOTIFICATIONS_PAUSED = false;
const IS_DEV = process.env.NODE_ENV === 'development';

// 🧠 вычисляем автоудаление
const getDeleteAfterSeconds = reminder => {
  // в dev — только админу и 60 секунд
  if (IS_DEV) {
    if (Number(reminder.userId) === CREATOR_ID) {
      return 60;
    }
    return null;
  }

  // в prod — как задано в reminder
  return reminder.deleteAfterSeconds ?? null;
};

export const startScheduler = bot => {
  setInterval(async () => {
    try {
      // healthcheck
      if (process.env.NODE_ENV === 'production' && process.env.HEALTHCHECKS_URL) {
        https
          .get(process.env.HEALTHCHECKS_URL, res => res.resume())
          .on('error', () => {});
      }

      const now = new Date();

      let reminders = [];
      try {
        reminders = await Reminder.find({ isActive: true });
      } catch (e) {
        logError(e, { scope: 'Reminder.find' });
        return;
      }

      if (!reminders.length) return;

      for (const r of reminders) {
        try {
          if (!r.text || !r.intervalMinutes) continue;

          if (NOTIFICATIONS_PAUSED && Number(r.userId) !== CREATOR_ID) {
            continue;
          }

          if (r.lastSentAt) {
            const diff = now - new Date(r.lastSentAt);
            if (diff < r.intervalMinutes * 60 * 1000) continue;
          }

          let user = null;
          try {
            user = await User.findOne({ telegramId: Number(r.userId) });
          } catch (e) {
            logError(e, {
              scope: 'User.findOne',
              userId: r.userId
            });
          }

          if (isQuietNow(user?.quietHours, now)) continue;

          const deleteAfterSeconds = getDeleteAfterSeconds(r);

          const footer = deleteAfterSeconds
            ? `\n\n(автоудаление через ${deleteAfterSeconds} сек)`
            : '';

          let msg;

          try {
            msg = await bot.telegram.sendMessage(
              r.chatId,
              r.text + footer
            );
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
              await Reminder.deleteMany({ userId: r.userId }).catch(err =>
                logError(err, { scope: 'Reminder.deleteMany', userId: r.userId })
              );

              await User.deleteOne({ telegramId: Number(r.userId) }).catch(err =>
                logError(err, { scope: 'User.deleteOne', userId: r.userId })
              );
            }

            continue;
          }

          if (deleteAfterSeconds) {
            setTimeout(() => {
              bot.telegram
                .deleteMessage(r.chatId, msg.message_id)
                .catch(err =>
                  logError(err, {
                    scope: 'deleteMessage',
                    chatId: r.chatId,
                    messageId: msg.message_id
                  })
                );
            }, deleteAfterSeconds * 1000);
          }

          r.lastSentAt = now;
          await r.save().catch(err =>
            logError(err, {
              scope: 'Reminder.save',
              reminderId: r._id
            })
          );
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
