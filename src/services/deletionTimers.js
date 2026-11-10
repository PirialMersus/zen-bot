const activeTimers = new Map();

export const registerDeletionTimer = (chatId, messageId, deleteAfterSeconds, onDeleteCallback) => {
  const timerKey = `${chatId}:${messageId}`;
  if (activeTimers.has(timerKey)) {
    clearTimeout(activeTimers.get(timerKey).timeoutId);
  }

  const timeoutId = setTimeout(async () => {
    activeTimers.delete(timerKey);
    try {
      if (typeof onDeleteCallback === 'function') {
        await onDeleteCallback();
      }
    } catch {}
  }, deleteAfterSeconds * 1000);

  activeTimers.set(timerKey, {
    timeoutId,
    deleteAfterSeconds,
    createdAt: Date.now()
  });
};

export const cancelDeletionTimer = (chatId, messageId) => {
  const timerKey = `${chatId}:${messageId}`;
  const entry = activeTimers.get(timerKey);
  if (entry) {
    clearTimeout(entry.timeoutId);
    activeTimers.delete(timerKey);
    return true;
  }
  return false;
};

export const hasDeletionTimer = (chatId, messageId) => {
  return activeTimers.has(`${chatId}:${messageId}`);
};

export const getDeletionTimer = (chatId, messageId) => {
  return activeTimers.get(`${chatId}:${messageId}`) || null;
};

export const clearAllDeletionTimers = () => {
  for (const [, entry] of activeTimers) {
    clearTimeout(entry.timeoutId);
  }
  activeTimers.clear();
};
