// src/keyboard/settings.js
import { Markup } from 'telegraf';
import { BUTTONS } from '../constants/buttons.js';

export const settingsKeyboard = enabled =>
  Markup.inlineKeyboard([
    [
      Markup.button.callback(
        enabled ? BUTTONS.QUIET_OFF : BUTTONS.QUIET_ON,
        'settings:quiet_toggle'
      )
    ],
    [
      Markup.button.callback(
        BUTTONS.BACK,
        'settings:back'
      )
    ]
  ]);
