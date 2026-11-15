const RUSSIAN_TEXTS = {
  MENU: {
    START: `👋 Привет!

Я — бот для осознанности и выработки привычек.
Буду напоминать о том, что важно.

🧘‍♀️ «Указатели» — короткие карточки осознанности по кнопке в любой момент
⏳ Своё напоминание — текст, 📷 фото или 🎬 видео с любой частотой

🐈️ Зайди в настройки и выбери свой часовой пояс
`,
    MAIN: 'Главное меню',
    SETTINGS: 'Настройки:',
    REMINDERS: 'Управление напоминаниями 👇',
    HELP: `📖 Справка по боту:

🧘‍♀️ «Указатели» — карточки осознанности
⏳ «Напоминания» — создание и управление напоминаниями
⚙️ «Настройки» — часовой пояс, тихие часы и язык

💡 Чтобы создать напоминание, нажми «⏳ Напоминания» ➡️ «➕ Создать». Можно указать интервал в минутах или точное время (например, 09:00).`
  },

  POINTERS: {
    MENU_LABEL: '🧘 Указатели',
    EMPTY: 'Пока нет указателей.',
    FAVORITE_EMPTY: 'У тебя пока нет избранных указателей. Читая случайные указатели, нажимай «⭐ В избранное», чтобы сохранить понравившиеся.',
    FAVORITE_ADDED: 'Добавлено в избранное ⭐',
    FAVORITE_REMOVED: 'Удалено из избранного',
    FAVORITE_REMINDER_EMPTY: 'У тебя пока нет избранных указателей. Сначала добавь понравившиеся указатели в избранное.',
    FAVORITE_BADGE_INFO: 'Ты просматриваешь своё личное избранное ⭐',
    EXPIRE_BADGE_INFO: '⏳ Это сообщение автоматически исчезнет. Нажми «⭐ В избранное», чтобы сохранить его.',
    FAVORITE_TOAST: (current, total) => total ? `⭐ Избранное: ${current} из ${total}` : '⭐ Режим: Избранное'
  },

  REMINDERS: {
    NONE: 'У тебя нет напоминаний.',
    CREATED: 'Готово. Напоминание создано.',
    ASK_TEXT: 'Что будет приходить в напоминании?',
    ASK_TEXT_SUBTITLE: '✍️ Введи текст, выбери из предложенных или отправь 📷 фото / 🎬 видео',
    ASK_INTERVAL: 'Как часто напоминать:',
    ASK_INTERVAL_HINT: '⌨️ Можно выбрать кнопкой или ввести количество минут цифрами (или время, например 09:00)',
    ASK_DELETE_AFTER: '🗑 Автоудаление напоминания',
    ASK_DELETE_AFTER_HINT: '⌨️ Можно выбрать кнопкой или ввести количество секунд цифрами',
    MIN_INTERVAL: 'Минимум — 1 минута',
    MAX_INTERVAL: '⚠️ Максимальный интервал — 525 600 минут (1 год). Введи меньшее число минут.',
    LIMIT_REACHED: '⚠️ Достигнут лимит напоминаний (максимум 100). Удали неактуальные, чтобы создать новое.',
    INVALID_SECONDS: '⌨️ Введи количество секунд цифрами',
    CONFIRM_STATUS: 'Ты точно хочешь изменить статус напоминания?',
    NOT_FOUND: 'Напоминание не найдено',
    STATUS_UPDATED: 'Статус изменен',
    DELETED: 'Напоминание удалено',
    CONFIRM_DELETE_BUTTON: '🗑 Подтвердить',
    CANCEL_DELETE_BUTTON: '❌ Отмена',
    TEXT_TOO_LONG: '⚠️ Текст напоминания слишком длинный (максимум 4000 символов).',
    PHOTO_FALLBACK: '📷 Фотография',
    PHOTO_PREFIX: '📷 Фото',
    VIDEO_PREFIX: '🎬 Видео',
    AUTO_DELETE_DEFAULT_LABEL: 'автоудаление: через 10 сек',
    AUTO_DELETE_CUSTOM_PREFIX: 'автоудаление'
  },

  STATUS: {
    ACTIVE: '🟢 Активно',
    PAUSED: '⏸️ Пауза'
  },

  SETTINGS: {
    LANGUAGE_TITLE: '🌐 Выберите язык / Select language / Оберіть мову / Elige idioma:',
    LANGUAGE_CHANGED: '✅ Язык изменён на Русский',
    CUSTOMIZE_PROMPT: 'Нажми на нужный пункт для изменения:',
    TIMEZONE_REGION_PROMPT: '🌍 Выберите регион:',
    TIMEZONE_CITY_PROMPT: () => `🌍 Выберите город:`,
    TIMEZONE_SET: tz => `✅ Часовой пояс установлен:\n🌍 ${tz}`,
    QUIET_MENU_PROMPT: '🔕 <b>Расписание тихих часов</b>\n\nВ этот период напоминания не будут приходить.',
    QUIET_SET_PRESET: (start, end) => `✅ Часы тишины установлены: <b>${start}:00–${end}:00</b>`,
    QUIET_CUSTOM_PROMPT: '✍️ Введи часы тишины в формате <code>НАЧАЛО-КОНЕЦ</code> (например, <code>23-8</code> или <code>22:00-07:00</code>):',
    QUIET_CUSTOM_ERROR: '⚠️ Пожалуйста, укажите часы в формате <code>23-8</code> или <code>22:00-07:00</code>:',
    QUIET_RANGE_ERROR: '⚠️ Часы должны быть от 0 до 23 и не совпадать:',
    QUIET_CUSTOM_SUCCESS: (start, end) => `✅ Часы тишины установлены: <b>${start}:00 - ${end}:00</b>`,
    QUIET_PRESETS: {
      early: '🌅 22:00 – 07:00 (Ранний)',
      standard: '🌙 23:00 – 08:00 (Стандартный)',
      nightOwl: '🦉 00:00 – 09:00 (Сова)',
      late: '🌌 01:00 – 10:00 (Поздний)',
      custom: '✍️ Задать своё время'
    },
    QUIET_STATUS: (enabled, range) =>
      enabled
        ? `🔕 Включены (${range})`
        : `🔔 Выключены (${range})`
  },

  SUPPORT: `Техподдержка, обратная связь и пожелания:
👉 @pirial_mersus

Группа в Telegram: @dzenline

Если захочешь поблагодарить за бота или поддержать проект материально — напиши @Streamline6 ❤️`,

  SUPPORT_DIRECT: '💬 Поддержка (@pirial_mersus)',
  SUPPORT_COMMUNITY: '👥 Telegram Сообщество (@dzenline)',
  SUPPORT_THANKS: '❤️ Сказать спасибо (@Streamline6)',

  AUTH: {
    USER_NOT_FOUND: '❌ Ошибка: пользователь не найден',
    CODE_MESSAGE: code => `🔐 Твой код для входа в приложение:\n\n<code>${code}</code>\n\n⏱ Код действителен 10 минут.\nВведи его в приложении для авторизации.`,
    GET_NEW_CODE_BUTTON: '🔄 Получить новый код',
    GENERIC_ERROR: '❌ Произошла ошибка. Попробуй позже.'
  },

  FEEDBACK_SUCCESS: '✅ Твоё сообщение передано администратору. Большое спасибо за обратную связь!',

  INTERVALS: {
    OPTIONS: ['10 сек', '30 сек', '1 мин', 'Не удалять'],
    MAP: { '10 сек': 10, '30 сек': 30, '1 мин': 60 }
  }
};

