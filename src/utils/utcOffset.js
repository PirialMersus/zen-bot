// src/utils/utcOffset.js
export const getUtcOffsetLabel = tz => {
  const now = new Date();
  const local = new Date(
    now.toLocaleString('en-US', { timeZone: tz })
  );

  const offsetMin = (local - now) / 60000;
  const sign = offsetMin >= 0 ? '+' : '-';
  const abs = Math.abs(offsetMin);
  const h = Math.floor(abs / 60);
  const m = abs % 60;

  return `UTC${sign}${h}${m ? ':' + String(m).padStart(2, '0') : ''}`;
};
