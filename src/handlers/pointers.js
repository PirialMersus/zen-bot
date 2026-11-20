import { Markup } from 'telegraf';
import {
  getNextPointerForUser,
  getNextFavoritePointerForUser,
  getPointerById,
  isPointerInFavorites,
  toggleFavoritePointer,
  countUserFavoritePointers,
  findPointersByText,
  countPointersByText
} from '../services/pointers.js';
import { getIntervalKeyboard } from '../keyboard/intervals.js';
import { mainKeyboard } from '../keyboard/main.js';
import {
  getPointersMenuKeyboard,
  buildPointerInlineKeyboard,
  buildReminderPointerInlineKeyboard
} from '../keyboard/pointers.js';
import { cancelDeletionTimer, hasDeletionTimer } from '../services/deletionTimers.js';
import { getTexts } from '../constants/texts.js';
import { getUi } from '../constants/ui.js';
import { resolveUserLanguage } from '../middlewares/activity.js';
import { previewText } from '../utils/text.js';
import { escapeHtml } from '../utils/escapeHtml.js';
import { isNavigationButton } from '../utils/navigation.js';
import { handleReminderText, REMINDER_STEP } from './reminders.js';
import { suppressExpectedError } from '../utils/logger.js';

export { buildPointerInlineKeyboard };

export const formatPointerText = (pointer) =>
  pointer?.source ? `${pointer.text}\n\n— ${pointer.source}` : pointer?.text || '';

export const handlePointer = async (ctx) => {
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

  ctx.session.pointerHistory ??= [];
  ctx.session.pointerHistoryIndex ??= -1;
  if (
    ctx.session.pointerHistoryIndex >= 0 &&
    ctx.session.pointerHistoryIndex < ctx.session.pointerHistory.length - 1
  ) {
    ctx.session.pointerHistory = ctx.session.pointerHistory.slice(
      0,
      ctx.session.pointerHistoryIndex + 1
    );
  }
  ctx.session.pointerHistory.push(String(pointer._id));
  ctx.session.pointerHistoryIndex = ctx.session.pointerHistory.length - 1;

  const hasPrevious = ctx.session.pointerHistoryIndex > 0;
  const formattedText = formatPointerText(pointer);

  await ctx.reply(
    formattedText,
    buildPointerInlineKeyboard({
      pointerId: pointer._id,
      isFavorite,
      mode: 'random',
      language: userLanguage,
      hasPrevious
    })
  );
};

export const handlePointersMenu = async (ctx) => {
  ctx.session ??= {};
  ctx.session.reminderStep = null;
  ctx.session.creatingReminder = null;
  ctx.session.isSettingCustomQuietHours = null;
  const userLanguage = await resolveUserLanguage(ctx);
  const texts = getTexts(userLanguage);
  await ctx.reply(texts.POINTERS.MENU_LABEL, getPointersMenuKeyboard(userLanguage));
  await handlePointer(ctx);
};

export const handleRandomPointer = async (ctx) => {
  if (ctx.session?.reminderStep === REMINDER_STEP.TEXT) {
    return handleReminderText(ctx);
  }
  ctx.session ??= {};
  ctx.session.pointerMode = 'random';
  await handlePointer(ctx);
};

export const handleFavoritePointer = async (ctx) => {
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

  ctx.session.favoriteHistory ??= [];
  ctx.session.favoriteHistoryIndex ??= -1;
  if (
    ctx.session.favoriteHistoryIndex >= 0 &&
    ctx.session.favoriteHistoryIndex < ctx.session.favoriteHistory.length - 1
  ) {
    ctx.session.favoriteHistory = ctx.session.favoriteHistory.slice(
      0,
      ctx.session.favoriteHistoryIndex + 1
    );
  }
  ctx.session.favoriteHistory.push({
    id: String(pointer._id),
    current: favoriteInfo.current,
    total: favoriteInfo.total
  });
  ctx.session.favoriteHistoryIndex = ctx.session.favoriteHistory.length - 1;

  const hasPrevious = ctx.session.favoriteHistoryIndex > 0;
  const formattedText = formatPointerText(pointer);

  await ctx.reply(
    formattedText,
    buildPointerInlineKeyboard({
      pointerId: pointer._id,
      isFavorite: true,
      mode: 'favorite',
      language: userLanguage,
      favoriteInfo,
      hasPrevious
    })
  );
};

