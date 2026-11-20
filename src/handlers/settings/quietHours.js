import User from '../../models/User.js';
import Reminder from '../../models/Reminder.js';
import { getTexts } from '../../constants/texts.js';
import { getQuietEndDate } from '../../services/quietHours.js';
import { quietHoursKeyboard } from '../../keyboard/quietHours.js';
import { resolveUserLanguage } from '../../middlewares/activity.js';
import { allKnownNavigationButtons } from '../../utils/navigation.js';
import { renderSettings, handleSettings } from './general.js';
import { handleTimezoneMenu, handleTimezoneRegion, handleTimezoneSet } from './timezone.js';
import { handleLanguageMenu, handleLanguageSet } from './language.js';
import { suppressExpectedError } from '../../utils/logger.js';

export {
  renderSettings,
  handleSettings,
  handleTimezoneMenu,
  handleTimezoneRegion,
  handleTimezoneSet,
  handleLanguageMenu,
  handleLanguageSet
};

export const handleQuietHoursMenu = async (ctx) => {
  const userLanguage = await resolveUserLanguage(ctx);
  const texts = getTexts(userLanguage);
  await ctx.answerCbQuery().catch(suppressExpectedError);
  await ctx.deleteMessage().catch(suppressExpectedError);

  await ctx.reply(texts.SETTINGS.QUIET_MENU_PROMPT, {
    parse_mode: 'HTML',
    ...quietHoursKeyboard(userLanguage)
  });
};

export const handleQuietHoursSetPreset = async (ctx) => {
  const userLanguage = await resolveUserLanguage(ctx);
  const texts = getTexts(userLanguage);
  const callbackSegments = ctx.callbackQuery.data.split(':');
  const startHour = Number(callbackSegments[callbackSegments.length - 2]);
  const endHour = Number(callbackSegments[callbackSegments.length - 1]);

  await User.findOneAndUpdate(
    { telegramId: ctx.from.id },
    {
      'quietHours.start': startHour,
      'quietHours.startMinute': 0,
      'quietHours.end': endHour,
      'quietHours.endMinute': 0
    },
    { upsert: true }
  );

  const confirmationText = texts.SETTINGS.QUIET_SET_PRESET(startHour, endHour);

  await renderSettings(ctx, confirmationText);
};

export const handleQuietHoursCustomPrompt = async (ctx) => {
  const userLanguage = await resolveUserLanguage(ctx);
  const texts = getTexts(userLanguage);
  await ctx.answerCbQuery().catch(suppressExpectedError);
  await ctx.deleteMessage().catch(suppressExpectedError);

  ctx.session ??= {};
  ctx.session.isSettingCustomQuietHours = true;

  await ctx.reply(texts.SETTINGS.QUIET_CUSTOM_PROMPT, { parse_mode: 'HTML' });
};

export const handleQuietHoursCustomInput = async (ctx) => {
  if (!ctx.session?.isSettingCustomQuietHours) return false;

  const rawInputText = ctx.message?.text?.trim() || '';
  if (rawInputText.startsWith('/') || allKnownNavigationButtons.includes(rawInputText)) {
    ctx.session.isSettingCustomQuietHours = null;
    return false;
  }

  const parsedTimeMatch = rawInputText.match(
    /^(\d{1,2})(?::(\d{1,2}))?\s*[-–—]\s*(\d{1,2})(?::(\d{1,2}))?$/
  );

  const userLanguage = await resolveUserLanguage(ctx);
  const texts = getTexts(userLanguage);

  if (!parsedTimeMatch) {
    await ctx.reply(texts.SETTINGS.QUIET_CUSTOM_ERROR, { parse_mode: 'HTML' });
    return true;
  }

  const startHour = Number(parsedTimeMatch[1]);
  const startMinute = parsedTimeMatch[2] !== undefined ? Number(parsedTimeMatch[2]) : 0;
  const endHour = Number(parsedTimeMatch[3]);
  const endMinute = parsedTimeMatch[4] !== undefined ? Number(parsedTimeMatch[4]) : 0;

  const isInvalidTimeRange =
    startHour < 0 ||
    startHour > 23 ||
    endHour < 0 ||
    endHour > 23 ||
    startMinute < 0 ||
    startMinute > 59 ||
    endMinute < 0 ||
    endMinute > 59 ||
    (startHour === endHour && startMinute === endMinute);

  if (isInvalidTimeRange) {
    await ctx.reply(texts.SETTINGS.QUIET_RANGE_ERROR, { parse_mode: 'HTML' });
    return true;
  }

  ctx.session.isSettingCustomQuietHours = null;

  await User.findOneAndUpdate(
    { telegramId: ctx.from.id },
    {
      'quietHours.start': startHour,
      'quietHours.startMinute': startMinute,
      'quietHours.end': endHour,
      'quietHours.endMinute': endMinute
    },
    { upsert: true }
  );

  const confirmationText = texts.SETTINGS.QUIET_CUSTOM_SUCCESS(
    startHour,
    endHour,
    startMinute,
    endMinute
  );

  await renderSettings(ctx, confirmationText);
  return true;
};

export const handleQuietToggle = async (ctx) => {
  const user = await User.findOne({ telegramId: ctx.from.id });
  const nextQuietState = !user?.quietHours?.enabled;

  await User.findOneAndUpdate(
    { telegramId: ctx.from.id },
    { 'quietHours.enabled': nextQuietState },
    { upsert: true }
  );

  if (!nextQuietState && user) {
    const currentMoment = new Date();
    const previousQuietUser = {
      ...user.toObject(),
      quietHours: {
        ...user.quietHours,
        enabled: true
      }
    };
    const quietEndDate = getQuietEndDate(previousQuietUser, currentMoment);

    if (quietEndDate > currentMoment) {
      await Reminder.updateMany(
        {
          userId: ctx.from.id,
          isActive: true,
          nextRunAt: { $gt: currentMoment, $lte: quietEndDate }
        },
        {
          $set: { nextRunAt: currentMoment }
        }
      );
    }
  }

  await renderSettings(ctx);
};
