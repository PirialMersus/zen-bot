// src/utils/logger.js
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
