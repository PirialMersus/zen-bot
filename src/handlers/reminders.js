// src/handlers/reminders.js
import { Markup } from 'telegraf';
import { remindersKeyboard } from '../keyboard/reminders.js';
import { intervalKeyboard } from '../keyboard/intervals.js';
import { reminderTextKeyboard } from '../keyboard/reminderText.js';
import { mainKeyboard } from '../keyboard/main.js';
import Reminder from '../models/Reminder.js';
import User from '../models/User.js';
import {TEXTS} from "../constants/texts.js";
import {UI} from "../constants/ui.js";

const DEFAULT_REMINDER_TEXTS = [
  'Не вовлекайся 🧘',
  'В этом теле никого нет 🤯'
];

const formatInterval = minutes => {
  if (minutes === 1440) return 'Раз в день';
  if (minutes === 60) return 'Каждый час';
  return `Каждые ${minutes} мин`;
};

const previewText = text => {
  if (!text) return '';
  return text.length > 40 ? `${text.slice(0, 40)}…` : text;
};

export const handleReminders = async ctx => {
  await ctx.reply(TEXTS.MENU.REMINDERS, remindersKeyboard);
};

export const handleCreateReminder = async ctx => {
  ctx.session ??= {};
  ctx.session.creatingReminder = {
    fromPointer: false
  };
  ctx.session.waitingCustomInterval = false;


  const user = await User.findOne({ telegramId: ctx.from.id });

  const texts = user?.lastReminderTexts?.length
    ? user.lastReminderTexts
    : DEFAULT_REMINDER_TEXTS;

  const subtitle = user?.lastReminderTexts?.length
    ? '✍️ Введите текст сообщения или выберите из последних'
    : '✍️ Введите текст сообщения или выберите из предложенных';

  await ctx.reply(
    `${TEXTS.REMINDERS.ASK_TEXT}\n\n${subtitle}`,
    reminderTextKeyboard(texts)
  );
};

export const handleReminderText = async ctx => {
  if (!ctx.session?.creatingReminder) return;

  const text = ctx.message.text;

  if (text === '✍️ Ввести новый текст') {
    await ctx.reply(
      '✍️ Введите новый текст напоминания',
      Markup.removeKeyboard()
    );
    return;
  }

  ctx.session.creatingReminder.text = text;

  const preview = previewText(text);

  await ctx.reply(
    `${TEXTS.REMINDERS.ASK_INTERVAL}\n\n«${preview}»`,
    intervalKeyboard
  );
};

export const handleIntervalPreset = async (ctx, minutes) => {
  if (!ctx.session?.creatingReminder) return;

  ctx.session.creatingReminder.intervalMinutes = minutes;

  await finalizeReminder(ctx);
};

export const handleCustomIntervalRequest = async ctx => {
  if (!ctx.session?.creatingReminder) return;

  ctx.session.waitingCustomInterval = true;

  await ctx.reply(TEXTS.REMINDERS.ASK_CUSTOM_INTERVAL, Markup.removeKeyboard());
};

export const handleCustomIntervalInput = async ctx => {
  if (!ctx.session?.waitingCustomInterval) return;

  const minutes = Number(ctx.message.text);

  if (!Number.isInteger(minutes) || minutes < 1) {
    await ctx.reply(TEXTS.REMINDERS.MIN_INTERVAL);
    return;
  }

  ctx.session.waitingCustomInterval = false;
  ctx.session.creatingReminder.intervalMinutes = minutes;

  await finalizeReminder(ctx);
};

const saveLastReminderText = async (ctx, text) => {
  await User.findOneAndUpdate(
    { telegramId: ctx.from.id },
    { $push: { lastReminderTexts: { $each: [text], $slice: -4 } } },
    { upsert: true }
  );
};

const finalizeReminder = async ctx => {
  const data = ctx.session.creatingReminder;

  await Reminder.create({
    userId: String(ctx.from.id),
    chatId: ctx.chat.id,
    text: data.text,
    intervalMinutes: data.intervalMinutes,
    deleteAfterSeconds: 10,
    isActive: true
  });

  await saveLastReminderText(ctx, data.text);

  ctx.session.creatingReminder = null;
  ctx.session.waitingCustomInterval = false;

  await ctx.reply(TEXTS.REMINDERS.CREATED, mainKeyboard);
};

export const handleMyReminders = async ctx => {
  ctx.session ??= {};
  ctx.session.reminderListMessages ??= [];

  for (const id of ctx.session.reminderListMessages) {
    await ctx.telegram.deleteMessage(ctx.chat.id, id).catch(() => {});
  }
  ctx.session.reminderListMessages = [];

  const reminders = await Reminder.find({
    userId: String(ctx.from.id)
  }).sort({ createdAt: 1 });

  if (!reminders.length) {
    const msg = await ctx.reply(TEXTS.REMINDERS.NONE, remindersKeyboard);
    ctx.session.reminderListMessages.push(msg.message_id);
    return;
  }

  for (let i = 0; i < reminders.length; i++) {
    const r = reminders[i];
    const status = r.isActive ? TEXTS.STATUS.ACTIVE : TEXTS.STATUS.PAUSED;

    const msg = await ctx.reply(
      `*${i + 1}.* ${status}
${formatInterval(r.intervalMinutes)}

«${r.text}»`,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [
            r.isActive
              ? Markup.button.callback('⏸ Приостановить', `pause:${r.id}`)
              : Markup.button.callback('▶️ Возобновить', `resume:${r.id}`),
            Markup.button.callback('🗑 Удалить', `delete:${r.id}`)
          ]
        ])
      }
    );

    ctx.session.reminderListMessages.push(msg.message_id);
  }
};



export const handleRequestAction = async (ctx, type) => {
  ctx.session ??= {};
  const id = ctx.callbackQuery.data.split(':')[1];

  const reminder = await Reminder.findById(id);
  if (!reminder) return;

  ctx.session.confirmAction = { type, id };

  await ctx.editMessageReplyMarkup();

  await ctx.reply(
    `Вы точно хотите ${type === 'delete' ? 'удалить' : 'изменить статус'} напоминание?\n\n«${previewText(reminder.text)}»`,
    Markup.inlineKeyboard([
      [
        Markup.button.callback(UI.CONFIRM_YES, 'confirm:yes'),
        Markup.button.callback(UI.CONFIRM_NO, 'confirm:no')
      ]
    ])
  );
};

export const handleConfirmAction = async ctx => {
  const action = ctx.session?.confirmAction;
  if (!action) return;

  if (ctx.callbackQuery.data === 'confirm:no') {
    ctx.session.confirmAction = null;
    await ctx.editMessageReplyMarkup();
    return;
  }

  if (action.type === 'delete') {
    await Reminder.findByIdAndDelete(action.id);
  }

  if (action.type === 'pause' || action.type === 'resume') {
    const r = await Reminder.findById(action.id);
    if (r) {
      r.isActive = !r.isActive;
      await r.save();
    }
  }

  ctx.session.confirmAction = null;
  await ctx.editMessageReplyMarkup();

  await handleMyReminders(ctx);
};
