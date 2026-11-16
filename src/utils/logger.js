export const logError = (error, meta = {}) => {
  const time = new Date().toISOString();

  const payload = {
    time,
    message: error?.message,
    name: error?.name,
    stack: error?.stack,
    meta
  };

  console.error(JSON.stringify(payload));
};

export const suppressExpectedError = (error, meta = {}) => {
  const errorMessage = error?.message || '';
  const isIgnorableTelegramError =
    errorMessage.includes('message is not modified') ||
    errorMessage.includes('query is too old') ||
    errorMessage.includes('message to delete not found') ||
    errorMessage.includes("message can't be deleted");

  if (!isIgnorableTelegramError && process.env.NODE_ENV !== 'test') {
    logError(error, meta);
  }
};
