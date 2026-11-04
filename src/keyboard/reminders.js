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

export const remindersKeyboard = getRemindersKeyboard('ru');
