// src/handlers/settings/quietHours.js
import User from '../../models/User.js';
import { settingsKeyboard } from '../../keyboard/settings.js';
import { TEXTS } from '../../constants/texts.js';
import { timezoneRegionsKeyboard } from '../../keyboard/timezoneRegions.js';
import { timezoneCitiesKeyboard } from '../../keyboard/timezoneCities.js';

export const handleTimezoneMenu = async ctx => {
  await ctx.answerCbQuery();
  await ctx.deleteMessage();

  await ctx.reply(
    '🌍 Выберите регион:',
    timezoneRegionsKeyboard
  );
};

export const handleTimezoneRegion = async ctx => {
  const regionKey = ctx.callbackQuery.data.split(':').pop();

  await ctx.answerCbQuery();
  await ctx.deleteMessage();

  await ctx.reply(
    '🌍 Выберите город:',
    timezoneCitiesKeyboard(regionKey)
  );
};

export const handleTimezoneSet = async ctx => {
  const tz = ctx.callbackQuery.data.split(':').pop();

  await User.findOneAndUpdate(
    { telegramId: ctx.from.id },
    { timezone: tz },
    { upsert: true }
  );

  await ctx.answerCbQuery();

  try {
    await ctx.deleteMessage();
  } catch {}

  await ctx.reply(
    `✅ Часовой пояс установлен:\n🌍 ${tz}`
  );
};

const renderSettings = async ctx => {
  const user = await User.findOne({ telegramId: ctx.from.id }) ?? {
    quietHours: { enabled: true, start: 23, end: 8 },
    timezone: 'Europe/Minsk'
  };

  const q = user.quietHours;
  const tz = user.timezone || 'Europe/Minsk';

  const text = `${TEXTS.MENU.SETTINGS}

🌙 Тихие часы: ${q.enabled ? 'включены' : 'выключены'}
⏰ ${q.start}:00–${q.end}:00

🌍 Часовой пояс:
${tz}`;

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
