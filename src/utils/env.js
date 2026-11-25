import mongoose from 'mongoose';

export const validateApplicationEnvironment = () => {
  if (!process.env.BOT_TOKEN) {
    throw new Error('Критическая ошибка конфигурации: переменная BOT_TOKEN обязательна');
  }
  if (!process.env.MONGO_URI) {
    throw new Error('Критическая ошибка конфигурации: переменная MONGO_URI обязательна');
  }
  if (!process.env.CREATOR_ID) {
    throw new Error('Критическая ошибка конфигурации: переменная CREATOR_ID обязательна');
  }
  if (!process.env.JWT_SECRET) {
    throw new Error('Критическая ошибка конфигурации: переменная JWT_SECRET обязательна');
  }
  if (process.env.JWT_SECRET.length < 32 && process.env.NODE_ENV === 'production') {
    throw new Error(
      'Критическая ошибка конфигурации: переменная JWT_SECRET должна содержать минимум 32 символа'
    );
  }
};

export const validateBotAndDatabaseEnvironmentCompatibility = async (telegramBotInstance) => {
  if (!telegramBotInstance?.telegram?.getMe) {
    return;
  }

  const currentBotProfileInformation = await telegramBotInstance.telegram.getMe();
  const currentBotUsername = currentBotProfileInformation?.username || '';
  const currentConnectedDatabaseName = mongoose.connection.name || '';

  const isTestDevelopmentBot = currentBotUsername.toLowerCase().includes('dev');
  const isProductionDatabaseName = ['test', 'zen-bot-prod', 'production'].includes(currentConnectedDatabaseName.toLowerCase());
  const isExplicitDevBotWithProdDatabaseAllowed = process.env.ALLOW_DEV_BOT_WITH_PROD_DB === 'true';

  if (isTestDevelopmentBot && isProductionDatabaseName && !isExplicitDevBotWithProdDatabaseAllowed) {
    throw new Error(
      `[КРИТИЧЕСКАЯ_ОШИБКА_КОНФИГУРАЦИИ] Тестовый бот @${currentBotUsername} подключен к боевой базе данных "${currentConnectedDatabaseName}". Это запрещено для защиты пользовательских данных. Укажите MONGO_DB_NAME=zen-bot-dev или используйте токен боевого бота.`
    );
  }
};
