// src/services/scheduler.js
import https from 'https';
import Reminder from '../models/Reminder.js';
import User from '../models/User.js';
import { isQuietNow } from './quietHours.js';

const TICK_MS = 60 * 1000;

export const startScheduler = bot => {
  setInterval(async () => {
    if (process.env.NODE_ENV === 'production' && process.env.HEALTHCHECKS_URL) {
      https.get(process.env.HEALTHCHECKS_URL, res => {
        res.resume();
      }).on('error', () => {});
    }

    const now = new Date();

    const reminders = await Reminder.find({ isActive: true });

    for (const r of reminders) {
      if (r.lastSentAt) {
        const diff = now - new Date(r.lastSentAt);
        if (diff < r.intervalMinutes * 60 * 1000) continue;
      }

      const user = await User.findOne({ telegramId: Number(r.userId) });
      if (isQuietNow(user?.quietHours, now)) continue;

      const footer = r.deleteAfterSeconds
        ? `\n\n_(автоудаление через ${r.deleteAfterSeconds} сек)_`
        : '';

      const msg = await bot.telegram.sendMessage(
        r.chatId,
        r.text + footer,
        { parse_mode: 'Markdown' }
      );

      if (r.deleteAfterSeconds) {
        setTimeout(() => {
          bot.telegram.deleteMessage(r.chatId, msg.message_id).catch(() => {});
        }, r.deleteAfterSeconds * 1000);
      }

      r.lastSentAt = now;
      await r.save();
    }
  }, TICK_MS);
};
