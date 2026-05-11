// src/handlers/reminders.js
import { Markup } from 'telegraf';
import Reminder from '../models/Reminder.js';
import User from '../models/User.js';
import { TEXTS } from '../constants/texts.js';
import { UI } from '../constants/ui.js';
import { remindersKeyboard } from '../keyboard/reminders.js';
import { reminderTextKeyboard } from '../keyboard/reminderText.js';
import { intervalKeyboard } from '../keyboard/intervals.js';
import { deleteAfterKeyboard } from '../keyboard/deleteAfter.js';
import { mainKeyboard } from '../keyboard/main.js';

export const REMINDER_STEP = {
  TEXT: 'TEXT',
  INTERVAL: 'INTERVAL',
  AUTO_DELETE: 'AUTO_DELETE'
};

const DEFAULT_REMINDER_TEXTS = [
  'Не вовлекайся 🧘',
  'В этом теле никого нет 🤯'
];

const normalizeText = text =>
  text.replace(/^«|»$/g, '').trim();

const formatInterval = minutes => {
  if (minutes === 1440) return 'Раз в день ⌛';
  if (minutes === 60) return 'Каждый час ⌛';
  return `Каждые ${minutes} мин ⌛`;
};

const formatReminderMessageText = (r, indexStr) => {
  const status = r.isActive ? TEXTS.STATUS.ACTIVE : TEXTS.STATUS.PAUSED;
  const autoDeleteLabel =
    r.deleteAfterSeconds === null
      ? '(автоудаление: не удаляется)'
      : `(автоудаление: через ${r.deleteAfterSeconds} сек)`;
  const displayText = r.isRandomPointer ? UI.REMINDER_RANDOM : r.text;

  return `<b>${indexStr}.</b> ${status}

<i>${formatInterval(r.intervalMinutes)}</i>
<i>${autoDeleteLabel}</i>

«${displayText}»`;
};

const getReminderMessageKeyboard = r => {
  return Markup.inlineKeyboard([
    [
      r.isActive
        ? Markup.button.callback('⏸ Приостановить', `pause:${r.id}`)
        : Markup.button.callback('▶️ Возобновить', `resume:${r.id}`),
      Markup.button.callback('🗑 Удалить', `delete:${r.id}`)
    ]
  ]);
};

export const previewText = text => {
  if (!text) return '';
  return text.length > 40 ? `${text.slice(0, 40)}…` : text;
};

export const renderReminderStep = async ctx => {
  const step = ctx.session.reminderStep;
  const data = ctx.session.creatingReminder;

  if (step === REMINDER_STEP.TEXT) {
    const user = await User.findOne({ telegramId: ctx.from.id });

    const stored = user?.lastReminderTexts?.length
      ? user.lastReminderTexts
      : [];

    const texts = [
      ...stored.filter(t => !DEFAULT_REMINDER_TEXTS.includes(t)),
      ...DEFAULT_REMINDER_TEXTS
    ].slice(0, 4);

    const subtitle = stored.length
      ? '✍️ Введите текст сообщения или выберите из последних'
      : '✍️ Введите текст сообщения или выберите из предложенных';

    await ctx.reply(
      `${TEXTS.REMINDERS.ASK_TEXT}\n\n${subtitle}`,
      reminderTextKeyboard(texts)
    );
    return;
  }

  if (step === REMINDER_STEP.INTERVAL) {
    await ctx.reply(
      `<i>${TEXTS.REMINDERS.ASK_INTERVAL}</i>

«${previewText(data.text)}»

<i>${TEXTS.REMINDERS.ASK_INTERVAL_HINT}</i>`,
      { parse_mode: 'HTML', ...intervalKeyboard }
    );
    return;
  }

  if (step === REMINDER_STEP.AUTO_DELETE) {
    await ctx.reply(
      `<i>${TEXTS.REMINDERS.ASK_DELETE_AFTER}</i>

«${previewText(data.text)}»

<i>${TEXTS.REMINDERS.ASK_DELETE_AFTER_HINT}</i>`,
      { parse_mode: 'HTML', ...deleteAfterKeyboard }
    );
  }
};

