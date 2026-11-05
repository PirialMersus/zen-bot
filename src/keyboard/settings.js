import { Markup } from 'telegraf';
import { getButtons } from '../constants/buttons.js';

export const settingsKeyboard = (enabled, language = 'ru') => {
  const buttons = getButtons(language);
  const quietHoursScheduleLabel = language === 'en' ? '⏰ Quiet hours schedule' : '⏰ Время тихих часов';

  return Markup.inlineKeyboard([
    [
      Markup.button.callback(
        enabled ? buttons.QUIET_OFF : buttons.QUIET_ON,
        'settings:quiet_toggle'
      )
    ],
    [
      Markup.button.callback(
        quietHoursScheduleLabel,
        'settings:quiet_hours:menu'
      )
    ],
    [
      Markup.button.callback(
        buttons.TIMEZONE,
        'settings:timezone'
      )
    ],
    [
      Markup.button.callback(
        buttons.LANGUAGE,
        'settings:language'
      )
    ],
    [
      Markup.button.callback(
        buttons.BACK,
        'settings:back'
      )
    ]
  ]);
};
