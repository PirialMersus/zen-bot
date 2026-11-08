import { Markup } from 'telegraf';
import { getButtons } from '../constants/buttons.js';

export const settingsKeyboard = (enabled, language = 'ru', userPreferences = {}) => {
  const buttons = getButtons(language);

  const startHourFormatted = String(userPreferences.quietHours?.start ?? 23).padStart(2, '0');
  const endHourFormatted = String(userPreferences.quietHours?.end ?? 8).padStart(2, '0');
  const quietHoursFormattedRange = `${startHourFormatted}:00–${endHourFormatted}:00`;

  const quietHoursScheduleBaseText = language === 'en'
    ? '⏰ Quiet hours'
    : language === 'uk'
      ? '⏰ Час тихих годин'
      : '⏰ Время тихих часов';
  const quietHoursScheduleLabel = `${quietHoursScheduleBaseText} (${quietHoursFormattedRange})`;

  const userTimezoneValue = userPreferences.timezone || 'Europe/Minsk';
  const timezoneButtonLabel = `${buttons.TIMEZONE} (${userTimezoneValue})`;

  const localizedLanguageNames = {
    ru: '🇷🇺 Русский',
    uk: '🇺🇦 Українська',
    en: '🇬🇧 English'
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
