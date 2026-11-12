import User from '../../models/User.js';
import Reminder from '../../models/Reminder.js';
import { getQuietEndDate } from '../../services/quietHours.js';
import { quietHoursKeyboard } from '../../keyboard/quietHours.js';
import { resolveUserLanguage } from '../../middlewares/activity.js';
import { renderSettings, handleSettings } from './general.js';
import { handleTimezoneMenu, handleTimezoneRegion, handleTimezoneSet } from './timezone.js';
import { handleLanguageMenu, handleLanguageSet } from './language.js';

export {
  renderSettings,
  handleSettings,
  handleTimezoneMenu,
  handleTimezoneRegion,
  handleTimezoneSet,
  handleLanguageMenu,
  handleLanguageSet
};

export const handleQuietHoursMenu = async ctx => {
  const userLanguage = await resolveUserLanguage(ctx);
  await ctx.answerCbQuery().catch(() => {});
  await ctx.deleteMessage().catch(() => {});

  const promptText = userLanguage === 'en'
    ? '🌙 <b>Quiet hours schedule</b>\n\nChoose a preset or set custom hours:'
    : userLanguage === 'uk'
      ? '🌙 <b>Розклад тихих годин</b>\n\nОберіть готовий інтервал або вкажіть свій:'
      : userLanguage === 'es'
        ? '🌙 <b>Horario de silencio</b>\n\nElige un intervalo o define el tuyo:'
        : '🌙 <b>Расписание тихих часов</b>\n\nВыберите готовый интервал или задайте свой:';

  await ctx.reply(promptText, {
    parse_mode: 'HTML',
    ...quietHoursKeyboard(userLanguage)
  });
};

export const handleQuietHoursSetPreset = async ctx => {
  const userLanguage = await resolveUserLanguage(ctx);
  const callbackSegments = ctx.callbackQuery.data.split(':');
  const startHour = Number(callbackSegments[callbackSegments.length - 2]);
  const endHour = Number(callbackSegments[callbackSegments.length - 1]);

  await User.findOneAndUpdate(
    { telegramId: ctx.from.id },
    {
      'quietHours.start': startHour,
      'quietHours.end': endHour
    },
    { upsert: true }
  );

  const confirmationText = userLanguage === 'en'
    ? `✅ Quiet hours updated:\n⏰ ${startHour}:00–${endHour}:00`
    : userLanguage === 'uk'
      ? `✅ Розклад тихих годин оновлено:\n⏰ ${startHour}:00–${endHour}:00`
      : userLanguage === 'es'
        ? `✅ Horario de silencio actualizado:\n⏰ ${startHour}:00–${endHour}:00`
        : `✅ Расписание тихих часов обновлено:\n⏰ ${startHour}:00–${endHour}:00`;

  await renderSettings(ctx, confirmationText);
};

export const handleQuietHoursCustomPrompt = async ctx => {
  const userLanguage = await resolveUserLanguage(ctx);
  await ctx.answerCbQuery().catch(() => {});
  await ctx.deleteMessage().catch(() => {});

  ctx.session ??= {};
  ctx.session.isSettingCustomQuietHours = true;

  const promptText = userLanguage === 'en'
    ? '✍️ Enter quiet hours as <code>START-END</code> (e.g. <code>23-8</code> or <code>22:00-07:00</code>):'
    : userLanguage === 'uk'
      ? '✍️ Введіть години тиші у форматі <code>ПОЧАТОК-КІНЕЦЬ</code> (наприклад, <code>23-8</code> або <code>22:00-07:00</code>):'
      : userLanguage === 'es'
        ? '✍️ Introduce las horas de silencio en formato <code>INICIO-FIN</code> (ej. <code>23-8</code> o <code>22:00-07:00</code>):'
        : '✍️ Введите часы тишины в формате <code>НАЧАЛО-КОНЕЦ</code> (например, <code>23-8</code> или <code>22:00-07:00</code>):';

  await ctx.reply(promptText, { parse_mode: 'HTML' });
};