const ENGLISH_TEXTS = {
  MENU: {
    START: `👋 Hello!

I am a bot for mindfulness and building habits.
I will remind you about what truly matters.

🧘‍♀️ "Pointers" — short mindfulness cards anytime at the click of a button
⏳ Custom reminder — text, 📷 photo, or 🎬 video at any frequency

🐈️ Go to settings and choose your timezone
`,
    MAIN: 'Main menu',
    SETTINGS: 'Settings:',
    REMINDERS: 'Manage reminders 👇',
    HELP: `📖 Bot help:

🧘‍♀️ "Pointers" — mindfulness cards
⏳ "Reminders" — create and manage reminders
⚙️ "Settings" — timezone, quiet hours, and language

💡 To create a reminder, press "⏳ Reminders" ➡️ "➕ Create". You can set interval in minutes or exact daily time (e.g., 09:00).`
  },

  POINTERS: {
    MENU_LABEL: '🧘 Pointers',
    EMPTY: 'No pointers yet.',
    FAVORITE_EMPTY: 'You have no favorite pointers yet. While reading pointers, click "⭐ To favorites" to save them.',
    FAVORITE_ADDED: 'Added to favorites ⭐',
    FAVORITE_REMOVED: 'Removed from favorites',
    FAVORITE_REMINDER_EMPTY: 'You have no favorite pointers yet. First add pointers to your favorites.',
    FAVORITE_BADGE_INFO: 'You are browsing your personal favorites ⭐',
    EXPIRE_BADGE_INFO: '⏳ This message will disappear automatically. Click "⭐ To favorites" to save it.',
    FAVORITE_TOAST: (current, total) => total ? `⭐ Favorites: ${current} of ${total}` : '⭐ Mode: Favorites'
  },

  REMINDERS: {
    NONE: 'You have no reminders.',
    CREATED: 'Done. Reminder created.',
    ASK_TEXT: 'What should the reminder say?',
    ASK_TEXT_SUBTITLE: '✍️ Type text, choose from suggestions or send 📷 photo / 🎬 video',
    ASK_INTERVAL: 'How often to remind:',
    ASK_INTERVAL_HINT: '⌨️ You can select with a button, enter minutes or time (e.g., 09:00)',
    ASK_DELETE_AFTER: '🗑 Auto-delete reminder',
    ASK_DELETE_AFTER_HINT: '⌨️ You can select with a button or type the number of seconds',
    MIN_INTERVAL: 'Minimum — 1 minute',
    MAX_INTERVAL: '⚠️ Maximum interval is 525,600 minutes (1 year). Enter a smaller number of minutes.',
    LIMIT_REACHED: '⚠️ Reminder limit reached (maximum 100). Delete old ones to create a new one.',
    INVALID_SECONDS: '⌨️ Enter the number of seconds as digits',
    CONFIRM_STATUS: 'Are you sure you want to change the reminder status?',
    NOT_FOUND: 'Reminder not found',
    STATUS_UPDATED: 'Status updated',
    DELETED: 'Reminder deleted',
    CONFIRM_DELETE_BUTTON: '🗑 Confirm',
    CANCEL_DELETE_BUTTON: '❌ Cancel',
    TEXT_TOO_LONG: '⚠️ Reminder text is too long (maximum 4000 characters).',
    PHOTO_FALLBACK: '📷 Photo',
    PHOTO_PREFIX: '📷 Photo',
    VIDEO_PREFIX: '🎬 Video',
    AUTO_DELETE_DEFAULT_LABEL: 'auto-delete: in 10 sec',
    AUTO_DELETE_CUSTOM_PREFIX: 'auto-delete'
  },

  STATUS: {
    ACTIVE: '🟢 Active',
    PAUSED: '⏸️ Paused'
  },

  SETTINGS: {
    LANGUAGE_TITLE: '🌐 Выберите язык / Select language / Оберіть мову / Elige idioma:',
    LANGUAGE_CHANGED: '✅ Language switched to English',
    CUSTOMIZE_PROMPT: 'Tap an option below to customize:',
    TIMEZONE_REGION_PROMPT: '🌍 Select region:',
    TIMEZONE_CITY_PROMPT: () => `🌍 Select city:`,
    TIMEZONE_SET: tz => `✅ Timezone set:\n🌍 ${tz}`,
    QUIET_MENU_PROMPT: '🔕 <b>Quiet hours</b>\n\nDuring this period, reminders will not be sent.',
    QUIET_SET_PRESET: (start, end) => `✅ Quiet hours set: <b>${start}:00–${end}:00</b>`,
    QUIET_CUSTOM_PROMPT: '✍️ Enter quiet hours as <code>START-END</code> (e.g. <code>23-8</code> or <code>22:00-07:00</code>):',
    QUIET_CUSTOM_ERROR: '⚠️ Please specify hours in format <code>23-8</code> or <code>22:00-07:00</code>:',
    QUIET_RANGE_ERROR: '⚠️ Hours must be between 0 and 23 and must not match:',
    QUIET_CUSTOM_SUCCESS: (start, end) => `✅ Custom quiet hours set: <b>${start}:00 - ${end}:00</b>`,
    QUIET_PRESETS: {
      early: '🌅 22:00 – 07:00 (Early)',
      standard: '🌙 23:00 – 08:00 (Standard)',
      nightOwl: '🦉 00:00 – 09:00 (Night Owl)',
      late: '🌌 01:00 – 10:00 (Late)',
      custom: '✍️ Custom schedule'
    },
    QUIET_STATUS: (enabled, range) =>
      enabled
        ? `🔕 Enabled (${range})`
        : `🔔 Disabled (${range})`
  },

  SUPPORT: `Support, feedback & suggestions:
👉 @pirial_mersus

Telegram community: @dzenline

If you would like to say thanks for the bot or support the project financially - message @Streamline6 ❤️`,

  SUPPORT_DIRECT: '💬 Support (@pirial_mersus)',
  SUPPORT_COMMUNITY: '👥 Telegram Community (@dzenline)',
  SUPPORT_THANKS: '❤️ Say Thanks (@Streamline6)',

  AUTH: {
    USER_NOT_FOUND: '❌ Error: user not found',
    CODE_MESSAGE: code => `🔐 Your code to sign in to the app:\n\n<code>${code}</code>\n\n⏱ The code is valid for 10 minutes.\nEnter it in the app to sign in.`,
    GET_NEW_CODE_BUTTON: '🔄 Get new code',
    GENERIC_ERROR: '❌ An error occurred. Please try again later.'
  },

  FEEDBACK_SUCCESS: '✅ Your message has been forwarded to the administrator. Thank you for your feedback!',

  INTERVALS: {
    OPTIONS: ['10 sec', '30 sec', '1 min', 'Do not delete'],
    MAP: { '10 sec': 10, '30 sec': 30, '1 min': 60 }
  }
};

