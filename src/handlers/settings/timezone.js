import User from '../../models/User.js';
import { getTimezoneRegionsKeyboard } from '../../keyboard/timezoneRegions.js';
import { timezoneCitiesKeyboard } from '../../keyboard/timezoneCities.js';
import { resolveUserLanguage } from '../../middlewares/activity.js';
import { renderSettings } from './general.js';

export const handleTimezoneMenu = async ctx => {
  const userLanguage = await resolveUserLanguage(ctx);
  await ctx.answerCbQuery().catch(() => {});
  await ctx.deleteMessage().catch(() => {});

  const promptText = userLanguage === 'en'
    ? '🌍 Select region:'
    : (userLanguage === 'uk' ? '🌍 Оберіть регіон:' : (userLanguage === 'es' ? '🌍 Selecciona región:' : '🌍 Выберите регион:'));

  await ctx.reply(promptText, getTimezoneRegionsKeyboard(userLanguage));
};

export const handleTimezoneRegion = async ctx => {
  const userLanguage = await resolveUserLanguage(ctx);
  const regionKey = ctx.callbackQuery.data.split(':').pop();

  await ctx.answerCbQuery().catch(() => {});
  await ctx.deleteMessage().catch(() => {});

  const promptText = userLanguage === 'en'
    ? '🌍 Select city:'
    : (userLanguage === 'uk' ? '🌍 Оберіть місто:' : (userLanguage === 'es' ? '🌍 Selecciona ciudad:' : '🌍 Выберите город:'));

  await ctx.reply(promptText, timezoneCitiesKeyboard(regionKey, userLanguage));
};

export const handleTimezoneSet = async ctx => {
  const userLanguage = await resolveUserLanguage(ctx);
  const timezoneValue = ctx.callbackQuery.data.split(':').pop();

  await User.findOneAndUpdate(
    { telegramId: ctx.from.id },
    { timezone: timezoneValue },
    { upsert: true }
  );

  const confirmationText = userLanguage === 'en'
    ? `✅ Timezone set:\n🌍 ${timezoneValue}`
    : (userLanguage === 'uk'
      ? `✅ Часовий пояс встановлено:\n🌍 ${timezoneValue}`
      : (userLanguage === 'es'
        ? `✅ Zona horaria establecida:\n🌍 ${timezoneValue}`
        : `✅ Часовой пояс установлен:\n🌍 ${timezoneValue}`));

  await renderSettings(ctx, confirmationText);
};
