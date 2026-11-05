import { Markup } from 'telegraf';
import { TIMEZONE_REGIONS } from '../constants/timezones.js';
import { getButtons } from '../constants/buttons.js';

export const getTimezoneRegionsKeyboard = (language = 'ru') => {
  const buttons = getButtons(language);

  return Markup.inlineKeyboard([
    ...Object.entries(TIMEZONE_REGIONS).map(([key, regionItem]) => [
      Markup.button.callback(regionItem.label, `timezone:region:${key}`)
    ]),
    [Markup.button.callback(buttons.BACK, 'settings:menu')]
  ]);
};

export const timezoneRegionsKeyboard = getTimezoneRegionsKeyboard('ru');
