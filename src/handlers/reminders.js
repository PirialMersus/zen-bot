// src/handlers/reminders.js
import { Markup } from 'telegraf';
import { remindersKeyboard } from '../keyboard/reminders.js';
import { intervalKeyboard } from '../keyboard/intervals.js';
import { reminderTextKeyboard } from '../keyboard/reminderText.js';
import { mainKeyboard } from '../keyboard/main.js';
import Reminder from '../models/Reminder.js';
import User from '../models/User.js';
import { TEXTS } from "../constants/texts.js";
import { UI } from "../constants/ui.js";

const DEFAULT_REMINDER_TEXTS = [
  'Не вовлекайся 🧘',
  'В этом теле никого нет 🤯'
];

const normalizeText = text =>
  text.replace(/^«|»$/g, '').trim();

const escapeMarkdown = text =>
  text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');

const formatInterval = minutes => {
  if (minutes === 1440) return 'Раз в день ⌛';
  if (minutes === 60) return 'Каждый час ⌛';
  return `Каждые ${minutes} мин ⌛`;
};

export const previewText = text => {
  if (!text) return '';
  return text.length > 40 ? `${text.slice(0, 40)}…` : text;
};

export const handleReminders = async ctx => {
  await ctx.reply(TEXTS.MENU.REMINDERS, remindersKeyboard);
};

export const handleCreateReminder = async ctx => {
  ctx.session ??= {};
  ctx.session.creatingReminder = { fromPointer: false };
  ctx.session.waitingCustomInterval = false;
  ctx.session.reminderStep = 'TEXT';

  const user = await User.findOne({ telegramId: ctx.from.id });

  const stored = user?.lastReminderTexts?.length
    ? user.lastReminderTexts
    : [];

  const texts = [
    ...stored.filter(t => !DEFAULT_REMINDER_TEXTS.includes(t)),
    ...DEFAULT_REMINDER_TEXTS
  ].slice(0, 4);

  const subtitle = user?.lastReminderTexts?.length
    ? '✍️ Введите текст сообщения или выберите из последних'
    : '✍️ Введите текст сообщения или выберите из предложенных';

  await ctx.reply(
    `${TEXTS.REMINDERS.ASK_TEXT}\n\n${subtitle}`,
    reminderTextKeyboard(texts)
  );
};

export const handleReminderText = async ctx => {
  if (ctx.session?.reminderStep !== 'TEXT') return;

  let text = ctx.message.text;

  if (text.endsWith('…')) {
    const user = await User.findOne({ telegramId: ctx.from.id });
    const full = user?.lastReminderTexts?.find(t => t.startsWith(text.slice(0, -1)));
    if (full) text = full;
  }

  if (text === '✍️ Ввести новый текст') {
    await ctx.reply(
      '✍️ Введите новый текст напоминания',
      Markup.removeKeyboard()
    );
    return;
  }

  ctx.session.creatingReminder.text = text;
  ctx.session.reminderStep = 'INTERVAL';

  const preview = previewText(text);

  await ctx.reply(
    `${TEXTS.REMINDERS.ASK_INTERVAL}\n\n«${preview}»`,
    intervalKeyboard
  );
};

export const handleIntervalPreset = async (ctx, minutes) => {
  if (ctx.session?.reminderStep !== 'INTERVAL') return;

  ctx.session.creatingReminder.intervalMinutes = minutes;
  ctx.session.reminderStep = null;

  await finalizeReminder(ctx);
};

export const handleCustomIntervalRequest = async ctx => {
  ctx.session ??= {};

  if (!ctx.session.creatingReminder) return;

  ctx.session.reminderStep = 'CUSTOM_INTERVAL';

  await ctx.reply(
    `${TEXTS.REMINDERS.ASK_CUSTOM_INTERVAL}\n\n⌨️ Введите количество минут цифрами`,
    Markup.keyboard([['⬅️ Назад']]).resize()
  );
};

export const handleCustomIntervalInput = async ctx => {

  if (!ctx.session) {
    return false;
  }

  if (ctx.session.reminderStep !== 'CUSTOM_INTERVAL') {
    return false;
  }

  const minutes = Number(ctx.message.text);

  if (!Number.isInteger(minutes) || minutes < 1) {
    await ctx.reply(TEXTS.REMINDERS.MIN_INTERVAL);
    return true;
  }

  ctx.session.creatingReminder.intervalMinutes = minutes;
  ctx.session.reminderStep = null;

  await finalizeReminder(ctx);
  return true;
};

const saveLastReminderText = async (ctx, text) => {
  const user = await User.findOne({ telegramId: ctx.from.id });
  if (!user) return;

  const clean = normalizeText(text);

  const stored = user.lastReminderTexts?.length
    ? user.lastReminderTexts
    : DEFAULT_REMINDER_TEXTS;

  const userTexts = stored
    .filter(t => !DEFAULT_REMINDER_TEXTS.includes(t))
    .filter(t => t !== clean);

  const nextUserTexts = [clean, ...userTexts].slice(
    0,
    4 - DEFAULT_REMINDER_TEXTS.length
  );

  user.lastReminderTexts = [
    ...nextUserTexts,
    ...DEFAULT_REMINDER_TEXTS
  ];

  await user.save();
};


const finalizeReminder = async ctx => {
  try {
    const data = ctx.session.creatingReminder;
    const now = new Date();

    const cleanText = normalizeText(data.text);

    await Reminder.create({
      userId: String(ctx.from.id),
      chatId: ctx.chat.id,
      text: cleanText,
      intervalMinutes: data.intervalMinutes,
      deleteAfterSeconds: 10,
      isActive: true,
      nextRunAt: new Date(now.getTime() + data.intervalMinutes * 60 * 1000)
    });

    const intervalLabel = formatInterval(data.intervalMinutes);

    const safeText = escapeMarkdown(cleanText);

    await ctx.reply(
      `${intervalLabel}\n\n«${cleanText}»`
    );

    await saveLastReminderText(ctx, cleanText);

    ctx.session.creatingReminder = null;
    ctx.session.waitingCustomInterval = false;
    ctx.session.reminderStep = null;

    await ctx.reply(TEXTS.REMINDERS.CREATED, mainKeyboard(ctx));
  } catch (e) {}
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
  const id = ctx.callbackQuery.data.split(':')[1];

  const reminder = await Reminder.findById(id);
  if (!reminder) return;

  await ctx.editMessageReplyMarkup().catch(() => {});

  await ctx.reply(
    `Вы точно хотите ${type === 'delete' ? 'удалить' : 'изменить статус'} напоминание?\n\n«${previewText(reminder.text)}»`,
    Markup.inlineKeyboard([
      [
        Markup.button.callback(UI.CONFIRM_YES, `confirm:${type}:${id}`),
        Markup.button.callback(UI.CONFIRM_NO, 'confirm:no')
      ]
    ])
  );
};

export const handleConfirmAction = async ctx => {
  const data = ctx.callbackQuery.data;

  if (data === 'confirm:no') {
    await ctx.editMessageReplyMarkup().catch(() => {});
    return;
  }

  const [, type, id] = data.split(':');

  if (type === 'delete') {
    await Reminder.findByIdAndDelete(id);
  }

  if (type === 'pause' || type === 'resume') {
    const r = await Reminder.findById(id);
    if (r) {
      r.isActive = !r.isActive;
      await r.save();
    }
  }

  await ctx.editMessageReplyMarkup().catch(() => {});
  await handleMyReminders(ctx);
};
