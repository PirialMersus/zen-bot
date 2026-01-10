// src/handlers/settings/quietHours.js
import User from '../../models/User.js';
import { settingsKeyboard } from '../../keyboard/settings.js';
import { TEXTS } from '../../constants/texts.js';

const renderSettings = async ctx => {
  const user = await User.findOne({ telegramId: ctx.from.id }) ?? {
    quietHours: { enabled: true, start: 23, end: 8 }
  };

  const q = user.quietHours;

  const text = `${TEXTS.MENU.SETTINGS}

🌙 Тихие часы: ${q.enabled ? 'включены' : 'выключены'}
⏰ ${q.start}:00–${q.end}:00`;

  if (ctx.callbackQuery) {
    await ctx.answerCbQuery();
    await ctx.deleteMessage();
  }

  await ctx.reply(text, settingsKeyboard(q.enabled));
};

export const handleSettings = async ctx => {
  await renderSettings(ctx);
};

export const handleQuietToggle = async ctx => {
  const user = await User.findOne({ telegramId: ctx.from.id });

  await User.findOneAndUpdate(
    { telegramId: ctx.from.id },
    { 'quietHours.enabled': !user.quietHours.enabled },
    { upsert: true }
  );

  await renderSettings(ctx);
};