export const handleFavoriteInfo = async (ctx) => {
  const userLanguage = await resolveUserLanguage(ctx);
  const texts = getTexts(userLanguage);
  await ctx
    .answerCbQuery(texts.POINTERS.FAVORITE_BADGE_INFO, { show_alert: false })
    .catch(suppressExpectedError);
};

export const handleExpireInfo = async (ctx) => {
  const userLanguage = await resolveUserLanguage(ctx);
  const texts = getTexts(userLanguage);
  await ctx
    .answerCbQuery(texts.POINTERS.EXPIRE_BADGE_INFO, { show_alert: false })
    .catch(suppressExpectedError);
};

export const handleNextPointer = async (ctx) => {
  const isCallbackQueryEvent = Boolean(ctx.callbackQuery);

  const callbackData = ctx.callbackQuery?.data || '';
  const isFavoriteMode =
    callbackData.startsWith('pointer:next:favorite') || ctx.session?.pointerMode === 'favorite';
  const currentMode = isFavoriteMode ? 'favorite' : 'random';

  const userLanguage = await resolveUserLanguage(ctx);
  const texts = getTexts(userLanguage);

  let pointer = null;
  let isFavorite = false;
  let favoriteInfo = null;

  ctx.session ??= {};

  if (isFavoriteMode) {
    ctx.session.favoriteHistory ??= [];
    ctx.session.favoriteHistoryIndex ??= -1;

    const canNavigateForwardInFavoriteHistory =
      ctx.session.favoriteHistoryIndex >= 0 &&
      ctx.session.favoriteHistoryIndex < ctx.session.favoriteHistory.length - 1;

    if (canNavigateForwardInFavoriteHistory) {
      if (isCallbackQueryEvent) {
        await ctx.answerCbQuery().catch(suppressExpectedError);
      }
      ctx.session.favoriteHistoryIndex += 1;
      const historyEntry = ctx.session.favoriteHistory[ctx.session.favoriteHistoryIndex];
      pointer = await getPointerById(historyEntry.id, userLanguage);
      if (pointer) {
        isFavorite = await isPointerInFavorites(ctx.from.id, pointer._id);
        favoriteInfo = {
          current: historyEntry.current,
          total: historyEntry.total
        };
      }
    } else {
      pointer = await getNextFavoritePointerForUser(ctx.from.id);
      if (pointer) {
        isFavorite = true;
        favoriteInfo = {
          current: pointer.favoritePosition || 1,
          total: pointer.totalFavorites || 1
        };
        ctx.session.favoriteHistory.push({
          id: String(pointer._id),
          current: favoriteInfo.current,
          total: favoriteInfo.total
        });
        ctx.session.favoriteHistoryIndex = ctx.session.favoriteHistory.length - 1;

        if (isCallbackQueryEvent) {
          await ctx
            .answerCbQuery(texts.POINTERS.FAVORITE_TOAST(favoriteInfo.current, favoriteInfo.total))
            .catch(suppressExpectedError);
        }
      }
    }
  } else {
    if (isCallbackQueryEvent) {
      await ctx.answerCbQuery().catch(suppressExpectedError);
    }

    ctx.session.pointerHistory ??= [];
    ctx.session.pointerHistoryIndex ??= -1;

    const canNavigateForwardInPointerHistory =
      ctx.session.pointerHistoryIndex >= 0 &&
      ctx.session.pointerHistoryIndex < ctx.session.pointerHistory.length - 1;

    if (canNavigateForwardInPointerHistory) {
      ctx.session.pointerHistoryIndex += 1;
      const targetPointerId = ctx.session.pointerHistory[ctx.session.pointerHistoryIndex];
      pointer = await getPointerById(targetPointerId, userLanguage);
      if (pointer) {
        isFavorite = await isPointerInFavorites(ctx.from.id, pointer._id);
      }
    } else {
      pointer = await getNextPointerForUser(ctx.from.id);
      if (pointer) {
        isFavorite = await isPointerInFavorites(ctx.from.id, pointer._id);
        ctx.session.pointerHistory.push(String(pointer._id));
        ctx.session.pointerHistoryIndex = ctx.session.pointerHistory.length - 1;
      }
    }
  }

  if (!pointer) {
    const emptyMessage = isFavoriteMode ? texts.POINTERS.FAVORITE_EMPTY : texts.POINTERS.EMPTY;
    if (isCallbackQueryEvent) {
      await ctx.editMessageText(emptyMessage).catch(suppressExpectedError);
    } else {
      await ctx.reply(emptyMessage);
    }
    return;
  }

  const hasPrevious = isFavoriteMode
    ? ctx.session.favoriteHistoryIndex > 0
    : ctx.session.pointerHistoryIndex > 0;

  ctx.session.lastPointerText = pointer.text;
  ctx.session.lastPointerId = String(pointer._id);
  ctx.session.pointerMode = currentMode;
  if (favoriteInfo) {
    ctx.session.favoritePosition = favoriteInfo.current;
    ctx.session.totalFavorites = favoriteInfo.total;
  }

  const formattedText = formatPointerText(pointer);

  if (isCallbackQueryEvent) {
    await ctx
      .editMessageText(
        formattedText,
        buildPointerInlineKeyboard({
          pointerId: pointer._id,
          isFavorite,
          mode: currentMode,
          language: userLanguage,
          favoriteInfo,
          hasPrevious
        })
      )
      .catch(suppressExpectedError);
  } else {
    await ctx.reply(
      formattedText,
      buildPointerInlineKeyboard({
        pointerId: pointer._id,
        isFavorite,
        mode: currentMode,
        language: userLanguage,
        favoriteInfo,
        hasPrevious
      })
    );
  }
};

