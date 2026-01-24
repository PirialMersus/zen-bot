// src/handlers/admin.js
import Activity from '../models/Activity.js';

export const handleAdminUsers30d = async ctx => {
  if (String(ctx.from.id) !== process.env.CREATOR_ID) return;

  const users = await Activity.distinct('telegramId');

  await ctx.reply(`👥 Активных пользователей за 30 дней: ${users.length}`);
};