const UKRAINIAN_TEXTS = {
  MENU: {
    START: `👋 Привіт!

Я — бот для усвідомленості та вироблення звичок.
Я нагадуватиму про те, що важливо.

🧘‍♀️ «Вказівники» — короткі картки усвідомленості за кнопкою в будь-який момент
⏳ Власне нагадування — текст, 📷 фото або 🎬 відео з будь-якою частотою

🐈️ Зайди в налаштування та обери свій часовий пояс
`,
    MAIN: 'Головне меню',
    SETTINGS: 'Налаштування:',
    REMINDERS: 'Керування нагадуваннями 👇',
    HELP: `📖 Довідка по боту:

🧘‍♀️ «Вказівники» — картки усвідомленості
⏳ «Нагадування» — створення та керування нагадуваннями
⚙️ «Налаштування» — часовий пояс, тихі години та мова

💡 Щоб створити нагадування, натисни «⏳ Нагадування» ➡️ «➕ Створити». Можна вказати інтервал у хвилинах або точний час (наприклад, 09:00).`
  },

  POINTERS: {
    MENU_LABEL: '🧘 Вказівники',
    EMPTY: 'Поки немає вказівників.',
    FAVORITE_EMPTY: 'У тебе поки немає обраних вказівників. Читаючи випадкові вказівники, натискай «⭐ До обраного», щоб зберегти ті, що сподобалися.',
    FAVORITE_ADDED: 'Додано до обраного ⭐',
    FAVORITE_REMOVED: 'Вилучено з обраного',
    FAVORITE_REMINDER_EMPTY: 'У тебе поки немає обраних вказівників. Спочатку додай вказівники, що сподобалися, до обраного.',
    FAVORITE_BADGE_INFO: 'Ти переглядаєш своє особисте обране ⭐',
    EXPIRE_BADGE_INFO: '⏳ Це повідомлення автоматично зникне. Натисни «⭐ До обраного», щоб зберегти його.',
    FAVORITE_TOAST: (current, total) => total ? `⭐ Обране: ${current} з ${total}` : '⭐ Режим: Обране'
  },

  REMINDERS: {
    NONE: 'У тебе немає нагадувань.',
    CREATED: 'Готово. Нагадування створено.',
    ASK_TEXT: 'Що приходитиме в нагадуванні?',
    ASK_TEXT_SUBTITLE: '✍️ Введи текст, обери із запропонованих або надішли 📷 фото / 🎬 відео',
    ASK_INTERVAL: 'Як часто нагадувати:',
    ASK_INTERVAL_HINT: '⌨️ Можна вибрати кнопкою, ввести кількість хвилин або час (наприклад, 09:00)',
    ASK_DELETE_AFTER: '🗑 Автовидалення нагадування',
    ASK_DELETE_AFTER_HINT: '⌨️ Можна вибрати кнопкою або ввести кількість секунд цифрами',
    MIN_INTERVAL: 'Мінімум — 1 хвилина',
    MAX_INTERVAL: '⚠️ Максимальний інтервал — 525 600 хвилин (1 рік). Введи меншу кількість хвилин.',
    LIMIT_REACHED: '⚠️ Досягнуто ліміт нагадувань (максимум 100). Видали неактуальні, щоб створити нове.',
    INVALID_SECONDS: '⌨️ Введи кількість секунд цифрами',
    CONFIRM_STATUS: 'Ти дійсно хочеш змінити статус нагадування?',
    NOT_FOUND: 'Нагадування не знайдено',
    STATUS_UPDATED: 'Статус змінено',
    DELETED: 'Нагадування видалено',
    CONFIRM_DELETE_BUTTON: '🗑 Підтвердити',
    CANCEL_DELETE_BUTTON: '❌ Скасувати',
    TEXT_TOO_LONG: '⚠️ Текст нагадування занадто довгий (максимум 4000 символів).',
    PHOTO_FALLBACK: '📷 Фотографія',
    PHOTO_PREFIX: '📷 Фото',
    VIDEO_PREFIX: '🎬 Відео',
    AUTO_DELETE_DEFAULT_LABEL: 'автовидалення: через 10 сек',
    AUTO_DELETE_CUSTOM_PREFIX: 'автовидалення'
  },

  STATUS: {
    ACTIVE: '🟢 Активно',
    PAUSED: '⏸️ Пауза'
  },

  SETTINGS: {
    LANGUAGE_TITLE: '🌐 Выберите язык / Select language / Оберіть мову / Elige idioma:',
    LANGUAGE_CHANGED: '✅ Мову змінено на Українську',
    CUSTOMIZE_PROMPT: 'Обери потрібний пункт для зміни:',
    TIMEZONE_REGION_PROMPT: '🌍 Оберіть регіон:',
    TIMEZONE_CITY_PROMPT: () => `🌍 Оберіть місто:`,
    TIMEZONE_SET: tz => `✅ Часовий пояс встановлено:\n🌍 ${tz}`,
    QUIET_MENU_PROMPT: '🔕 <b>Години тиші</b>\n\nУ цей період нагадування не приходитимуть.',
    QUIET_SET_PRESET: (start, end) => `✅ Години тиші встановлено: <b>${start}:00–${end}:00</b>`,
    QUIET_CUSTOM_PROMPT: '✍️ Введи години тиші у форматі <code>ПОЧАТОК-КІНЕЦЬ</code> (наприклад, <code>23-8</code> або <code>22:00-07:00</code>):',
    QUIET_CUSTOM_ERROR: '⚠️ Будь ласка, вкажи години у форматі <code>23-8</code> або <code>22:00-07:00</code>:',
    QUIET_RANGE_ERROR: '⚠️ Години мають бути від 0 до 23 і не збігатися:',
    QUIET_CUSTOM_SUCCESS: (start, end) => `✅ Години тиші встановлено: <b>${start}:00 - ${end}:00</b>`,
    QUIET_PRESETS: {
      early: '🌅 22:00 – 07:00 (Ранній)',
      standard: '🌙 23:00 – 08:00 (Стандартний)',
      nightOwl: '🦉 00:00 – 09:00 (Нічна сова)',
      late: '🌌 01:00 – 10:00 (Пізній)',
      custom: '✍️ Вказати свій час'
    },
    QUIET_STATUS: (enabled, range) =>
      enabled
        ? `🔕 Увімкнено (${range})`
        : `🔔 Вимкнено (${range})`
  },

  SUPPORT: `Техпідтримка, зворотний зв'язок та побажання:
👉 @pirial_mersus

Група в Telegram: @dzenline

Якщо захочеш подякувати за бота або підтримати проєкт матеріально — напиши @Streamline6 ❤️`,

  SUPPORT_DIRECT: '💬 Підтримка (@pirial_mersus)',
  SUPPORT_COMMUNITY: '👥 Telegram Спільнота (@dzenline)',
  SUPPORT_THANKS: '❤️ Подякувати (@Streamline6)',

  AUTH: {
    USER_NOT_FOUND: '❌ Помилка: користувача не знайдено',
    CODE_MESSAGE: code => `🔐 Твій код для входу в застосунок:\n\n<code>${code}</code>\n\n⏱ Код діє 10 хвилин.\nВведи його в застосунку для авторизації.`,
    GET_NEW_CODE_BUTTON: '🔄 Отримати новий код',
    GENERIC_ERROR: '❌ Сталася помилка. Спробуй пізніше.'
  },

  FEEDBACK_SUCCESS: '✅ Твоє повідомлення передано адміністратору. Щиро дякуємо за зворотний зв’язок!',

  INTERVALS: {
    OPTIONS: ['10 сек', '30 сек', '1 хв', 'Не видаляти'],
    MAP: { '10 сек': 10, '30 сек': 30, '1 хв': 60 }
  }
};