export const handlePrevPointer = async (ctx) => {
  const isCallbackQueryEvent = Boolean(ctx.callbackQuery);
  if (isCallbackQueryEvent) {
    await ctx.answerCbQuery().catch(suppressExpectedError);
  }

  const callbackData = ctx.callbackQuery?.data || '';
  const isFavoriteMode =
    callbackData.startsWith('pointer:prev:favorite') || ctx.session?.pointerMode === 'favorite';
  const currentMode = isFavoriteMode ? 'favorite' : 'random';

  const userLanguage = await resolveUserLanguage(ctx);
  let pointer = null;
  let isFavorite = false;
  let favoriteInfo = null;

  ctx.session ??= {};

  if (isFavoriteMode) {
    ctx.session.favoriteHistory ??= [];
    ctx.session.favoriteHistoryIndex ??= 0;

    if (ctx.session.favoriteHistoryIndex > 0) {
      ctx.session.favoriteHistoryIndex -= 1;
    }

    const historyEntry = ctx.session.favoriteHistory[ctx.session.favoriteHistoryIndex];
    if (historyEntry) {
      pointer = await getPointerById(historyEntry.id, userLanguage);
      if (pointer) {
        isFavorite = await isPointerInFavorites(ctx.from.id, pointer._id);
        favoriteInfo = {
          current: historyEntry.current,
          total: historyEntry.total
        };
      }
    }
  } else {
    ctx.session.pointerHistory ??= [];
    ctx.session.pointerHistoryIndex ??= 0;

    if (ctx.session.pointerHistoryIndex > 0) {
      ctx.session.pointerHistoryIndex -= 1;
    }

    const targetPointerId = ctx.session.pointerHistory[ctx.session.pointerHistoryIndex];
    if (targetPointerId) {
      pointer = await getPointerById(targetPointerId, userLanguage);
      if (pointer) {
        isFavorite = await isPointerInFavorites(ctx.from.id, pointer._id);
      }
    }
  }

  if (!pointer) {
    return;
  }

  const hasPrevious = isFavoriteMode
    ? ctx.session.favoriteHistoryIndex > 0
    : ctx.session.pointerHistoryIndex > 0;

  ctx.session.lastPointerText = pointer.text;
  ctx.session.lastPointerId = String(pointer._id);
  ctx.session.pointerMode = currentMode;
  if (favoriteInfo) {
    ctx.session.favoritePosition = favoriteInfo.current;
    ctx.session.totalFavorites = favoriteInfo.total;
  }

  const formattedText = formatPointerText(pointer);

  if (isCallbackQueryEvent) {
    await ctx
      .editMessageText(
        formattedText,
        buildPointerInlineKeyboard({
          pointerId: pointer._id,
          isFavorite,
          mode: currentMode,
          language: userLanguage,
          favoriteInfo,
          hasPrevious
        })
      )
      .catch(suppressExpectedError);
  } else {
    await ctx.reply(
      formattedText,
      buildPointerInlineKeyboard({
        pointerId: pointer._id,
        isFavorite,
        mode: currentMode,
        language: userLanguage,
        favoriteInfo,
        hasPrevious
      })
    );
  }
};

