import { Markup } from 'telegraf';
import { getButtons } from '../constants/buttons.js';
import { getTexts } from '../constants/texts.js';

export const quietHoursKeyboard = (language = 'ru') => {
  const buttons = getButtons(language);
  const texts = getTexts(language);
  const presetLabels = texts.SETTINGS.QUIET_PRESETS;

  return Markup.inlineKeyboard([
    [Markup.button.callback(presetLabels.early, 'settings:quiet_hours:preset:22:7')],
    [Markup.button.callback(presetLabels.standard, 'settings:quiet_hours:preset:23:8')],
    [Markup.button.callback(presetLabels.nightOwl, 'settings:quiet_hours:preset:0:9')],
    [Markup.button.callback(presetLabels.late, 'settings:quiet_hours:preset:1:10')],
    [Markup.button.callback(presetLabels.custom, 'settings:quiet_hours:custom')],
    [Markup.button.callback(buttons.BACK, 'settings:menu')]
  ]);
};
