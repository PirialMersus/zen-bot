// src/handlers/pointers.js
import {Markup} from 'telegraf';
import {getRandomPointer} from '../services/pointers.js';
import {intervalKeyboard} from '../keyboard/intervals.js';
import {TEXTS} from '../constants/texts.js';
import {BUTTONS} from '../constants/buttons.js';
import {UI} from '../constants/ui.js';
import Activity from '../models/Activity.js';

const previewText = text =>
  text.length > 60 ? text.slice(0, 57) + '…' : text;

const sendPointer = async ctx => {
  const pointer = await getRandomPointer();
  if (!pointer) {
    await ctx.reply(TEXTS.POINTERS.EMPTY);
    return;
  }

  ctx.session ??= {};
  ctx.session.lastPointerText = pointer.text;

  await Activity.create({
    telegramId: ctx.from.id,
    type: 'pointer:get'
  });

  const text = pointer.source
    ? `${pointer.text}\n\n— ${pointer.source}`
    : pointer.text;

  await ctx.reply(
    text,
    Markup.keyboard([
      [UI.POINTER_TO_REMINDER, UI.POINTER_NEXT],
      [BUTTONS.BACK]
    ]).resize()
  );
};

export const handlePointer = async ctx => {
  await sendPointer(ctx);
};

export const handleNextPointer = async ctx => {
  await sendPointer(ctx);
};

export const handlePointerToReminder = async ctx => {
  const text = ctx.session?.lastPointerText;
  if (!text) return;

  ctx.session.creatingReminder = {
    text,
    fromPointer: true
  };

  const preview = previewText(text);

  await ctx.reply(
    `${TEXTS.REMINDERS.ASK_INTERVAL}\n\n«${preview}»`,
    intervalKeyboard
  );
};
