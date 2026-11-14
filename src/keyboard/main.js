import { Markup } from 'telegraf';
import { getButtons } from '../constants/buttons.js';
import { getUi } from '../constants/ui.js';
import { isAdministratorContext } from '../utils/admin.js';

export const mainKeyboard = (ctx, explicitLanguage = null) => {
  const userLanguage = explicitLanguage || ctx?.state?.userLanguage || 'ru';
  const buttons = getButtons(userLanguage);
  const ui = getUi(userLanguage);
  const isAdministrator = isAdministratorContext(ctx);

  const rows = [
    [buttons.REMINDERS, buttons.POINTER],
    [buttons.SUPPORT, buttons.SETTINGS]
  ];

  if (isAdministrator) {
    rows.push([ui.ADMIN_ACTIVE_USERS, ui.ADMIN_BROADCAST]);
  }

  return Markup.keyboard(rows).resize();
};
