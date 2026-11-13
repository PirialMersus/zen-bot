import { Markup } from 'telegraf';
import { getButtons } from '../constants/buttons.js';
import { DEFAULT_TIMEZONE } from '../constants/timezones.js';

export const settingsKeyboard = (enabled, language = 'ru', userPreferences = {}) => {
  const buttons = getButtons(language);

  const startHourFormatted = String(userPreferences.quietHours?.start ?? 23).padStart(2, '0');
  const endHourFormatted = String(userPreferences.quietHours?.end ?? 8).padStart(2, '0');
  const quietHoursFormattedRange = `${startHourFormatted}:00–${endHourFormatted}:00`;

  const quietHoursScheduleBaseText = buttons.QUIET_HOURS_SCHEDULE;
  const quietHoursScheduleLabel = `${quietHoursScheduleBaseText} (${quietHoursFormattedRange})`;

  const userTimezoneValue = userPreferences.timezone || DEFAULT_TIMEZONE;
  const timezoneButtonLabel = `${buttons.TIMEZONE} (${userTimezoneValue})`;

  const localizedLanguageNames = {
    ru: '🇷🇺 Русский',
    uk: '🇺🇦 Українська',
    en: '🇬🇧 English',
    es: '🇪🇸 Español'
  };
  const activeLanguageName = localizedLanguageNames[language] || localizedLanguageNames.ru;
  const languageButtonLabel = `${buttons.LANGUAGE} (${activeLanguageName})`;

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
        timezoneButtonLabel,
        'settings:timezone'
      )
    ],
    [
      Markup.button.callback(
        languageButtonLabel,
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