export const handleQuietHoursCustomInput = async ctx => {
  if (!ctx.session?.isSettingCustomQuietHours) return false;

  const rawInputText = ctx.message?.text?.trim() || '';
  const parsedTimeMatch = rawInputText.match(/^(\d{1,2})(?::00)?\s*[-–—]\s*(\d{1,2})(?::00)?$/);

  const userLanguage = await resolveUserLanguage(ctx);

  if (!parsedTimeMatch) {
    const errorPrompt = userLanguage === 'en'
      ? '⚠️ Please specify hours in format <code>23-8</code> or <code>22:00-07:00</code>:'
      : userLanguage === 'uk'
        ? '⚠️ Будь ласка, вкажіть години у форматі <code>23-8</code> або <code>22:00-07:00</code>:'
        : userLanguage === 'es'
          ? '⚠️ Por favor, indica las horas en formato <code>23-8</code> o <code>22:00-07:00</code>:'
          : '⚠️ Пожалуйста, укажите часы в формате <code>23-8</code> или <code>22:00-07:00</code>:';
    await ctx.reply(errorPrompt, { parse_mode: 'HTML' });
    return true;
  }

  const startHour = Number(parsedTimeMatch[1]);
  const endHour = Number(parsedTimeMatch[2]);

  if (startHour < 0 || startHour > 23 || endHour < 0 || endHour > 23 || startHour === endHour) {
    const rangeErrorPrompt = userLanguage === 'en'
      ? '⚠️ Hours must be between 0 and 23 and must not match:'
      : userLanguage === 'uk'
        ? '⚠️ Години мають бути від 0 до 23 і не збігатися:'
        : userLanguage === 'es'
          ? '⚠️ Las horas deben estar entre 0 y 23 y no coincidir:'
          : '⚠️ Часы должны быть от 0 до 23 и не совпадать:';
    await ctx.reply(rangeErrorPrompt, { parse_mode: 'HTML' });
    return true;
  }

  ctx.session.isSettingCustomQuietHours = null;

  await User.findOneAndUpdate(
    { telegramId: ctx.from.id },
    {
      'quietHours.start': startHour,
      'quietHours.end': endHour
    },
    { upsert: true }
  );

  const confirmationText = userLanguage === 'en'
    ? `✅ Quiet hours updated:\n⏰ ${startHour}:00–${endHour}:00`
    : userLanguage === 'uk'
      ? `✅ Розклад тихих годин оновлено:\n⏰ ${startHour}:00–${endHour}:00`
      : userLanguage === 'es'
        ? `✅ Horario de silencio actualizado:\n⏰ ${startHour}:00–${endHour}:00`
        : `✅ Расписание тихих часов обновлено:\n⏰ ${startHour}:00–${endHour}:00`;

  await renderSettings(ctx, confirmationText);
  return true;
};

export const handleQuietToggle = async ctx => {
  const user = await User.findOne({ telegramId: ctx.from.id });
  const nextQuietState = !user?.quietHours?.enabled;

  await User.findOneAndUpdate(
    { telegramId: ctx.from.id },
    { 'quietHours.enabled': nextQuietState },
    { upsert: true }
  );

  if (!nextQuietState && user) {
    const currentMoment = new Date();
    const previousQuietUser = {
      ...user.toObject(),
      quietHours: {
        ...user.quietHours,
        enabled: true
      }
    };
    const quietEndDate = getQuietEndDate(previousQuietUser, currentMoment);

    if (quietEndDate > currentMoment) {
      await Reminder.updateMany(
        {
          userId: ctx.from.id,
          isActive: true,
          nextRunAt: { $gt: currentMoment, $lte: quietEndDate }
        },
        {
          $set: { nextRunAt: currentMoment }
        }
      );
    }
  }

  await renderSettings(ctx);
};
