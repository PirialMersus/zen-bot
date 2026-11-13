import https from 'https';
import { DateTime } from 'luxon';
import Reminder from '../models/Reminder.js';
import User from '../models/User.js';
import { DEFAULT_TIMEZONE } from '../constants/timezones.js';
import { logError } from '../utils/logger.js';
import { cleanupUser } from './cleanupUser.js';
import { isQuietNow, getQuietEndDate } from './quietHours.js';
import {
  getNextPointerForUser,
  getNextFavoritePointerForUser
} from '../services/pointers.js';
import {
  deliverReminder,
  handleDeliveryError,
  getPointerTagForLanguage
} from './reminderDelivery.js';

const TICK_MS = 60 * 1000;
const INACTIVE_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;
const LOCK_TIMEOUT_MS = 2 * 60 * 1000;

export const calcNextRun = (from, minutes) =>
  new Date(from.getTime() + minutes * 60 * 1000);

export const calculateDailyNextRun = (targetTime, timezone = DEFAULT_TIMEZONE, fromDate = new Date()) => {
  const [targetHours, targetMinutes] = targetTime.split(':').map(Number);
  const nowInTimezone = DateTime.fromJSDate(fromDate).setZone(timezone);
  let nextOccurrence = nowInTimezone.set({
    hour: targetHours,
    minute: targetMinutes,
    second: 0,
    millisecond: 0
  });

  if (nextOccurrence <= nowInTimezone) {
    nextOccurrence = nextOccurrence.plus({ days: 1 });
  }

  return nextOccurrence.toJSDate();
};

let lastCleanupDay = null;
let isSchedulerTickProcessing = false;

const performInactiveUsersCleanup = async now => {
  const currentDay = now.toISOString().slice(0, 10);
  if (lastCleanupDay === currentDay) return;
  lastCleanupDay = currentDay;

  const cutoff = new Date(now.getTime() - INACTIVE_DAYS * DAY_MS);
  try {
    const inactiveUsers = await User.find(
      {
        lastActivityAt: { $lt: cutoff },
        pushTokens: { $exists: true, $not: { $size: 0 } }
      },
      { telegramId: 1 }
    ).lean();

    for (const inactiveUser of inactiveUsers) {
      await cleanupUser(inactiveUser.telegramId).catch(() => {});
    }
  } catch (error) {
    logError(error, { scope: 'inactiveUserCleanup' });
  }
};

const acquireReminderExecutionLock = async (reminderId, now) => {
  const lockExpirationThreshold = new Date(now.getTime() - LOCK_TIMEOUT_MS);
  return Reminder.findOneAndUpdate(
    {
      _id: reminderId,
      isActive: true,
      $or: [
        { lockedAt: null },
        { lockedAt: { $lt: lockExpirationThreshold } }
      ]
    },
    { $set: { lockedAt: now } },
    { new: true }
  );
};

let schedulerIntervalIdentifier = null;

export const stopScheduler = () => {
  if (schedulerIntervalIdentifier) {
    clearInterval(schedulerIntervalIdentifier);
    schedulerIntervalIdentifier = null;
  }
};

export const startScheduler = bot => {
  schedulerIntervalIdentifier = setInterval(async () => {
    if (isSchedulerTickProcessing) {
      logError(new Error('Scheduler tick skipped: previous tick is still in progress'), {
        scope: 'schedulerTickOverlap'
      });
      return;
    }

    isSchedulerTickProcessing = true;

    try {
      if (process.env.NODE_ENV === 'production' && process.env.HEALTHCHECKS_URL) {
        https.get(process.env.HEALTHCHECKS_URL, response => response.resume()).on('error', () => {});
      }

      const now = new Date();
      await performInactiveUsersCleanup(now);

      const reminders = await Reminder.find({
        isActive: true,
        nextRunAt: { $lte: now }
      })
        .sort({ nextRunAt: 1 })
        .lean(false)
        .catch(() => []);

      if (!reminders.length) return;

      const usersCache = new Map();
      const sentThisTick = new Set();

      for (const reminderItem of reminders) {
        try {
          if (!reminderItem.text || !reminderItem.intervalMinutes) continue;

          let targetUser = usersCache.get(reminderItem.userId);
          if (!targetUser) {
            targetUser = await User.findOne({ telegramId: reminderItem.userId }).catch(() => null);
            usersCache.set(reminderItem.userId, targetUser);
          }

          if (isQuietNow(targetUser, now)) {
            const quietEndDate = getQuietEndDate(targetUser, now);
            const nextRunByInterval = calcNextRun(now, reminderItem.intervalMinutes);
            const nextScheduledDate = nextRunByInterval < quietEndDate ? nextRunByInterval : quietEndDate;

            reminderItem.nextRunAt = nextScheduledDate;
            await reminderItem.save().catch(() => {});
            continue;
          }

          if (sentThisTick.has(reminderItem.userId)) {
            continue;
          }

          const lockedReminder = await acquireReminderExecutionLock(reminderItem._id, now);
          if (!lockedReminder) {
            continue;
          }

          const userLanguage = ['en', 'uk', 'es'].includes(targetUser?.language) ? targetUser.language : 'ru';
          let messageText = reminderItem.text;
          let currentPointer = null;

          if (reminderItem.isFavoritePointer) {
            const favoritePointer = await getNextFavoritePointerForUser(reminderItem.userId).catch(() => null);
            if (favoritePointer) {
              currentPointer = favoritePointer;
              messageText = favoritePointer.source
                ? `${favoritePointer.text}\n\n— ${favoritePointer.source}`
                : favoritePointer.text;
            }
          } else if (reminderItem.isRandomPointer) {
            const tagForLanguage = getPointerTagForLanguage(userLanguage);
            const pointer = await getNextPointerForUser(reminderItem.userId, tagForLanguage).catch(() => null);
            if (pointer) {
              currentPointer = pointer;
              messageText = pointer.source
                ? `${pointer.text}\n\n— ${pointer.source}`
                : pointer.text;
            }
          }

          try {
            await deliverReminder({
              bot,
              reminder: reminderItem,
              user: targetUser,
              userLanguage,
              currentPointer,
              messageText
            });
          } catch (deliveryError) {
            await handleDeliveryError({ error: deliveryError, reminder: reminderItem });
            reminderItem.lockedAt = null;
            await reminderItem.save().catch(() => {});
            continue;
          }

          sentThisTick.add(reminderItem.userId);

          reminderItem.lastSentAt = now;
          if (reminderItem.type === 'daily' && reminderItem.targetTime) {
            const userTimezone = targetUser?.timezone || DEFAULT_TIMEZONE;
            reminderItem.nextRunAt = calculateDailyNextRun(reminderItem.targetTime, userTimezone, now);
          } else {
            reminderItem.nextRunAt = calcNextRun(now, reminderItem.intervalMinutes);
          }
          reminderItem.lockedAt = null;
          await reminderItem.save().catch(() => {});
        } catch (itemError) {
          logError(itemError, { scope: 'reminderItem', reminderId: reminderItem._id });
        }
      }
    } catch (tickError) {
      logError(tickError, { scope: 'schedulerTick' });
    } finally {
      isSchedulerTickProcessing = false;
    }
  }, TICK_MS);
};
