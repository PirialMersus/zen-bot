// src/middlewares/activity.js
import Activity from '../models/Activity.js';
import User from '../models/User.js';

export const activityMiddleware = async (ctx, next) => {
  const telegramId =
    ctx.from?.id ||
    ctx.callbackQuery?.from?.id ||
    ctx.message?.from?.id;

  if (!telegramId) return next();

  const now = new Date();

  await User.updateOne(
    { telegramId },
    {
      $set: {
        lastActivityAt: now,
        lastSeenAt: now
      }
    },
    { upsert: true }
  ).catch(() => {});

  await Activity.create({
    telegramId,
    type: ctx.callbackQuery ? 'callback' : 'message'
  }).catch(() => {});

  return next();
};