export const handleReminders = async ctx => {
  await ctx.reply(TEXTS.MENU.REMINDERS, remindersKeyboard);
};

export const handleCreateReminder = async ctx => {
  ctx.session ??= {};
  ctx.session.creatingReminder = {
    deleteAfterSeconds: 10
  };
  ctx.session.reminderStep = REMINDER_STEP.TEXT;
  await renderReminderStep(ctx);
};

export const handleReminderText = async ctx => {
  if (ctx.session?.reminderStep !== REMINDER_STEP.TEXT) return;

  let text = ctx.message.text;

  if (text.endsWith('…')) {
    const user = await User.findOne({ telegramId: ctx.from.id });
    const full = user?.lastReminderTexts?.find(t =>
      t.startsWith(text.slice(0, -1))
    );
    if (full) text = full;
  }

  if (text === '✍️ Ввести новый текст') {
    await ctx.reply(
      '✍️ Введите новый текст напоминания',
      Markup.removeKeyboard()
    );
    return;
  }

  if (text === UI.REMINDER_RANDOM) {
    ctx.session.creatingReminder.isRandomPointer = true;
    ctx.session.creatingReminder.text = UI.REMINDER_RANDOM;
  } else {
    ctx.session.creatingReminder.text = text;
    ctx.session.creatingReminder.isRandomPointer = false;
  }

  ctx.session.reminderStep = REMINDER_STEP.INTERVAL;
  await renderReminderStep(ctx);
};

export const handleIntervalPreset = async (ctx, minutes) => {
  if (ctx.session?.reminderStep !== REMINDER_STEP.INTERVAL) return;

  ctx.session.creatingReminder.intervalMinutes = minutes;
  ctx.session.reminderStep = REMINDER_STEP.AUTO_DELETE;
  await renderReminderStep(ctx);
};

export const handleIntervalInput = async ctx => {
  if (ctx.session?.reminderStep !== REMINDER_STEP.INTERVAL) return false;

  const minutes = Number(ctx.message.text);

  if (!Number.isInteger(minutes) || minutes < 1) {
    await ctx.reply(TEXTS.REMINDERS.MIN_INTERVAL);
    return true;
  }

  ctx.session.creatingReminder.intervalMinutes = minutes;
  ctx.session.reminderStep = REMINDER_STEP.AUTO_DELETE;
  await renderReminderStep(ctx);
  return true;
};

export const handleDeleteAfterPreset = async ctx => {
  if (ctx.session?.reminderStep !== REMINDER_STEP.AUTO_DELETE) return;

  const text = ctx.message.text;

  let seconds;

  if (text === '10 сек') seconds = 10;
  if (text === '30 сек') seconds = 30;
  if (text === '1 мин') seconds = 60;
  if (text === 'Не удалять') seconds = null;

  if (seconds === undefined) return;

  ctx.session.creatingReminder.deleteAfterSeconds = seconds;
  ctx.session.reminderStep = null;

  await finalizeReminder(ctx);
};

export const handleDeleteAfterInput = async ctx => {
  if (ctx.session?.reminderStep !== REMINDER_STEP.AUTO_DELETE) return false;

  const seconds = Number(ctx.message.text);

  if (!Number.isInteger(seconds) || seconds < 1) {
    await ctx.reply(TEXTS.REMINDERS.INVALID_SECONDS);
    return true;
  }

  ctx.session.creatingReminder.deleteAfterSeconds = seconds;
  ctx.session.reminderStep = null;

  await finalizeReminder(ctx);
  return true;
};

