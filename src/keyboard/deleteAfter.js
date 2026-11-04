import { Markup } from 'telegraf';
import { getButtons } from '../constants/buttons.js';
import { getTexts } from '../constants/texts.js';

export const getDeleteAfterKeyboard = (language = 'ru') => {
  const texts = getTexts(language);
  const buttons = getButtons(language);
  const options = texts.INTERVALS.OPTIONS;

  return Markup.keyboard([
    [options[0], options[1]],
    [options[2], options[3]],
    [buttons.BACK]
  ]).resize();
};

export const deleteAfterKeyboard = getDeleteAfterKeyboard('ru');
