// src/keyboard/deleteAfter.js
import { Markup } from 'telegraf';

export const deleteAfterKeyboard = Markup.keyboard([
  ['10 сек', '30 сек'],
  ['1 мин', 'Не удалять'],
  ['⬅️ Назад']
]).resize();