const saveLastReminderText = async (ctx, text) => {
  const user = await User.findOne({ telegramId: ctx.from.id });
  if (!user) return;

  if (text === UI.REMINDER_RANDOM) return;

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
  const data = ctx.session.creatingReminder;
  const now = new Date();
  const cleanText = normalizeText(data.text);

  await Reminder.create({
    userId: String(ctx.from.id),
    chatId: ctx.chat.id,
    text: cleanText,
    intervalMinutes: data.intervalMinutes,
    deleteAfterSeconds: data.deleteAfterSeconds,
    isActive: true,
    isRandomPointer: !!data.isRandomPointer,
    nextRunAt: new Date(
      now.getTime() + data.intervalMinutes * 60 * 1000
    )
  });

  const intervalLabel = formatInterval(data.intervalMinutes);

  const deleteAfterLabel =
    data.deleteAfterSeconds === null
      ? 'не удаляется'
      : `через ${data.deleteAfterSeconds} сек`;

  await ctx.reply(
    `<i>${intervalLabel}</i>
<i>(автоудаление: ${deleteAfterLabel})</i>

«${cleanText}»`,
    { parse_mode: 'HTML' }
  );

  await saveLastReminderText(ctx, cleanText);

  ctx.session.creatingReminder = null;
  ctx.session.reminderStep = null;

  await ctx.reply(
    `<i>${TEXTS.REMINDERS.CREATED}</i>`,
    { parse_mode: 'HTML', ...mainKeyboard(ctx) }
  );
};

export const handleMyReminders = async ctx => {
  const reminders = await Reminder.find({
    userId: String(ctx.from.id)
  }).sort({ createdAt: 1 });

  if (!reminders.length) {
    await ctx.reply(TEXTS.REMINDERS.NONE, remindersKeyboard);
    return;
  }

  for (let i = 0; i < reminders.length; i++) {
    const r = reminders[i];
    await ctx.reply(
      formatReminderMessageText(r, i + 1),
      {
        parse_mode: 'HTML',
        ...getReminderMessageKeyboard(r)
      }
    );
  }
};

export const handleRequestAction = async (ctx, type) => {
  const id = ctx.callbackQuery.data.split(':')[1];
  const reminder = await Reminder.findById(id);
  if (!reminder) return ctx.answerCbQuery('Напоминание не найдено').catch(() => {});

  if (type === 'pause' || type === 'resume') {
    reminder.isActive = !reminder.isActive;
    await reminder.save();

    const originalText = ctx.callbackQuery.message?.text || '';
    const matchIndex = originalText.match(/^(\d+)\./);
    const indexStr = matchIndex ? matchIndex[1] : '?';

    await ctx.editMessageText(
      formatReminderMessageText(reminder, indexStr),
      {
        parse_mode: 'HTML',
        ...getReminderMessageKeyboard(reminder)
      }
    ).catch(() => {});

    return ctx.answerCbQuery('Статус изменен').catch(() => {});
  }

  if (type === 'delete') {
    await ctx.editMessageReplyMarkup(
      Markup.inlineKeyboard([
        [
          Markup.button.callback('🗑 Подтвердить удаление', `confirm:delete:${id}`),
          Markup.button.callback('❌ Отмена', `confirm:cancel:${id}`)
        ]
      ]).reply_markup
    ).catch(() => {});

    return ctx.answerCbQuery().catch(() => {});
  }
};

export const handleConfirmAction = async ctx => {
  const data = ctx.callbackQuery.data;
  await ctx.answerCbQuery().catch(() => {});

  if (data === 'confirm:no') {
    await ctx.deleteMessage().catch(() => {});
    return;
  }

  const [, type, id] = data.split(':');

  if (type === 'cancel') {
    const r = await Reminder.findById(id);
    if (r) {
      await ctx.editMessageReplyMarkup(getReminderMessageKeyboard(r).reply_markup).catch(() => {});
    }
    return;
  }

  if (type === 'delete') {
    await Reminder.findByIdAndDelete(id);
    await ctx.deleteMessage().catch(() => {});
    return;
  }
};
