import { Markup } from 'telegraf';
import {
  getNextPointerForUser,
  getNextFavoritePointerForUser,
  isPointerInFavorites,
  toggleFavoritePointer,
  countUserFavoritePointers
} from '../services/pointers.js';
import { getIntervalKeyboard } from '../keyboard/intervals.js';
import { getPointersMenuKeyboard, buildPointerInlineKeyboard as createPointerInlineKeyboard } from '../keyboard/pointers.js';
import { getTexts } from '../constants/texts.js';
import { getUi } from '../constants/ui.js';
import { resolveUserLanguage } from '../middlewares/activity.js';
import { handleReminderText, REMINDER_STEP } from './reminders.js';

const previewText = text =>
  text.length > 60 ? text.slice(0, 57) + '…' : text;

export const formatPointerText = pointer =>
  pointer?.source ? `${pointer.text}\n\n— ${pointer.source}` : (pointer?.text || '');

export const buildPointerInlineKeyboard = (arg1 = 'ru', isFavorite = false, pointerId = null, mode = 'random', favoriteInfo = null) => {
  let language = 'ru';
  let targetPointerId = pointerId;
  let targetIsFavorite = isFavorite;
  let targetMode = mode;
  let targetFavoriteInfo = favoriteInfo;

  if (typeof arg1 === 'string' && (arg1 === 'ru' || arg1 === 'en')) {
    language = arg1;
  } else if (typeof arg1 === 'object' || (typeof arg1 === 'string' && arg1)) {
    targetPointerId = String(arg1);
  }

  return createPointerInlineKeyboard(targetPointerId, targetIsFavorite, targetMode, language, targetFavoriteInfo);
};

export const handlePointer = async ctx => {
  const userLanguage = await resolveUserLanguage(ctx);
  const texts = getTexts(userLanguage);
  const pointer = await getNextPointerForUser(ctx.from.id);

  if (!pointer) {
    await ctx.reply(texts.POINTERS.EMPTY);
    return;
  }

  const isFavorite = await isPointerInFavorites(ctx.from.id, pointer._id);

  ctx.session ??= {};
  ctx.session.lastPointerText = pointer.text;
  ctx.session.lastPointerId = String(pointer._id);
  ctx.session.pointerMode = 'random';

  const formattedText = formatPointerText(pointer);

  await ctx.reply(
    formattedText,
    buildPointerInlineKeyboard(userLanguage, isFavorite, pointer._id, 'random')
  );
};

export const handlePointersMenu = async ctx => {
  ctx.session ??= {};
  ctx.session.reminderStep = null;
  ctx.session.creatingReminder = null;
  const userLanguage = await resolveUserLanguage(ctx);
  const label = userLanguage === 'en' ? '🧘 Pointers' : '🧘 Указатели';
  await ctx.reply(label, getPointersMenuKeyboard(userLanguage));
  await handlePointer(ctx);
};

export const handleRandomPointer = async ctx => {
  if (ctx.session?.reminderStep === REMINDER_STEP.TEXT) {
    return handleReminderText(ctx);
  }
  ctx.session ??= {};
  ctx.session.pointerMode = 'random';
  await handlePointer(ctx);
};

export const handleFavoritePointer = async ctx => {
  if (ctx.session?.reminderStep === REMINDER_STEP.TEXT) {
    return handleReminderText(ctx);
  }
  const userLanguage = await resolveUserLanguage(ctx);
  const texts = getTexts(userLanguage);
  const favoriteCount = await countUserFavoritePointers(ctx.from.id);

  if (!favoriteCount) {
    await ctx.reply(texts.POINTERS.FAVORITE_EMPTY);
    return;
  }

  const pointer = await getNextFavoritePointerForUser(ctx.from.id);
  if (!pointer) {
    await ctx.reply(texts.POINTERS.FAVORITE_EMPTY);
    return;
  }

  const favoriteInfo = {
    current: pointer.favoritePosition || 1,
    total: pointer.totalFavorites || favoriteCount
  };

  ctx.session ??= {};
  ctx.session.lastPointerText = pointer.text;
  ctx.session.lastPointerId = String(pointer._id);
  ctx.session.pointerMode = 'favorite';
  ctx.session.favoritePosition = favoriteInfo.current;
  ctx.session.totalFavorites = favoriteInfo.total;

  const formattedText = formatPointerText(pointer);

  await ctx.reply(
    formattedText,
    buildPointerInlineKeyboard(userLanguage, true, pointer._id, 'favorite', favoriteInfo)
  );
};