const SPANISH_TEXTS = {
  MENU: {
    START: `👋 ¡Hola!

Soy un bot para la atención plena y el desarrollo de hábitos.
Te recordaré lo que verdaderamente importa.

🧘‍♀️ «Punteros» — tarjetas cortas de atención plena con un botón en cualquier momento
⏳ Recordatorio personalizado — texto, 📷 foto o 🎬 video con cualquier frecuencia

🐈️ Ve a ajustes y elige tu zona horaria
`,
    MAIN: 'Menú principal',
    SETTINGS: 'Ajustes:',
    REMINDERS: 'Gestión de recordatorios 👇',
    HELP: `📖 Ayuda del bot:

🧘‍♀️ «Punteros» — tarjetas de atención plena
⏳ «Recordatorios» — crear y gestionar recordatorios
⚙️ «Ajustes» — zona horaria, horas de silencio e idioma

💡 Para crear un recordatorio, presiona «⏳ Recordatorios» ➡️ «➕ Crear». Puedes indicar el intervalo en minutos o la hora exacta (por ejemplo, 09:00).`
  },

  POINTERS: {
    MENU_LABEL: '🧘 Punteros',
    EMPTY: 'Aún no hay punteros.',
    FAVORITE_EMPTY: 'Aún no tienes punteros favoritos. Al leer punteros aleatorios, pulsa «⭐ A favoritos» para guardar los que te gusten.',
    FAVORITE_ADDED: 'Añadido a favoritos ⭐',
    FAVORITE_REMOVED: 'Eliminado de favoritos',
    FAVORITE_REMINDER_EMPTY: 'Aún no tienes punteros favoritos. Primero añade los punteros que te gusten a favoritos.',
    FAVORITE_BADGE_INFO: 'Estás viendo tus favoritos personales ⭐',
    EXPIRE_BADGE_INFO: '⏳ Este mensaje desaparecerá automáticamente. Haz clic en "⭐ A favoritos" para guardarlo.',
    FAVORITE_TOAST: (current, total) => total ? `⭐ Favoritos: ${current} de ${total}` : '⭐ Modo: Favoritos'
  },

  REMINDERS: {
    NONE: 'No tienes recordatorios.',
    CREATED: 'Listo. Recordatorio creado.',
    ASK_TEXT: '¿Qué mensaje llegará en el recordatorio?',
    ASK_TEXT_SUBTITLE: '✍️ Escribe el texto, elige una sugerencia o envía 📷 foto / 🎬 video',
    ASK_INTERVAL: 'Con qué frecuencia recordar:',
    ASK_INTERVAL_HINT: '⌨️ Puedes elegir con un botón, escribir minutos o una hora (por ejemplo, 09:00)',
    ASK_DELETE_AFTER: '🗑 Autoeliminación del recordatorio',
    ASK_DELETE_AFTER_HINT: '⌨️ Puedes elegir con un botón o escribir la cantidad de segundos en números',
    MIN_INTERVAL: 'Mínimo — 1 minuto',
    MAX_INTERVAL: '⚠️ El intervalo máximo es de 525 600 minutos (1 año). Ingresa un número menor de minutos.',
    LIMIT_REACHED: '⚠️ Límite de recordatorios alcanzado (máximo 100). Elimina los antiguos para crear uno nuevo.',
    INVALID_SECONDS: '⌨️ Introduce la cantidad de segundos en números',
    CONFIRM_STATUS: '¿Seguro que deseas cambiar el estado del recordatorio?',
    NOT_FOUND: 'Recordatorio no encontrado',
    STATUS_UPDATED: 'Estado actualizado',
    DELETED: 'Recordatorio eliminado',
    CONFIRM_DELETE_BUTTON: '🗑 Confirmar',
    CANCEL_DELETE_BUTTON: '❌ Cancelar',
    TEXT_TOO_LONG: '⚠️ El texto del recordatorio es demasiado largo (máximo 4000 caracteres).',
    PHOTO_FALLBACK: '📷 Foto',
    PHOTO_PREFIX: '📷 Foto',
    VIDEO_PREFIX: '🎬 Video',
    AUTO_DELETE_DEFAULT_LABEL: 'autoeliminación: en 10 seg',
    AUTO_DELETE_CUSTOM_PREFIX: 'autoeliminación'
  },

  STATUS: {
    ACTIVE: '🟢 Activo',
    PAUSED: '⏸️ Pausado'
  },

  SETTINGS: {
    LANGUAGE_TITLE: '🌐 Выберите язык / Select language / Оберіть мову / Elige idioma:',
    LANGUAGE_CHANGED: '✅ Idioma cambiado a Español',
    CUSTOMIZE_PROMPT: 'Toca una opción abajo para personalizar:',
    TIMEZONE_REGION_PROMPT: '🌍 Selecciona región:',
    TIMEZONE_CITY_PROMPT: () => `🌍 Selecciona ciudad:`,
    TIMEZONE_SET: tz => `✅ Zona horaria establecida:\n🌍 ${tz}`,
    QUIET_MENU_PROMPT: '🔕 <b>Horas de silencio</b>\n\nDurante este período no se enviarán recordatorios.',
    QUIET_SET_PRESET: (start, end) => `✅ Horas de silencio configuradas: <b>${start}:00–${end}:00</b>`,
    QUIET_CUSTOM_PROMPT: '✍️ Introduce las horas de silencio en formato <code>INICIO-FIN</code> (ej. <code>23-8</code> o <code>22:00-07:00</code>):',
    QUIET_CUSTOM_ERROR: '⚠️ Por favor, indica las horas en formato <code>23-8</code> o <code>22:00-07:00</code>:',
    QUIET_RANGE_ERROR: '⚠️ Las horas deben estar entre 0 y 23 y no coincidir:',
    QUIET_CUSTOM_SUCCESS: (start, end) => `✅ Horas de silencio configuradas: <b>${start}:00 - ${end}:00</b>`,
    QUIET_PRESETS: {
      early: '🌅 22:00 – 07:00 (Temprano)',
      standard: '🌙 23:00 – 08:00 (Estándar)',
      nightOwl: '🦉 00:00 – 09:00 (Noctámbulo)',
      late: '🌌 01:00 – 10:00 (Tardío)',
      custom: '✍️ Horario personalizado'
    },
    QUIET_STATUS: (enabled, range) =>
      enabled
        ? `🔕 Activado (${range})`
        : `🔔 Desactivado (${range})`
  },

  SUPPORT: `Soporte técnico, comentarios y sugerencias:
👉 @pirial_mersus

Comunidad en Telegram: @dzenline

Si deseas agradecer por el bot o apoyar el proyecto económicamente - escribe a @Streamline6 ❤️`,

  SUPPORT_DIRECT: '💬 Soporte (@pirial_mersus)',
  SUPPORT_COMMUNITY: '👥 Comunidad de Telegram (@dzenline)',
  SUPPORT_THANKS: '❤️ Dar gracias (@Streamline6)',

  AUTH: {
    USER_NOT_FOUND: '❌ Error: usuario no encontrado',
    CODE_MESSAGE: code => `🔐 Tu código para iniciar sesión en la aplicación:\n\n<code>${code}</code>\n\n⏱ El código es válido durante 10 minutos.\nIntrodúcelo en la aplicación para iniciar sesión.`,
    GET_NEW_CODE_BUTTON: '🔄 Obtener nuevo código',
    GENERIC_ERROR: '❌ Ocurrió un error. Inténtalo más tarde.'
  },

  FEEDBACK_SUCCESS: '✅ Tu mensaje ha sido enviado al administrador. ¡Muchas gracias por tus comentarios!',

  INTERVALS: {
    OPTIONS: ['10 seg', '30 seg', '1 min', 'No eliminar'],
    MAP: { '10 seg': 10, '30 seg': 30, '1 min': 60 }
  }
};

