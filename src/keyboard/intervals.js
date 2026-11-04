import { Markup } from 'telegraf';
import { getButtons } from '../constants/buttons.js';
import { getUi } from '../constants/ui.js';

export const getIntervalKeyboard = (language = 'ru') => {
  const buttons = getButtons(language);
  const ui = getUi(language);

  return Markup.keyboard([
    [ui.INTERVAL_5, ui.INTERVAL_15],
    [ui.INTERVAL_60, ui.INTERVAL_1440],
    [buttons.BACK]
  ]).resize();
};

export const intervalKeyboard = getIntervalKeyboard('ru');
