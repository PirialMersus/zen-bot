import { Markup } from 'telegraf';
import { getRandomPointer } from '../services/pointers.js';
import { intervalKeyboard } from '../keyboard/intervals.js';
import { TEXTS } from '../constants/texts.js';
import { UI } from '../constants/ui.js';

const previewText = text =>
  text.length > 60 ? text.slice(0, 57) + '…' : text;

const buildPointerInlineKeyboard = () => {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback(UI.POINTER_TO_REMINDER, 'pointer:to_reminder'),
      Markup.button.callback(UI.POINTER_NEXT, 'pointer:next')
    ]
  ]);
};

export const handlePointer = async ctx => {
  const pointer = await getRandomPointer();
  if (!pointer) {
    await ctx.reply(TEXTS.POINTERS.EMPTY);
    return;
  }

  ctx.session ??= {};
  ctx.session.lastPointerText = pointer.text;

  const formattedText = pointer.source
    ? `${pointer.text}\n\n— ${pointer.source}`
    : pointer.text;

  await ctx.reply(
    formattedText,
    buildPointerInlineKeyboard()
  );
};

export const handleNextPointer = async ctx => {
  const isCallbackQueryEvent = Boolean(ctx.callbackQuery);
  if (isCallbackQueryEvent) {
    await ctx.answerCbQuery().catch(() => {});
  }

  const pointer = await getRandomPointer();
  if (!pointer) {
    if (isCallbackQueryEvent) {
      await ctx.editMessageText(TEXTS.POINTERS.EMPTY).catch(() => {});
    } else {
      await ctx.reply(TEXTS.POINTERS.EMPTY);
    }
    return;
  }

  ctx.session ??= {};
  ctx.session.lastPointerText = pointer.text;

  const formattedText = pointer.source
    ? `${pointer.text}\n\n— ${pointer.source}`
    : pointer.text;

  if (isCallbackQueryEvent) {
    await ctx.editMessageText(
      formattedText,
      buildPointerInlineKeyboard()
    ).catch(() => {});
  } else {
    await ctx.reply(
      formattedText,
      buildPointerInlineKeyboard()
    );
  }
};

export const handlePointerToReminder = async ctx => {
  if (ctx.callbackQuery) {
    await ctx.answerCbQuery().catch(() => {});
  }

  const text = ctx.session?.lastPointerText;
  if (!text) return;

  ctx.session.creatingReminder = {
    text,
    fromPointer: true
  };

  ctx.session.reminderStep = 'INTERVAL';

  const preview = previewText(text);

  await ctx.reply(
    `<i>${TEXTS.REMINDERS.ASK_INTERVAL}</i>\n\n«${preview}»`,
    { parse_mode: 'HTML', ...intervalKeyboard }
  );
};
