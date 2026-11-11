import { Markup } from 'telegraf';

export const getSupportInlineKeyboard = (language = 'ru') => {
  const isEnglish = language === 'en';
  const isUkrainian = language === 'uk';
  const isSpanish = language === 'es';

  const supportButtonLabel = isEnglish
    ? '💬 Support (@pirial_mersus)'
    : (isUkrainian
      ? '💬 Підтримка (@pirial_mersus)'
      : (isSpanish ? '💬 Soporte (@pirial_mersus)' : '💬 Поддержка (@pirial_mersus)'));

  const communityButtonLabel = isEnglish
    ? '👥 Telegram Community (@dzenline)'
    : (isUkrainian
      ? '👥 Telegram Спільнота (@dzenline)'
      : (isSpanish ? '👥 Telegram Сообщество (@dzenline)' : '👥 Telegram Сообщество (@dzenline)'));

  const appreciationButtonLabel = isEnglish
    ? '❤️ Say Thanks (@Streamline6)'
    : (isUkrainian
      ? '❤️ Подякувати (@Streamline6)'
      : (isSpanish ? '❤️ Dar gracias (@Streamline6)' : '❤️ Сказать спасибо (@Streamline6)'));

  return Markup.inlineKeyboard([
    [Markup.button.url(supportButtonLabel, 'https://t.me/pirial_mersus')],
    [Markup.button.url(communityButtonLabel, 'https://t.me/dzenline')],
    [Markup.button.url(appreciationButtonLabel, 'https://t.me/Streamline6')]
  ]);
};
