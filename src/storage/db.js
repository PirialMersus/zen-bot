import mongoose from 'mongoose';

export const resolveTargetDatabaseName = () => {
  if (process.env.MONGO_DB_NAME) {
    return process.env.MONGO_DB_NAME;
  }

  const isProductionEnvironment = process.env.NODE_ENV === 'production';
  if (isProductionEnvironment) {
    const rawMongoUri = process.env.MONGO_URI || '';
    try {
      const parsedUri = new URL(rawMongoUri);
      const pathnameWithoutLeadingSlash = parsedUri.pathname.replace(/^\//, '');
      if (pathnameWithoutLeadingSlash) {
        return pathnameWithoutLeadingSlash;
      }
    } catch {
      return 'test';
    }
    return 'test';
  }

  return 'zen-bot-dev';
};

export const connectDB = async (customConnectionOptions = {}) => {
  const mongoConnectionUri = process.env.MONGO_URI;
  if (!mongoConnectionUri) {
    throw new Error('Критическая ошибка: отсутствует переменная окружения MONGO_URI');
  }

  const isProductionEnvironment = process.env.NODE_ENV === 'production';
  const targetDatabaseName = customConnectionOptions.dbName || resolveTargetDatabaseName();

  const isDangerousProductionDatabase = ['test', 'zen-bot-prod', 'production'].includes(targetDatabaseName.toLowerCase());
  const isExplicitSafetyOverrideEnabled = process.env.ALLOW_PRODUCTION_DB_IN_DEV === 'true';

  if (!isProductionEnvironment && isDangerousProductionDatabase && !isExplicitSafetyOverrideEnabled) {
    throw new Error(`[БЕЗОПАСНОСТЬ_БАЗЫ_ДАННЫХ] Попытка подключения к боевой базе данных "${targetDatabaseName}" в окружении "${process.env.NODE_ENV || 'development'}". Для разрешения установите ALLOW_PRODUCTION_DB_IN_DEV=true.`);
  }

  await mongoose.connect(mongoConnectionUri, {
    dbName: targetDatabaseName,
    ...customConnectionOptions
  });

  const connectedDatabaseName = mongoose.connection.name;
  const connectedDatabaseHost = mongoose.connection.host;

  console.log(`[DATABASE_CONNECTED] Хост: ${connectedDatabaseHost}, База: ${connectedDatabaseName}, Окружение: ${process.env.NODE_ENV || 'development'}`);
};

export const disconnectDB = async () => {
  await mongoose.disconnect();
};
