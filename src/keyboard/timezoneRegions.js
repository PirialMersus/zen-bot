// src/keyboard/timezoneRegions.js
import { Markup } from 'telegraf';
import { TIMEZONE_REGIONS } from '../constants/timezones.js';
import { BUTTONS } from '../constants/buttons.js';

export const timezoneRegionsKeyboard = Markup.inlineKeyboard([
  ...Object.entries(TIMEZONE_REGIONS).map(([key, r]) => [
    Markup.button.callback(r.label, `timezone:region:${key}`)
  ]),
  [Markup.button.callback(BUTTONS.BACK, 'settings:back')]
]);