export const handleToggleFavoritePointer = async (ctx) => {
  const callbackData = ctx.callbackQuery?.data || '';
  const dataParts = callbackData.split(':');
  const pointerIdFromCallback = dataParts[2];
  const modeFromCallback = dataParts[3] || ctx.session?.pointerMode || 'random';
  const targetPointerId = pointerIdFromCallback || ctx.session?.lastPointerId;

  if (!targetPointerId) {
    await ctx.answerCbQuery().catch(suppressExpectedError);
    return;
  }

  const userLanguage = await resolveUserLanguage(ctx);
  const texts = getTexts(userLanguage);
  const { isFavorite, totalFavorites } = await toggleFavoritePointer(ctx.from.id, targetPointerId);

  const answerNotice = isFavorite ? texts.POINTERS.FAVORITE_ADDED : texts.POINTERS.FAVORITE_REMOVED;
  await ctx.answerCbQuery(answerNotice).catch(suppressExpectedError);

  if (modeFromCallback === 'reminder') {
    const targetChatId = ctx.chat?.id || ctx.callbackQuery?.message?.chat?.id;
    const targetMessageId = ctx.callbackQuery?.message?.message_id;

    if (isFavorite && hasDeletionTimer(targetChatId, targetMessageId)) {
      cancelDeletionTimer(targetChatId, targetMessageId);
    }

    const reminderKeyboard = buildReminderPointerInlineKeyboard({
      pointerId: targetPointerId,
      isFavorite,
      deleteAfterSeconds: null,
      language: userLanguage
    });

    await ctx.editMessageReplyMarkup(reminderKeyboard?.reply_markup).catch(suppressExpectedError);
    return;
  }

  let favoriteInfo = null;
  if (modeFromCallback === 'favorite') {
    favoriteInfo = {
      current: ctx.session?.favoritePosition || 1,
      total: totalFavorites
    };
  }

  const isFavoriteMode = modeFromCallback === 'favorite';
  const hasPrevious = isFavoriteMode
    ? (ctx.session?.favoriteHistoryIndex || 0) > 0
    : (ctx.session?.pointerHistoryIndex || 0) > 0;

  const updatedKeyboard = buildPointerInlineKeyboard({
    pointerId: targetPointerId,
    isFavorite,
    mode: modeFromCallback,
    language: userLanguage,
    favoriteInfo,
    hasPrevious
  });

  await ctx.editMessageReplyMarkup(updatedKeyboard.reply_markup).catch(suppressExpectedError);
};

export const handleKeepPointer = async (ctx) => {
  const targetChatId = ctx.chat?.id || ctx.callbackQuery?.message?.chat?.id;
  const targetMessageId = ctx.callbackQuery?.message?.message_id;

  cancelDeletionTimer(targetChatId, targetMessageId);

  const userLanguage = await resolveUserLanguage(ctx);
  const ui = getUi(userLanguage);

  await ctx.editMessageReplyMarkup().catch(suppressExpectedError);
  await ctx.answerCbQuery(ui.POINTER_KEEP_TOAST).catch(suppressExpectedError);
};

export const handlePointerToReminder = async (ctx) => {
  if (ctx.callbackQuery) {
    await ctx.answerCbQuery().catch(suppressExpectedError);
  }

  const text = ctx.session?.lastPointerText || ctx.callbackQuery?.message?.text;
  if (!text) return;

  const userLanguage = await resolveUserLanguage(ctx);
  const texts = getTexts(userLanguage);

  ctx.session ??= {};
  ctx.session.creatingReminder = {
    text,
    fromPointer: true
  };

  ctx.session.reminderStep = 'INTERVAL';

  const preview = previewText(text);

  await ctx.reply(
    `<i>${texts.REMINDERS.ASK_INTERVAL}</i>

«${escapeHtml(preview)}»

<i>${texts.REMINDERS.ASK_INTERVAL_HINT}</i>`,
    { parse_mode: 'HTML', ...getIntervalKeyboard(userLanguage) }
  );
};

