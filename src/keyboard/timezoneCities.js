// src/keyboard/timezoneCities.js
import { Markup } from 'telegraf';
import { DateTime } from 'luxon';
import { TIMEZONE_REGIONS } from '../constants/timezones.js';
import { BUTTONS } from '../constants/buttons.js';

const label = tz => {
  const dt = DateTime.now().setZone(tz);
  const offset = dt.toFormat('ZZ');
  const city = tz.split('/')[1].replace('_', ' ');
  return `${city} (UTC${offset})`;
};

export const timezoneCitiesKeyboard = regionKey => {
  const region = TIMEZONE_REGIONS[regionKey];

  const sortedZones = [...region.zones].sort((a, b) => {
    const cityA = a.split('/')[1].replace('_', ' ');
    const cityB = b.split('/')[1].replace('_', ' ');
    return cityA.localeCompare(cityB);
  });

  return Markup.inlineKeyboard([
    ...sortedZones.map(tz => [
      Markup.button.callback(label(tz), `timezone:set:${tz}`)
    ]),
    [Markup.button.callback(BUTTONS.BACK, 'settings:timezone')]
  ]);
};
