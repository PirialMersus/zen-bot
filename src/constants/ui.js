const RUSSIAN_UI = {
  POINTER_NEXT: '➡️ Следующий',
  POINTER_NEXT_FAV: '➡️ Следующий ⭐',
  POINTER_FAV_MODE_BADGE: (current, total) => total ? `⭐ Избранные (${current} из ${total})` : '⭐ Режим: Избранное',
  POINTER_TO_REMINDER: '🔔 В напоминание',
  POINTER_RANDOM: '🎲 Случайный',
  POINTER_FAVORITE: '⭐ Из избранного',
  POINTER_FAV_ADD: '⭐ В избранное',
  POINTER_FAV_REMOVE: '❌ Из избранного',
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
  POINTER_FAV_REMOVE: '❌ Remove from favorites',
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

export const UI = {
  ...RUSSIAN_UI,
  ru: RUSSIAN_UI,
  en: ENGLISH_UI
};

export const getUi = (language = 'ru') =>
  language === 'en' ? ENGLISH_UI : RUSSIAN_UI;
