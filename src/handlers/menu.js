import { Markup } from 'telegraf';
import { getTexts } from '../constants/texts.js';
import { mainKeyboard } from '../keyboard/main.js';
import { handleGetAuthCode } from './auth.js';
import { resolveUserLanguage } from '../middlewares/activity.js';
import User from '../models/User.js';
import { DEFAULT_TIMEZONE } from '../constants/timezones.js';

export const handleStart = async ctx => {
  ctx.session ??= {};
  ctx.session.reminderStep = null;
  ctx.session.creatingReminder = null;
  ctx.session.isSettingCustomQuietHours = null;

  const startPayload = ctx.startPayload;

  if (startPayload === 'getcode') {
    await handleGetAuthCode(ctx);
    return;
  }

  const userLanguage = await resolveUserLanguage(ctx);
  const texts = getTexts(userLanguage);

  await ctx.reply(texts.MENU.START, mainKeyboard(ctx, userLanguage));

  const telegramUserIdentifier = ctx.from?.id;
  let currentUserTimezone = DEFAULT_TIMEZONE;

  if (telegramUserIdentifier) {
    const existingUserData = await User.findOne({ telegramId: telegramUserIdentifier }).lean().catch(() => null);
    if (existingUserData?.timezone) {
      currentUserTimezone = existingUserData.timezone;
    }
  }

  const timezoneOnboardingKeyboard = Markup.inlineKeyboard([
    [Markup.button.callback(texts.MENU.ONBOARDING_TIMEZONE_BUTTON, 'settings:timezone')]
  ]);

  await ctx.reply(
    texts.MENU.ONBOARDING_TIMEZONE_PROMPT(currentUserTimezone),
    {
      parse_mode: 'HTML',
      ...timezoneOnboardingKeyboard
    }
  ).catch(() => {});
};

export const handleHelp = async ctx => {
  const userLanguage = await resolveUserLanguage(ctx);
  const texts = getTexts(userLanguage);
  await ctx.reply(texts.MENU.HELP, mainKeyboard(ctx, userLanguage));
};
