import { Markup } from 'telegraf';
import { getButtons } from '../constants/buttons.js';

export const languageSelectionKeyboard = (language = 'ru') => {
  const buttons = getButtons(language);

  return Markup.inlineKeyboard([
    [
      Markup.button.callback('🇷🇺 Русский', 'settings:language:set:ru'),
      Markup.button.callback('🇬🇧 English', 'settings:language:set:en')
    ],
    [
      Markup.button.callback('🇺🇦 Українська', 'settings:language:set:uk'),
      Markup.button.callback('🇪🇸 Español', 'settings:language:set:es')
    ],
    [
      Markup.button.callback(buttons.BACK, 'settings:language:back')
    ]
  ]);
};
