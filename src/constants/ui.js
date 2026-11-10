const RUSSIAN_UI = {
  POINTER_NEXT: '➡️ Следующий',
  POINTER_NEXT_FAV: '➡️ Следующий ⭐',
  POINTER_FAV_MODE_BADGE: (current, total) => total ? `⭐ Избранные (${current} из ${total})` : '⭐ Режим: Избранное',
  POINTER_TO_REMINDER: '🔔 В напоминание',
  POINTER_RANDOM: '🎲 Случайный',
  POINTER_FAVORITE: '⭐ Из избранного',
  POINTER_FAV_ADD: '⭐ В избранное',
  POINTER_FAV_REMOVE: '✖️ Из избранного',
  POINTER_SHARE: '📤 Переслать',
  POINTER_EXPIRE_BADGE: seconds => `⏳ Исчезнет через ${seconds} сек`,
  POINTER_KEEP_BUTTON: seconds => `⏳ Не удалять (${seconds}с)`,
  POINTER_KEEP_FULL_BUTTON: seconds => `⏳ Не удалять (${seconds}с)`,
  POINTER_KEEP_TOAST: '⏳ Автоудаление отменено',
  POINTER_TO_MENU: '⬅️ В меню',

  REMINDER_CREATE: '➕ Создать',
  REMINDER_MY: '📋 Список',
  REMINDER_RANDOM: '🎲 Случайный',
  REMINDER_FAVORITE: '⭐ Из избранного',

  INTERVAL_5: 'Каждые 5 минут',
  INTERVAL_15: 'Каждые 15 минут',
  INTERVAL_60: 'Каждый час',
  INTERVAL_1440: 'Раз в день',

  CONFIRM_YES: '✅ Да',
  CONFIRM_NO: '❌ Нет',
  ADMIN_ACTIVE_USERS: '👥 Пользователи',
  ADMIN_BROADCAST: '📢 Рассылка',
  SUPPORT: '🛠 Техподдержка',
  TIMEZONE: '🌍 Часовой пояс'
};

const ENGLISH_UI = {
  POINTER_NEXT: '➡️ Next',
  POINTER_NEXT_FAV: '➡️ Next ⭐',
  POINTER_FAV_MODE_BADGE: (current, total) => total ? `⭐ Favorites (${current} of ${total})` : '⭐ Mode: Favorites',
  POINTER_TO_REMINDER: '🔔 To reminder',
  POINTER_RANDOM: '🎲 Random',
  POINTER_FAVORITE: '⭐ From favorites',
  POINTER_FAV_ADD: '⭐ To favorites',
  POINTER_FAV_REMOVE: '✖️ Remove from favorites',
  POINTER_SHARE: '📤 Forward',
  POINTER_EXPIRE_BADGE: seconds => `⏳ Disappears in ${seconds}s`,
  POINTER_KEEP_BUTTON: seconds => `⏳ Do not delete (${seconds}s)`,
  POINTER_KEEP_FULL_BUTTON: seconds => `⏳ Do not delete (${seconds}s)`,
  POINTER_KEEP_TOAST: '⏳ Auto-delete cancelled',
  POINTER_TO_MENU: '⬅️ To menu',

  REMINDER_CREATE: '➕ Create',
  REMINDER_MY: '📋 List',
  REMINDER_RANDOM: '🎲 Random',
  REMINDER_FAVORITE: '⭐ From favorites',

  INTERVAL_5: 'Every 5 minutes',
  INTERVAL_15: 'Every 15 minutes',
  INTERVAL_60: 'Every hour',
  INTERVAL_1440: 'Once a day',

  CONFIRM_YES: '✅ Yes',
  CONFIRM_NO: '❌ No',
  ADMIN_ACTIVE_USERS: '👥 Users',
  ADMIN_BROADCAST: '📢 Broadcast',
  SUPPORT: '🛠 Support',
  TIMEZONE: '🌍 Timezone'
};

