import { Markup } from 'telegraf';
import { calculateDailyNextRun, calcNextRun } from '../../services/scheduler.js';
import Reminder from '../../models/Reminder.js';
import User from '../../models/User.js';
import { getTexts } from '../../constants/texts.js';
import { DEFAULT_TIMEZONE } from '../../constants/timezones.js';
import { resolveUserLanguage } from '../../middlewares/activity.js';
import {
  formatReminderMessageText,
  getReminderMessageKeyboard,
  buildRemindersListPayload
} from '../../services/remindersFormat.js';

export const handleReminderListCallback = async ctx => {
  const userLanguage = await resolveUserLanguage(ctx);
  const texts = getTexts(userLanguage);

  await ctx.answerCbQuery().catch(() => {});

  const [reminders, user] = await Promise.all([
    Reminder.find({ userId: ctx.from.id }).sort({ createdAt: 1 }),
    User.findOne({ telegramId: ctx.from.id })
  ]);

  if (!reminders.length) {
    await ctx.editMessageText(texts.REMINDERS.NONE).catch(async () => {
      await ctx.reply(texts.REMINDERS.NONE).catch(() => {});
    });
    return;
  }

  const userTimezone = user?.timezone || DEFAULT_TIMEZONE;
  const { text, keyboard } = buildRemindersListPayload(reminders, userLanguage, userTimezone);

  await ctx.editMessageText(text, {
    parse_mode: 'HTML',
    ...keyboard
  }).catch(async () => {
    await ctx.reply(text, {
      parse_mode: 'HTML',
      ...keyboard
    }).catch(() => {});
  });
};

export const handleViewReminder = async ctx => {
  const userLanguage = await resolveUserLanguage(ctx);
  const texts = getTexts(userLanguage);
  const reminderId = ctx.callbackQuery.data.replace('reminder:view:', '');

  const [reminderItem, allUserReminders, user] = await Promise.all([
    Reminder.findOne({ _id: reminderId, userId: ctx.from.id }),
    Reminder.find({ userId: ctx.from.id }).sort({ createdAt: 1 }),
    User.findOne({ telegramId: ctx.from.id })
  ]);

  if (!reminderItem) {
    await ctx.answerCbQuery(texts.REMINDERS.NOT_FOUND).catch(() => {});
    return handleReminderListCallback(ctx);
  }

  await ctx.answerCbQuery().catch(() => {});

  const indexNumber = allUserReminders.findIndex(item => String(item._id) === String(reminderItem._id)) + 1;
  const userTimezone = user?.timezone || DEFAULT_TIMEZONE;

  await ctx.editMessageText(
    formatReminderMessageText(reminderItem, indexNumber > 0 ? String(indexNumber) : '1', userLanguage, userTimezone),
    {
      parse_mode: 'HTML',
      ...getReminderMessageKeyboard(reminderItem, userLanguage, true)
    }
  ).catch(() => {});
};

export const handleRequestAction = async (ctx, type) => {
  const userLanguage = await resolveUserLanguage(ctx);
  const texts = getTexts(userLanguage);
  const reminderIdentifier = ctx.callbackQuery.data.split(':')[1];

  const [reminderItem, user] = await Promise.all([
    Reminder.findOne({ _id: reminderIdentifier, userId: ctx.from.id }),
    User.findOne({ telegramId: ctx.from.id })
  ]);

  if (!reminderItem) return ctx.answerCbQuery(texts.REMINDERS.NOT_FOUND).catch(() => {});

  if (type === 'pause' || type === 'resume') {
    const userTimezone = user?.timezone || DEFAULT_TIMEZONE;
    const now = new Date();

    if (type === 'pause') {
      reminderItem.isActive = false;
    } else {
      reminderItem.isActive = true;
      if (reminderItem.type === 'daily' && reminderItem.targetTime) {
        reminderItem.nextRunAt = calculateDailyNextRun(reminderItem.targetTime, userTimezone, now);
      } else {
        reminderItem.nextRunAt = calcNextRun(now, reminderItem.intervalMinutes);
      }
    }

    await reminderItem.save();

    const allUserReminders = await Reminder.find({ userId: ctx.from.id }).sort({ createdAt: 1 });
    const indexNumber = allUserReminders.findIndex(item => String(item._id) === String(reminderItem._id)) + 1;

    await ctx.editMessageText(
      formatReminderMessageText(reminderItem, indexNumber > 0 ? String(indexNumber) : '1', userLanguage, userTimezone),
      {
        parse_mode: 'HTML',
        ...getReminderMessageKeyboard(reminderItem, userLanguage, true)
      }
    ).catch(() => {});

    return ctx.answerCbQuery(texts.REMINDERS.STATUS_UPDATED).catch(() => {});
  }

  if (type === 'delete') {
    await ctx.editMessageReplyMarkup(
      Markup.inlineKeyboard([
        [
          Markup.button.callback(texts.REMINDERS.CONFIRM_DELETE_BUTTON, `confirm:delete:${reminderIdentifier}`),
          Markup.button.callback(texts.REMINDERS.CANCEL_DELETE_BUTTON, `confirm:cancel:${reminderIdentifier}`)
        ]
      ]).reply_markup
    ).catch(() => {});

    return ctx.answerCbQuery().catch(() => {});
  }
};

export const handleConfirmAction = async ctx => {
  const callbackDataString = ctx.callbackQuery.data;

  if (callbackDataString === 'confirm:no') {
    await ctx.answerCbQuery().catch(() => {});
    await ctx.deleteMessage().catch(() => {});
    return;
  }

  const [, actionType, reminderIdentifier] = callbackDataString.split(':');
  const userLanguage = await resolveUserLanguage(ctx);
  const texts = getTexts(userLanguage);

  if (actionType === 'cancel') {
    await ctx.answerCbQuery().catch(() => {});
    const reminderItem = await Reminder.findOne({ _id: reminderIdentifier, userId: ctx.from.id });

    if (reminderItem) {
      await ctx.editMessageReplyMarkup(
        getReminderMessageKeyboard(reminderItem, userLanguage, true).reply_markup
      ).catch(() => {});
    }
    return;
  }

  if (actionType === 'delete') {
    await Reminder.findOneAndDelete({ _id: reminderIdentifier, userId: ctx.from.id });
    await ctx.answerCbQuery(texts.REMINDERS.DELETED).catch(() => {});
    return handleReminderListCallback(ctx);
  }
};
