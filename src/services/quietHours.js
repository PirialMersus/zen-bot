// src/services/quietHours.js
export const isQuietNow = (quietHours, date = new Date()) => {
  if (!quietHours || quietHours.enabled === false) return false;

  const hour = date.getHours();
  const { start, end } = quietHours;

  if (start < end) {
    return hour >= start && hour < end;
  }

  return hour >= start || hour < end;
};