const UKRAINIAN_UI = {
  POINTER_NEXT: '➡️ Наступний',
  POINTER_NEXT_FAV: '➡️ Наступний ⭐',
  POINTER_FAV_MODE_BADGE: (current, total) => total ? `⭐ Обрані (${current} з ${total})` : '⭐ Режим: Обране',
  POINTER_TO_REMINDER: '🔔 У нагадування',
  POINTER_RANDOM: '🎲 Випадковий',
  POINTER_FAVORITE: '⭐ З обраного',
  POINTER_FAV_ADD: '⭐ До обраного',
  POINTER_FAV_REMOVE: '✖️ З обраного',
  POINTER_SHARE: '📤 Переслати',
  POINTER_EXPIRE_BADGE: seconds => `⏳ Зникне через ${seconds} сек`,
  POINTER_KEEP_BUTTON: seconds => `⏳ Не видаляти (${seconds}с)`,
  POINTER_KEEP_FULL_BUTTON: seconds => `⏳ Не видаляти (${seconds}с)`,
  POINTER_KEEP_TOAST: '⏳ Автовидалення скасовано',
  POINTER_TO_MENU: '⬅️ До меню',

  REMINDER_CREATE: '➕ Створити',
  REMINDER_MY: '📋 Список',
  REMINDER_RANDOM: '🎲 Випадковий',
  REMINDER_FAVORITE: '⭐ З обраного',

  INTERVAL_5: 'Кожні 5 хвилин',
  INTERVAL_15: 'Кожні 15 хвилин',
  INTERVAL_60: 'Щогодини',
  INTERVAL_1440: 'Раз на день',

  CONFIRM_YES: '✅ Так',
  CONFIRM_NO: '❌ Ні',
  ADMIN_ACTIVE_USERS: '👥 Користувачі',
  ADMIN_BROADCAST: '📢 Розсилка',
  SUPPORT: '🛠 Техпідтримка',
  TIMEZONE: '🌍 Часовий пояс'
};

const SPANISH_UI = {
  POINTER_NEXT: '➡️ Siguiente',
  POINTER_NEXT_FAV: '➡️ Siguiente ⭐',
  POINTER_FAV_MODE_BADGE: (current, total) => total ? `⭐ Favoritos (${current} de ${total})` : '⭐ Modo: Favoritos',
  POINTER_TO_REMINDER: '🔔 En recordatorio',
  POINTER_RANDOM: '🎲 Aleatorio',
  POINTER_FAVORITE: '⭐ De favoritos',
  POINTER_FAV_ADD: '⭐ A favoritos',
  POINTER_FAV_REMOVE: '✖️ Quitar de favoritos',
  POINTER_SHARE: '📤 Reenviar',
  POINTER_EXPIRE_BADGE: seconds => `⏳ Desaparece en ${seconds}s`,
  POINTER_KEEP_BUTTON: seconds => `⏳ No eliminar (${seconds}s)`,
  POINTER_KEEP_FULL_BUTTON: seconds => `⏳ No eliminar (${seconds}s)`,
  POINTER_KEEP_TOAST: '⏳ Autoeliminación cancelada',
  POINTER_TO_MENU: '⬅️ Al menú',

  REMINDER_CREATE: '➕ Crear',
  REMINDER_MY: '📋 Lista',
  REMINDER_RANDOM: '🎲 Aleatorio',
  REMINDER_FAVORITE: '⭐ De favoritos',

  INTERVAL_5: 'Cada 5 minutos',
  INTERVAL_15: 'Cada 15 minutos',
  INTERVAL_60: 'Cada hora',
  INTERVAL_1440: 'Una vez al día',

  CONFIRM_YES: '✅ Sí',
  CONFIRM_NO: '❌ No',
  ADMIN_ACTIVE_USERS: '👥 Usuarios',
  ADMIN_BROADCAST: '📢 Difusión',
  SUPPORT: '🛠 Soporte',
  TIMEZONE: '🌍 Zona horaria'
};

export const UI = {
  ...RUSSIAN_UI,
  ru: RUSSIAN_UI,
  en: ENGLISH_UI,
  uk: UKRAINIAN_UI,
  es: SPANISH_UI
};

export const getUi = (language = 'ru') => {
  if (language === 'en') return ENGLISH_UI;
  if (language === 'uk') return UKRAINIAN_UI;
  if (language === 'es') return SPANISH_UI;
  return RUSSIAN_UI;
};
