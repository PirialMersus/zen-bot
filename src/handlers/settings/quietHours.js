import User from '../../models/User.js';
import Reminder from '../../models/Reminder.js';
import { BUTTONS } from '../../constants/buttons.js';
import { UI } from '../../constants/ui.js';
import { getTexts } from '../../constants/texts.js';
import { getQuietEndDate } from '../../services/quietHours.js';
import { quietHoursKeyboard } from '../../keyboard/quietHours.js';
import { resolveUserLanguage } from '../../middlewares/activity.js';
import { renderSettings, handleSettings } from './general.js';
import { handleTimezoneMenu, handleTimezoneRegion, handleTimezoneSet } from './timezone.js';
import { handleLanguageMenu, handleLanguageSet } from './language.js';

export {
  renderSettings,
  handleSettings,
  handleTimezoneMenu,
  handleTimezoneRegion,
  handleTimezoneSet,
  handleLanguageMenu,
  handleLanguageSet
};

export const handleQuietHoursMenu = async ctx => {
  const userLanguage = await resolveUserLanguage(ctx);
  const texts = getTexts(userLanguage);
  await ctx.answerCbQuery().catch(() => {});
  await ctx.deleteMessage().catch(() => {});

  await ctx.reply(texts.SETTINGS.QUIET_MENU_PROMPT, {
    parse_mode: 'HTML',
    ...quietHoursKeyboard(userLanguage)
  });
};

export const handleQuietHoursSetPreset = async ctx => {
  const userLanguage = await resolveUserLanguage(ctx);
  const texts = getTexts(userLanguage);
  const callbackSegments = ctx.callbackQuery.data.split(':');
  const startHour = Number(callbackSegments[callbackSegments.length - 2]);
  const endHour = Number(callbackSegments[callbackSegments.length - 1]);

  await User.findOneAndUpdate(
    { telegramId: ctx.from.id },
    {
      'quietHours.start': startHour,
      'quietHours.end': endHour
    },
    { upsert: true }
  );

  const confirmationText = texts.SETTINGS.QUIET_SET_PRESET(startHour, endHour);

  await renderSettings(ctx, confirmationText);
};

export const handleQuietHoursCustomPrompt = async ctx => {
  const userLanguage = await resolveUserLanguage(ctx);
  const texts = getTexts(userLanguage);
  await ctx.answerCbQuery().catch(() => {});
  await ctx.deleteMessage().catch(() => {});

  ctx.session ??= {};
  ctx.session.isSettingCustomQuietHours = true;

  await ctx.reply(texts.SETTINGS.QUIET_CUSTOM_PROMPT, { parse_mode: 'HTML' });
};

const collectAllButtonValues = buttonObject =>
  Object.values(buttonObject).flatMap(item => (typeof item === 'object' && item !== null ? Object.values(item) : [item]));

const allKnownNavigationButtons = [
  ...collectAllButtonValues(BUTTONS),
  ...collectAllButtonValues(UI)
];

export const handleQuietHoursCustomInput = async ctx => {
  if (!ctx.session?.isSettingCustomQuietHours) return false;

  const rawInputText = ctx.message?.text?.trim() || '';
  if (rawInputText.startsWith('/') || allKnownNavigationButtons.includes(rawInputText)) {
    ctx.session.isSettingCustomQuietHours = null;
    return false;
  }

  const parsedTimeMatch = rawInputText.match(/^(\d{1,2})(?::00)?\s*[-–—]\s*(\d{1,2})(?::00)?$/);

  const userLanguage = await resolveUserLanguage(ctx);
  const texts = getTexts(userLanguage);

  if (!parsedTimeMatch) {
    await ctx.reply(texts.SETTINGS.QUIET_CUSTOM_ERROR, { parse_mode: 'HTML' });
    return true;
  }

  const startHour = Number(parsedTimeMatch[1]);
  const endHour = Number(parsedTimeMatch[2]);

  if (startHour < 0 || startHour > 23 || endHour < 0 || endHour > 23 || startHour === endHour) {
    await ctx.reply(texts.SETTINGS.QUIET_RANGE_ERROR, { parse_mode: 'HTML' });
    return true;
  }

  ctx.session.isSettingCustomQuietHours = null;

  await User.findOneAndUpdate(
    { telegramId: ctx.from.id },
    {
      'quietHours.start': startHour,
      'quietHours.end': endHour
    },
    { upsert: true }
  );

  const confirmationText = texts.SETTINGS.QUIET_CUSTOM_SUCCESS(startHour, endHour);

  await renderSettings(ctx, confirmationText);
  return true;
};

export const handleQuietToggle = async ctx => {
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