export const handlePointerToMenu = async (ctx) => {
  if (ctx.callbackQuery) {
    await ctx.answerCbQuery().catch(suppressExpectedError);
    await ctx.deleteMessage().catch(suppressExpectedError);
  }
  ctx.session ??= {};
  ctx.session.isWaitingForSearchQuery = false;
  ctx.session.searchLanguage = null;
  ctx.session.lastFailedSearchQuery = null;
  ctx.session.pointerHistory = null;
  ctx.session.pointerHistoryIndex = null;
  ctx.session.favoriteHistory = null;
  ctx.session.favoriteHistoryIndex = null;
  const userLanguage = await resolveUserLanguage(ctx);
  const texts = getTexts(userLanguage);
  await ctx.reply(texts.MENU.MAIN, mainKeyboard(ctx, userLanguage));
};

export const executePointersSearch = async (ctx, searchPhrase, targetLanguage) => {
  const portionSizeLimit = 5;
  const texts = getTexts(targetLanguage);

  const [totalFoundCount, foundPointersList] = await Promise.all([
    countPointersByText(searchPhrase, targetLanguage),
    findPointersByText(searchPhrase, targetLanguage, portionSizeLimit, 0)
  ]);

  if (totalFoundCount === 0 || foundPointersList.length === 0) {
    ctx.session ??= {};
    const normalizedQuery = searchPhrase.trim().toLowerCase();
    const isRepeatedFailedQuery = ctx.session.lastFailedSearchQuery === normalizedQuery;
    ctx.session.isWaitingForSearchQuery = true;
    ctx.session.searchLanguage = targetLanguage;
    ctx.session.lastFailedSearchQuery = normalizedQuery;

    const notFoundMessage = isRepeatedFailedQuery
      ? texts.SEARCH.NOT_FOUND_REPEAT(searchPhrase, targetLanguage)
      : texts.SEARCH.NOT_FOUND(searchPhrase, targetLanguage);

    await ctx.reply(
      notFoundMessage,
      Markup.inlineKeyboard([
        [Markup.button.callback(texts.SEARCH.CANCEL_BUTTON, 'search:cancel')]
      ])
    );
    return true;
  }

  ctx.session ??= {};
  ctx.session.isWaitingForSearchQuery = false;
  ctx.session.searchLanguage = null;
  ctx.session.lastFailedSearchQuery = null;

  for (const singlePointerRecord of foundPointersList) {
    const formattedPointerMessage = formatPointerText(singlePointerRecord);
    ctx.session.lastPointerText = singlePointerRecord.text;
    ctx.session.lastPointerId = String(singlePointerRecord._id);

    const isFavorite = await isPointerInFavorites(ctx.from?.id, singlePointerRecord._id);

    await ctx.reply(
      formattedPointerMessage,
      buildPointerInlineKeyboard({
        pointerId: singlePointerRecord._id,
        isFavorite,
        mode: 'random',
        language: targetLanguage
      })
    );
  }

  if (totalFoundCount > foundPointersList.length) {
    const remainingCount = totalFoundCount - foundPointersList.length;
    ctx.session.searchState = {
      query: searchPhrase,
      language: targetLanguage,
      offset: foundPointersList.length,
      total: totalFoundCount
    };

    await ctx.reply(
      texts.SEARCH.PAGINATION_STATUS(totalFoundCount, foundPointersList.length),
      Markup.inlineKeyboard([
        [Markup.button.callback(texts.SEARCH.MORE_BUTTON(remainingCount), 'search:more')]
      ])
    );
  }

  return true;
};