export const handleFavoriteInfo = async ctx => {
  const userLanguage = await resolveUserLanguage(ctx);
  const texts = getTexts(userLanguage);
  await ctx.answerCbQuery(texts.POINTERS.FAVORITE_BADGE_INFO, { show_alert: false }).catch(() => {});
};

export const handleNextPointer = async ctx => {
  const isCallbackQueryEvent = Boolean(ctx.callbackQuery);

  const callbackData = ctx.callbackQuery?.data || '';
  const isFavoriteMode = callbackData.startsWith('pointer:next:favorite') || ctx.session?.pointerMode === 'favorite';
  const currentMode = isFavoriteMode ? 'favorite' : 'random';

  const userLanguage = await resolveUserLanguage(ctx);
  const texts = getTexts(userLanguage);

  let pointer = null;
  let isFavorite = false;
  let favoriteInfo = null;

  if (isFavoriteMode) {
    pointer = await getNextFavoritePointerForUser(ctx.from.id);
    isFavorite = true;
    if (pointer) {
      favoriteInfo = {
        current: pointer.favoritePosition || 1,
        total: pointer.totalFavorites || 1
      };
      if (isCallbackQueryEvent) {
        await ctx.answerCbQuery(texts.POINTERS.FAVORITE_TOAST(favoriteInfo.current, favoriteInfo.total)).catch(() => {});
      }
    }
  } else {
    if (isCallbackQueryEvent) {
      await ctx.answerCbQuery().catch(() => {});
    }
    pointer = await getNextPointerForUser(ctx.from.id);
    if (pointer) {
      isFavorite = await isPointerInFavorites(ctx.from.id, pointer._id);
    }
  }

  if (!pointer) {
    const emptyMessage = isFavoriteMode ? texts.POINTERS.FAVORITE_EMPTY : texts.POINTERS.EMPTY;
    if (isCallbackQueryEvent) {
      await ctx.editMessageText(emptyMessage).catch(() => {});
    } else {
      await ctx.reply(emptyMessage);
    }
    return;
  }

  ctx.session ??= {};
  ctx.session.lastPointerText = pointer.text;
  ctx.session.lastPointerId = String(pointer._id);
  ctx.session.pointerMode = currentMode;
  if (favoriteInfo) {
    ctx.session.favoritePosition = favoriteInfo.current;
    ctx.session.totalFavorites = favoriteInfo.total;
  }

  const formattedText = formatPointerText(pointer);

  if (isCallbackQueryEvent) {
    await ctx.editMessageText(
      formattedText,
      buildPointerInlineKeyboard(userLanguage, isFavorite, pointer._id, currentMode, favoriteInfo)
    ).catch(() => {});
  } else {
    await ctx.reply(
      formattedText,
      buildPointerInlineKeyboard(userLanguage, isFavorite, pointer._id, currentMode, favoriteInfo)
    );
  }
};

export const handleToggleFavoritePointer = async ctx => {
  const callbackData = ctx.callbackQuery?.data || '';
  const dataParts = callbackData.split(':');
  const pointerIdFromCallback = dataParts[2];
  const modeFromCallback = dataParts[3] || ctx.session?.pointerMode || 'random';
  const targetPointerId = pointerIdFromCallback || ctx.session?.lastPointerId;

  if (!targetPointerId) {
    await ctx.answerCbQuery().catch(() => {});
    return;
  }

  const userLanguage = await resolveUserLanguage(ctx);
  const texts = getTexts(userLanguage);
  const { isFavorite, totalFavorites } = await toggleFavoritePointer(ctx.from.id, targetPointerId);

  const answerNotice = isFavorite ? texts.POINTERS.FAVORITE_ADDED : texts.POINTERS.FAVORITE_REMOVED;
  await ctx.answerCbQuery(answerNotice).catch(() => {});

  let favoriteInfo = null;
  if (modeFromCallback === 'favorite') {
    favoriteInfo = {
      current: ctx.session?.favoritePosition || 1,
      total: totalFavorites
    };
  }

  const updatedKeyboard = buildPointerInlineKeyboard(
    userLanguage,
    isFavorite,
    targetPointerId,
    modeFromCallback,
    favoriteInfo
  );

  await ctx.editMessageReplyMarkup(updatedKeyboard.reply_markup).catch(() => {});
};

export const handlePointerToReminder = async ctx => {
  if (ctx.callbackQuery) {
    await ctx.answerCbQuery().catch(() => {});
  }

  const text = ctx.session?.lastPointerText || ctx.callbackQuery?.message?.text;
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
