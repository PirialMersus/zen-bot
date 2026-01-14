// src/services/quietHours.js
const BELARUS_OFFSET_HOURS = 3;

export const isQuietNow = (quietHours, date = new Date()) => {
  if (!quietHours || quietHours.enabled === false) return false;

  const utcHour = date.getUTCHours();
  const hour = (utcHour + BELARUS_OFFSET_HOURS) % 24;

  const { start, end } = quietHours;

  if (start < end) {
    return hour >= start && hour < end;
  }

  return hour >= start || hour < end;
};
