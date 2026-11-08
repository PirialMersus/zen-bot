import { Markup } from 'telegraf';
import { getButtons } from '../constants/buttons.js';

export const quietHoursKeyboard = (language = 'ru') => {
  const buttons = getButtons(language);

  const presetLabels = language === 'en'
    ? {
      early: '🌅 22:00 – 07:00 (Early)',
      standard: '🌙 23:00 – 08:00 (Standard)',
      nightOwl: '🦉 00:00 – 09:00 (Night Owl)',
      late: '🌌 01:00 – 10:00 (Late)',
      custom: '✍️ Custom schedule'
    }
    : language === 'uk'
      ? {
        early: '🌅 22:00 – 07:00 (Ранній)',
        standard: '🌙 23:00 – 08:00 (Стандартний)',
        nightOwl: '🦉 00:00 – 09:00 (Нічна сова)',
        late: '🌌 01:00 – 10:00 (Пізній)',
        custom: '✍️ Вказати свій час'
      }
      : {
        early: '🌅 22:00 – 07:00 (Ранний)',
        standard: '🌙 23:00 – 08:00 (Стандартный)',
        nightOwl: '🦉 00:00 – 09:00 (Сова)',
        late: '🌌 01:00 – 10:00 (Поздний)',
        custom: '✍️ Задать своё время'
      };

  return Markup.inlineKeyboard([
    [Markup.button.callback(presetLabels.early, 'settings:quiet_hours:preset:22:7')],
    [Markup.button.callback(presetLabels.standard, 'settings:quiet_hours:preset:23:8')],
    [Markup.button.callback(presetLabels.nightOwl, 'settings:quiet_hours:preset:0:9')],
    [Markup.button.callback(presetLabels.late, 'settings:quiet_hours:preset:1:10')],
    [Markup.button.callback(presetLabels.custom, 'settings:quiet_hours:custom')],
    [Markup.button.callback(buttons.BACK, 'settings:menu')]
  ]);
};
