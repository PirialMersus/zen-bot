import User from '../../models/User.js';
import { getTexts } from '../../constants/texts.js';
import { getTimezoneRegionsKeyboard } from '../../keyboard/timezoneRegions.js';
import { timezoneCitiesKeyboard } from '../../keyboard/timezoneCities.js';
import { resolveUserLanguage } from '../../middlewares/activity.js';
import { renderSettings } from './general.js';

export const handleTimezoneMenu = async ctx => {
  const userLanguage = await resolveUserLanguage(ctx);
  const texts = getTexts(userLanguage);
  await ctx.answerCbQuery().catch(() => {});
  await ctx.deleteMessage().catch(() => {});

  await ctx.reply(texts.SETTINGS.TIMEZONE_REGION_PROMPT, getTimezoneRegionsKeyboard(userLanguage));
};

export const handleTimezoneRegion = async ctx => {
  const userLanguage = await resolveUserLanguage(ctx);
  const texts = getTexts(userLanguage);
  const regionKey = ctx.callbackQuery.data.split(':').pop();

  await ctx.answerCbQuery().catch(() => {});
  await ctx.deleteMessage().catch(() => {});

  await ctx.reply(texts.SETTINGS.TIMEZONE_CITY_PROMPT(regionKey), timezoneCitiesKeyboard(regionKey, userLanguage));
};

export const handleTimezoneSet = async ctx => {
  const userLanguage = await resolveUserLanguage(ctx);
  const texts = getTexts(userLanguage);
  const timezoneValue = ctx.callbackQuery.data.split(':').pop();

  await User.findOneAndUpdate(
    { telegramId: ctx.from.id },
    { timezone: timezoneValue },
    { upsert: true }
  );

  const confirmationText = texts.SETTINGS.TIMEZONE_SET(timezoneValue);

  await renderSettings(ctx, confirmationText);
};
