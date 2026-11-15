import { Markup } from 'telegraf';
import { getButtons } from '../constants/buttons.js';
import { getUi } from '../constants/ui.js';

export const getRemindersKeyboard = (language = 'ru') => {
  const buttons = getButtons(language);
  const ui = getUi(language);

  return Markup.keyboard([
    [ui.REMINDER_CREATE, ui.REMINDER_MY],
    [buttons.BACK]
  ]).resize();
};

export const buildAutoDeleteKeepKeyboard = (deleteAfterSeconds, language = 'ru') => {
  if (!deleteAfterSeconds) return null;
  const ui = getUi(language);
  return Markup.inlineKeyboard([
    [Markup.button.callback(ui.POINTER_KEEP_BUTTON(deleteAfterSeconds), 'reminder:keep')]
  ]);
};

export const remindersKeyboard = getRemindersKeyboard('ru');
