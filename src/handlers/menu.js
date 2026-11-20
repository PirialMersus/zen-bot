import { Markup } from 'telegraf';
import { getTexts } from '../constants/texts.js';
import { mainKeyboard } from '../keyboard/main.js';
import { handleGetAuthCode } from './auth.js';
import { resolveUserLanguage } from '../middlewares/activity.js';
import User from '../models/User.js';
import { DEFAULT_TIMEZONE } from '../constants/timezones.js';
import { LOCALIZED_LANGUAGE_NAMES } from '../constants/languages.js';
import { suppressExpectedError } from '../utils/logger.js';

const getLocalizedQuietDisabledText = (language = 'ru') => {
  const quietDisabledTranslations = {
    ru: 'выключены',
    en: 'disabled',
    uk: 'вимкнені',
    es: 'desactivadas'
  };
  return quietDisabledTranslations[language] || quietDisabledTranslations.ru;
};

const formatQuietHoursSchedule = (quietHoursSettings, userLanguage = 'ru') => {
  if (!quietHoursSettings) {
    return '23:00–08:00';
  }
  if (quietHoursSettings.enabled === false) {
    return getLocalizedQuietDisabledText(userLanguage);
  }
  const startHourFormatted = String(quietHoursSettings.start ?? 23).padStart(2, '0');
  const startMinuteFormatted = String(quietHoursSettings.startMinute ?? 0).padStart(2, '0');
  const endHourFormatted = String(quietHoursSettings.end ?? 8).padStart(2, '0');
  const endMinuteFormatted = String(quietHoursSettings.endMinute ?? 0).padStart(2, '0');
  return `${startHourFormatted}:${startMinuteFormatted}–${endHourFormatted}:${endMinuteFormatted}`;
};

export const handleStart = async (ctx) => {
  ctx.session ??= {};
  ctx.session.reminderStep = null;
  ctx.session.creatingReminder = null;
  ctx.session.isSettingCustomQuietHours = null;
  ctx.session.isWaitingForSearchQuery = false;
  ctx.session.searchLanguage = null;
  ctx.session.lastFailedSearchQuery = null;
  ctx.session.pointerHistory = null;
  ctx.session.pointerHistoryIndex = null;
  ctx.session.favoriteHistory = null;
  ctx.session.favoriteHistoryIndex = null;

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
  let formattedQuietHoursSchedule = '23:00–08:00';

  if (telegramUserIdentifier) {
    const existingUserData = await User.findOne({ telegramId: telegramUserIdentifier })
      .lean()
      .catch(() => null);
    if (existingUserData?.timezone) {
      currentUserTimezone = existingUserData.timezone;
    }
    if (existingUserData?.quietHours) {
      formattedQuietHoursSchedule = formatQuietHoursSchedule(
        existingUserData.quietHours,
        userLanguage
      );
    }
  }

  const currentLanguageDisplayName =
    LOCALIZED_LANGUAGE_NAMES[userLanguage] || LOCALIZED_LANGUAGE_NAMES.ru;

  const timezoneOnboardingKeyboard = Markup.inlineKeyboard([
    [Markup.button.callback(texts.MENU.ONBOARDING_TIMEZONE_BUTTON, 'settings:timezone')],
    [Markup.button.callback(texts.MENU.ONBOARDING_LANGUAGE_BUTTON, 'settings:language')]
  ]);

  await ctx
    .reply(
      texts.MENU.ONBOARDING_TIMEZONE_PROMPT(
        currentUserTimezone,
        formattedQuietHoursSchedule,
        currentLanguageDisplayName
      ),
      {
        parse_mode: 'HTML',
        ...timezoneOnboardingKeyboard
      }
    )
    .catch(suppressExpectedError);
};

export const handleHelp = async (ctx) => {
  const userLanguage = await resolveUserLanguage(ctx);
  const texts = getTexts(userLanguage);
  await ctx.reply(texts.MENU.HELP, mainKeyboard(ctx, userLanguage));
};