export const handleSearchPointers = async (ctx) => {
  const rawIncomingMessageText = ctx.message?.text || '';
  const trimmedLowerCasedText = rawIncomingMessageText.trim().toLowerCase();

  let targetPointerLanguage = await resolveUserLanguage(ctx);
  const languageModifierMatch = trimmedLowerCasedText.match(/(?:^|\s|_)(en|ru|uk|es)(?:\s|$)/i);
  if (languageModifierMatch) {
    targetPointerLanguage = languageModifierMatch[1].toLowerCase();
  }

  let extractedSearchPhrase = rawIncomingMessageText
    .replace(/^\/(?:find|search|f)(?:_(?:en|ru|uk|es))?(?:\s+|$)/i, '')
    .trim();

  extractedSearchPhrase = extractedSearchPhrase
    .replace(/^(?:en|ru|uk|es)\s+/i, '')
    .replace(/\s+(?:en|ru|uk|es)$/i, '')
    .trim();

  const texts = getTexts(targetPointerLanguage);

  if (!extractedSearchPhrase) {
    ctx.session ??= {};
    ctx.session.isWaitingForSearchQuery = true;
    ctx.session.searchLanguage = targetPointerLanguage;
    ctx.session.lastFailedSearchQuery = null;
    await ctx.reply(texts.SEARCH.HINT);
    return true;
  }

  ctx.session ??= {};
  ctx.session.lastFailedSearchQuery = null;

  return executePointersSearch(ctx, extractedSearchPhrase, targetPointerLanguage);
};

export const handleSearchQueryInput = async (ctx) => {
  if (!ctx.session?.isWaitingForSearchQuery) return false;

  const rawInputText = ctx.message?.text?.trim() || '';
  if (!rawInputText) return false;

  if (rawInputText.startsWith('/') || isNavigationButton(rawInputText)) {
    ctx.session.isWaitingForSearchQuery = false;
    ctx.session.searchLanguage = null;
    ctx.session.lastFailedSearchQuery = null;
    return false;
  }

  const targetLanguage = ctx.session.searchLanguage || (await resolveUserLanguage(ctx));

  return executePointersSearch(ctx, rawInputText, targetLanguage);
};

export const handleCancelSearch = async (ctx) => {
  ctx.session ??= {};
  ctx.session.isWaitingForSearchQuery = false;
  ctx.session.searchLanguage = null;
  ctx.session.lastFailedSearchQuery = null;

  if (ctx.callbackQuery) {
    await ctx.answerCbQuery().catch(suppressExpectedError);
    await ctx.deleteMessage().catch(suppressExpectedError);
  }

  const userLanguage = await resolveUserLanguage(ctx);
  const texts = getTexts(userLanguage);
  await ctx.reply(texts.SEARCH.CANCELLED, mainKeyboard(ctx, userLanguage));
};

export const handleSearchMorePointers = async (ctx) => {
  const searchState = ctx.session?.searchState;
  const userLanguage = await resolveUserLanguage(ctx);
  const texts = getTexts(searchState?.language || userLanguage);

  if (!searchState || !searchState.query) {
    await ctx
      .answerCbQuery(texts.SEARCH.EXPIRED_SESSION, { show_alert: true })
      .catch(suppressExpectedError);
    return;
  }

  await ctx.answerCbQuery().catch(suppressExpectedError);

  const portionSizeLimit = 5;
  const nextPointers = await findPointersByText(
    searchState.query,
    searchState.language,
    portionSizeLimit,
    searchState.offset
  );

  if (nextPointers.length === 0) {
    await ctx
      .editMessageText(texts.SEARCH.ALL_SHOWN(searchState.total))
      .catch(suppressExpectedError);
    delete ctx.session.searchState;
    return;
  }

  await ctx.editMessageReplyMarkup().catch(suppressExpectedError);

  for (const singlePointerRecord of nextPointers) {
    const formattedPointerMessage = formatPointerText(singlePointerRecord);
    ctx.session.lastPointerText = singlePointerRecord.text;
    ctx.session.lastPointerId = String(singlePointerRecord._id);

    const isFavorite = await isPointerInFavorites(ctx.from?.id, singlePointerRecord._id);

    await ctx.reply(
      formattedPointerMessage,
      buildPointerInlineKeyboard({
        pointerId: singlePointerRecord._id,
        isFavorite,
        mode: 'random',
        language: searchState.language
      })
    );
  }

  searchState.offset += nextPointers.length;

  if (searchState.offset < searchState.total) {
    const remainingCount = searchState.total - searchState.offset;
    await ctx.reply(
      texts.SEARCH.PAGINATION_STATUS(searchState.total, searchState.offset),
      Markup.inlineKeyboard([
        [Markup.button.callback(texts.SEARCH.MORE_BUTTON(remainingCount), 'search:more')]
      ])
    );
  } else {
    await ctx.reply(texts.SEARCH.ALL_SHOWN(searchState.total));
    delete ctx.session.searchState;
  }
};
