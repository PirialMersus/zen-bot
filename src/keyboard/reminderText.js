import { Markup } from 'telegraf';
import { getButtons } from '../constants/buttons.js';
import { getUi } from '../constants/ui.js';

export const reminderTextKeyboard = (texts, language = 'ru') => {
  const buttons = getButtons(language);
  const ui = getUi(language);

  const rows = [[ui.REMINDER_RANDOM, ui.REMINDER_FAVORITE]];
  const uniqueTexts = [...new Set((texts || []).map(item => item.trim()).filter(Boolean))];

  for (let index = 0; index < uniqueTexts.length; index += 2) {
    rows.push(uniqueTexts.slice(index, index + 2));
  }

  rows.push([buttons.BACK]);

  return Markup.keyboard(rows).resize();
};
