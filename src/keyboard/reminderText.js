// src/keyboard/reminderText.js
import { Markup } from 'telegraf';
import { UI } from '../constants/ui.js';

export const reminderTextKeyboard = texts => {
  const rows = [[UI.REMINDER_RANDOM]];
  const unique = [...new Set((texts || []).map(t => t.trim()).filter(Boolean))];

  for (let i = 0; i < unique.length; i += 2) {
    rows.push(unique.slice(i, i + 2));
  }

  rows.push(['⬅️ Назад']);

  return Markup.keyboard(rows).resize();
};
