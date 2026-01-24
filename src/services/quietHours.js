// src/services/quietHours.js
import { DateTime } from 'luxon';

const DEFAULT_OFFSET_HOURS = 3;

const getUserDateTime = (user, date) => {
  if (user?.timezone) {
    return DateTime.fromJSDate(date).setZone(user.timezone);
  }

  return DateTime.fromJSDate(date).plus({ hours: DEFAULT_OFFSET_HOURS });
};

export const isQuietNow = (user, date = new Date()) => {
  const q = user?.quietHours;
  if (!q || q.enabled === false) return false;

  const dt = getUserDateTime(user, date);
  const hour = dt.hour;

  if (q.start < q.end) {
    return hour >= q.start && hour < q.end;
  }

  return hour >= q.start || hour < q.end;
};

export const getQuietEndDate = (user, date = new Date()) => {
  const q = user.quietHours;
  let dt = getUserDateTime(user, date);

  if (!isQuietNow(user, date)) return dt.toJSDate();

  let end = dt.set({ hour: q.end, minute: 0, second: 0 });

  if (q.start > q.end && dt.hour >= q.start) {
    end = end.plus({ days: 1 });
  }

  return end.toJSDate();
};
