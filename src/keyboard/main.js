import { Markup } from 'telegraf';
import { getButtons } from '../constants/buttons.js';
import { UI } from '../constants/ui.js';

export const mainKeyboard = (ctx, explicitLanguage = null) => {
  const userLanguage = explicitLanguage || ctx?.state?.userLanguage || 'ru';
  const buttons = getButtons(userLanguage);
  const telegramUserId = ctx?.from?.id || ctx?.callbackQuery?.from?.id;
  const isAdministrator = String(telegramUserId) === process.env.CREATOR_ID;

  const rows = [
    [buttons.REMINDERS, buttons.POINTER],
    [buttons.SUPPORT, buttons.SETTINGS]
  ];

  if (isAdministrator) {
    rows.push([UI.ADMIN_ACTIVE_USERS, UI.ADMIN_BROADCAST]);
  }

  return Markup.keyboard(rows).resize();
};
