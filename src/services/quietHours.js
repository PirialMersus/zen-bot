import { DateTime } from 'luxon';

const DEFAULT_OFFSET_HOURS = 3;

const getUserDateTime = (user, date) => {
  if (user?.timezone) {
    return DateTime.fromJSDate(date).setZone(user.timezone);
  }

  return DateTime.fromJSDate(date).plus({ hours: DEFAULT_OFFSET_HOURS });
};

export const isQuietNow = (user, date = new Date()) => {
  const quietSettings = user?.quietHours;
  if (!quietSettings || quietSettings.enabled === false) return false;

  const userCurrentDateTime = getUserDateTime(user, date);
  const currentTotalMinutesFromMidnight =
    userCurrentDateTime.hour * 60 + userCurrentDateTime.minute;
  const startTotalMinutesFromMidnight =
    (quietSettings.start ?? 23) * 60 + (quietSettings.startMinute ?? 0);
  const endTotalMinutesFromMidnight =
    (quietSettings.end ?? 8) * 60 + (quietSettings.endMinute ?? 0);

  if (startTotalMinutesFromMidnight === endTotalMinutesFromMidnight) {
    return false;
  }

  if (startTotalMinutesFromMidnight < endTotalMinutesFromMidnight) {
    return (
      currentTotalMinutesFromMidnight >= startTotalMinutesFromMidnight &&
      currentTotalMinutesFromMidnight < endTotalMinutesFromMidnight
    );
  }

  return (
    currentTotalMinutesFromMidnight >= startTotalMinutesFromMidnight ||
    currentTotalMinutesFromMidnight < endTotalMinutesFromMidnight
  );
};

export const getQuietEndDate = (user, date = new Date()) => {
  const quietSettings = user.quietHours;
  const userCurrentDateTime = getUserDateTime(user, date);

  if (!isQuietNow(user, date)) return userCurrentDateTime.toJSDate();

  const targetEndHour = quietSettings.end ?? 8;
  const targetEndMinute = quietSettings.endMinute ?? 0;
  let quietEndDateTime = userCurrentDateTime.set({
    hour: targetEndHour,
    minute: targetEndMinute,
    second: 0,
    millisecond: 0
  });

  const currentTotalMinutesFromMidnight =
    userCurrentDateTime.hour * 60 + userCurrentDateTime.minute;
  const startTotalMinutesFromMidnight =
    (quietSettings.start ?? 23) * 60 + (quietSettings.startMinute ?? 0);
  const endTotalMinutesFromMidnight = targetEndHour * 60 + targetEndMinute;

  if (
    startTotalMinutesFromMidnight > endTotalMinutesFromMidnight &&
    currentTotalMinutesFromMidnight >= startTotalMinutesFromMidnight
  ) {
    quietEndDateTime = quietEndDateTime.plus({ days: 1 });
  }

  return quietEndDateTime.toJSDate();
};
