import { Markup } from 'telegraf';
import { getTexts } from '../constants/texts.js';

export const getSupportInlineKeyboard = (language = 'ru') => {
  const texts = getTexts(language);

  return Markup.inlineKeyboard([
    [Markup.button.url(texts.SUPPORT_DIRECT, 'https://t.me/pirial_mersus')],
    [Markup.button.url(texts.SUPPORT_COMMUNITY, 'https://t.me/dzenline')],
    [Markup.button.url(texts.SUPPORT_THANKS, 'https://t.me/Streamline6')]
  ]);
};
