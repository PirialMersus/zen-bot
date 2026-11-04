const RUSSIAN_UI = {
  POINTER_NEXT: '➡️ Следующий',
  POINTER_TO_REMINDER: '🔔 В напоминание',

  REMINDER_CREATE: '➕ Создать',
  REMINDER_MY: '📋 Список',
  REMINDER_RANDOM: '🎲 Случайный указатель',

  INTERVAL_5: 'Каждые 5 минут',
  INTERVAL_15: 'Каждые 15 минут',
  INTERVAL_60: 'Каждый час',
  INTERVAL_1440: 'Раз в день',

  CONFIRM_YES: '✅ Да',
  CONFIRM_NO: '❌ Нет',
  ADMIN_ACTIVE_USERS: '👥 Активные пользователи',
  ADMIN_BROADCAST: '📢 Рассылка',
  SUPPORT: '🛠 Техподдержка',
  TIMEZONE: '🌍 Часовой пояс'
};

const ENGLISH_UI = {
  POINTER_NEXT: '➡️ Next',
  POINTER_TO_REMINDER: '🔔 To reminder',

  REMINDER_CREATE: '➕ Create',
  REMINDER_MY: '📋 List',
  REMINDER_RANDOM: '🎲 Random pointer',

  INTERVAL_5: 'Every 5 minutes',
  INTERVAL_15: 'Every 15 minutes',
  INTERVAL_60: 'Every hour',
  INTERVAL_1440: 'Once a day',

  CONFIRM_YES: '✅ Yes',
  CONFIRM_NO: '❌ No',
  ADMIN_ACTIVE_USERS: '👥 Активные пользователи',
  ADMIN_BROADCAST: '📢 Рассылка',
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
