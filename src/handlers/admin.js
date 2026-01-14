// src/handlers/admin.js
import Reminder from '../models/Reminder.js';

export const handleAdminUsers30d = async ctx => {
  if (String(ctx.from.id) !== process.env.CREATOR_ID) return;

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const users = await Reminder.distinct('userId', {
    createdAt: { $gte: since }
  });

  await ctx.reply(`👥 Активных пользователей за 30 дней: ${users.length}`);
};
