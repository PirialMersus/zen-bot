import { Markup } from 'telegraf';
import { getButtons } from '../constants/buttons.js';
import { getUi } from '../constants/ui.js';

export const getPointersMenuKeyboard = (language = 'ru') => {
  const buttons = getButtons(language);
  const ui = getUi(language);

  return Markup.keyboard([
    [ui.POINTER_RANDOM, ui.POINTER_FAVORITE],
    [buttons.BACK]
  ]).resize();
};

export const buildPointerInlineKeyboard = (pointerId, isFavorite = false, mode = 'random', language = 'ru', favoriteInfo = null) => {
  const ui = getUi(language);
  const favoriteButtonText = isFavorite ? ui.POINTER_FAV_REMOVE : ui.POINTER_FAV_ADD;

  if (mode === 'favorite') {
    const badgeText = favoriteInfo
      ? ui.POINTER_FAV_MODE_BADGE(favoriteInfo.current, favoriteInfo.total)
      : ui.POINTER_FAV_MODE_BADGE(0, 0);

    const nextFavText = ui.POINTER_NEXT_FAV;

    return Markup.inlineKeyboard([
      [
        Markup.button.callback(badgeText, 'pointer:fav_info')
      ],
      [
        Markup.button.callback(ui.POINTER_TO_REMINDER, 'pointer:to_reminder'),
        Markup.button.callback(nextFavText, 'pointer:next:favorite')
      ],
      [
        Markup.button.callback(favoriteButtonText, `pointer:fav_toggle:${pointerId}:favorite`)
      ]
    ]);
  }

  return Markup.inlineKeyboard([
    [
      Markup.button.callback(ui.POINTER_TO_REMINDER, 'pointer:to_reminder'),
      Markup.button.callback(ui.POINTER_NEXT, `pointer:next:${mode}`)
    ],
    [
      Markup.button.callback(favoriteButtonText, `pointer:fav_toggle:${pointerId}:${mode}`)
    ]
  ]);
};

export const buildReminderPointerInlineKeyboard = ({
  pointerId,
  isFavorite = false,
  deleteAfterSeconds = null,
  language = 'ru'
}) => {
  const ui = getUi(language);
  const actionRow = [];

  if (deleteAfterSeconds) {
    actionRow.push(
      Markup.button.callback(ui.POINTER_KEEP_BUTTON(deleteAfterSeconds), `pointer:keep:${pointerId || ''}`)
    );
  }

  const shouldShowFavoriteAddButton = !isFavorite && Boolean(pointerId);
  if (shouldShowFavoriteAddButton) {
    actionRow.push(
      Markup.button.callback(ui.POINTER_FAV_ADD, `pointer:fav_toggle:${pointerId}:reminder`)
    );
  }

  if (actionRow.length === 0) {
    return null;
  }

  return Markup.inlineKeyboard([actionRow]);
};
