// src/services/cleanupUser.js
import User from '../models/User.js';
import Reminder from '../models/Reminder.js';
import Activity from '../models/Activity.js';

export const cleanupUser = async telegramId => {
  const id = Number(telegramId);
  await Promise.allSettled([
    User.deleteOne({ telegramId: id }),
    Reminder.deleteMany({ userId: String(id) }),
    Activity.deleteMany({ telegramId: id })
  ]);
};

