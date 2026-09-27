import {Markup} from 'telegraf';
import {BUTTONS} from "../constants/buttons.js";
import {UI} from "../constants/ui.js";

export const mainKeyboard = ctx => {
  const isAdmin = String(ctx.from.id) === process.env.CREATOR_ID;

  const rows = [
    [BUTTONS.REMINDERS, BUTTONS.POINTER],
    [BUTTONS.SUPPORT, BUTTONS.SETTINGS]
  ];

  if (isAdmin) {
    rows.push([UI.ADMIN_ACTIVE_USERS]);
  }

  return Markup.keyboard(rows).resize();
};