export const TEXTS = {
  ...RUSSIAN_TEXTS,
  ru: RUSSIAN_TEXTS,
  en: ENGLISH_TEXTS,
  uk: UKRAINIAN_TEXTS,
  es: SPANISH_TEXTS
};

export const getTexts = (language = 'ru') => {
  if (language === 'en') return ENGLISH_TEXTS;
  if (language === 'uk') return UKRAINIAN_TEXTS;
  if (language === 'es') return SPANISH_TEXTS;
  return RUSSIAN_TEXTS;
};

export const DO_NOT_DELETE_TEXTS = [
  RUSSIAN_TEXTS.INTERVALS.OPTIONS[3],
  ENGLISH_TEXTS.INTERVALS.OPTIONS[3],
  UKRAINIAN_TEXTS.INTERVALS.OPTIONS[3],
  SPANISH_TEXTS.INTERVALS.OPTIONS[3]
];

export const isDoNotDeleteText = textValue =>
  DO_NOT_DELETE_TEXTS.includes(typeof textValue === 'string' ? textValue.trim() : '');

export const COMBINED_AUTO_DELETE_MAP = {
  ...RUSSIAN_TEXTS.INTERVALS.MAP,
  ...ENGLISH_TEXTS.INTERVALS.MAP,
  ...UKRAINIAN_TEXTS.INTERVALS.MAP,
  ...SPANISH_TEXTS.INTERVALS.MAP
};
