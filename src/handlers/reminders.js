import Reminder from '../models/Reminder.js';
import User from '../models/User.js';
import { getTexts } from '../constants/texts.js';
import { DEFAULT_TIMEZONE } from '../constants/timezones.js';
import { getRemindersKeyboard } from '../keyboard/reminders.js';
import { resolveUserLanguage } from '../middlewares/activity.js';
import { previewText } from '../utils/text.js';
import {
  formatInterval,
  formatNextRunTime,
  formatReminderMessageText,
  getReminderMessageKeyboard,
  buildRemindersListPayload
} from '../services/remindersFormat.js';

export {
  previewText,
  formatInterval,
  formatNextRunTime,
  formatReminderMessageText,
  getReminderMessageKeyboard,
  buildRemindersListPayload
};

export {
  REMINDER_STEP,
  renderReminderStep,
  handleCreateReminder,
  handleReminderPhoto,
  handleReminderVideo,
  handleReminderText,
  handleIntervalPreset,
  handleIntervalInput,
  handleDeleteAfterPreset,
  handleDeleteAfterInput,
  saveLastReminderText,
  finalizeReminder
} from './reminders/create.js';

export {
  handleReminderListCallback,
  handleViewReminder,
  handleRequestAction,
  handleConfirmAction
} from './reminders/actions.js';

export const handleReminders = async ctx => {
  ctx.session ??= {};
  ctx.session.reminderStep = null;
  ctx.session.creatingReminder = null;
  ctx.session.isSettingCustomQuietHours = null;
  const userLanguage = await resolveUserLanguage(ctx);
  const texts = getTexts(userLanguage);
  await ctx.reply(texts.MENU.REMINDERS, getRemindersKeyboard(userLanguage));
};

export const handleMyReminders = async ctx => {
  const userLanguage = await resolveUserLanguage(ctx);
  const texts = getTexts(userLanguage);

  const [reminders, user] = await Promise.all([
    Reminder.find({ userId: ctx.from.id }).sort({ createdAt: 1 }),
    User.findOne({ telegramId: ctx.from.id })
  ]);

  if (!reminders.length) {
    await ctx.reply(texts.REMINDERS.NONE, getRemindersKeyboard(userLanguage));
    return;
  }

  const userTimezone = user?.timezone || DEFAULT_TIMEZONE;

  if (reminders.length === 1) {
    const singleReminder = reminders[0];
    await ctx.reply(
      formatReminderMessageText(singleReminder, '1', userLanguage, userTimezone),
      {
        parse_mode: 'HTML',
        ...getReminderMessageKeyboard(singleReminder, userLanguage, false)
      }
    );
    return;
  }

  const { text, keyboard } = buildRemindersListPayload(reminders, userLanguage, userTimezone);

  await ctx.reply(text, {
    parse_mode: 'HTML',
    ...keyboard
  });
};
