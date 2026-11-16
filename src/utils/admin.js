export const isAdministratorUser = (telegramUserId) => {
  const configuredCreatorIdentifier = process.env.CREATOR_ID;
  if (!configuredCreatorIdentifier || !telegramUserId) {
    return false;
  }
  return String(telegramUserId) === String(configuredCreatorIdentifier);
};

export const isAdministratorContext = (ctx) => {
  const telegramUserId = ctx?.from?.id || ctx?.callbackQuery?.from?.id;
  return isAdministratorUser(telegramUserId);
};
