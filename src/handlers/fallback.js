import { mainKeyboard } from '../keyboard/main.js';
import { resolveUserLanguage } from '../middlewares/activity.js';

export const handleUnknownMessage = async ctx => {
  const userLanguage = await resolveUserLanguage(ctx);
  const fallbackMessages = {
    ru: 'Я не понял это сообщение. Пожалуйста, воспользуйтесь меню ниже 👇',
    en: "I didn't understand that message. Please use the menu below 👇",
    uk: 'Я не зрозумів це повідомлення. Будь ласка, скористайтеся меню нижче 👇',
    es: 'No entendí este mensaje. Por favor, utiliza el menú de abajo 👇'
  };
  const responseText = fallbackMessages[userLanguage] || fallbackMessages.ru;
  await ctx.reply(responseText, mainKeyboard(ctx, userLanguage)).catch(() => {});
};
