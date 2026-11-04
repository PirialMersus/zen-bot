import { Markup } from 'telegraf';
import { getNextPointerForUser } from '../services/pointers.js';
import { getIntervalKeyboard } from '../keyboard/intervals.js';
import { getTexts } from '../constants/texts.js';
import { getUi } from '../constants/ui.js';
import { resolveUserLanguage } from '../middlewares/activity.js';

const previewText = text =>
  text.length > 60 ? text.slice(0, 57) + '…' : text;

export const formatPointerText = pointer =>
  pointer?.source ? `${pointer.text}\n\n— ${pointer.source}` : (pointer?.text || '');

export const buildPointerInlineKeyboard = (language = 'ru') => {
  const ui = getUi(language);

  return Markup.inlineKeyboard([
    [
      Markup.button.callback(ui.POINTER_TO_REMINDER, 'pointer:to_reminder'),
      Markup.button.callback(ui.POINTER_NEXT, 'pointer:next')
    ]
  ]);
};

export const handlePointer = async ctx => {
  const userLanguage = await resolveUserLanguage(ctx);
  const texts = getTexts(userLanguage);
  const pointer = await getNextPointerForUser(ctx.from.id);

  if (!pointer) {
    await ctx.reply(texts.POINTERS.EMPTY);
    return;
  }

  ctx.session ??= {};
  ctx.session.lastPointerText = pointer.text;

  const formattedText = formatPointerText(pointer);

  await ctx.reply(
    formattedText,
    buildPointerInlineKeyboard(userLanguage)
  );
};

export const handleNextPointer = async ctx => {
  const isCallbackQueryEvent = Boolean(ctx.callbackQuery);
  if (isCallbackQueryEvent) {
    await ctx.answerCbQuery().catch(() => {});
  }

  const userLanguage = await resolveUserLanguage(ctx);
  const texts = getTexts(userLanguage);
  const pointer = await getNextPointerForUser(ctx.from.id);

  if (!pointer) {
    if (isCallbackQueryEvent) {
      await ctx.editMessageText(texts.POINTERS.EMPTY).catch(() => {});
    } else {
      await ctx.reply(texts.POINTERS.EMPTY);
    }
    return;
  }

  ctx.session ??= {};
  ctx.session.lastPointerText = pointer.text;

  const formattedText = formatPointerText(pointer);

  if (isCallbackQueryEvent) {
    await ctx.editMessageText(
      formattedText,
      buildPointerInlineKeyboard(userLanguage)
    ).catch(() => {});
  } else {
    await ctx.reply(
      formattedText,
      buildPointerInlineKeyboard(userLanguage)
    );
  }
};

export const handlePointerToReminder = async ctx => {
  if (ctx.callbackQuery) {
    await ctx.answerCbQuery().catch(() => {});
  }

  const text = ctx.session?.lastPointerText;
  if (!text) return;

  const userLanguage = await resolveUserLanguage(ctx);
  const texts = getTexts(userLanguage);

  ctx.session.creatingReminder = {
    text,
    fromPointer: true
  };

  ctx.session.reminderStep = 'INTERVAL';

  const preview = previewText(text);

  await ctx.reply(
    `<i>${texts.REMINDERS.ASK_INTERVAL}</i>

«${preview}»

<i>${texts.REMINDERS.ASK_INTERVAL_HINT}</i>`,
    { parse_mode: 'HTML', ...getIntervalKeyboard(userLanguage) }
  );
};
