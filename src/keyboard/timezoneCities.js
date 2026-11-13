import { Markup } from 'telegraf';
import { DateTime } from 'luxon';
import { TIMEZONE_REGIONS } from '../constants/timezones.js';
import { getButtons } from '../constants/buttons.js';

const extractCityName = timezoneIdentifier => {
  const segments = timezoneIdentifier.split('/');
  return segments[segments.length - 1].replace(/_/g, ' ');
};

const formatCityTimezoneLabel = timezoneString => {
  const dateTimeInstance = DateTime.now().setZone(timezoneString);
  const timezoneOffsetString = dateTimeInstance.toFormat('ZZ');
  const cityName = extractCityName(timezoneString);
  return `${cityName} (UTC${timezoneOffsetString})`;
};

export const timezoneCitiesKeyboard = (regionKey, language = 'ru') => {
  const buttons = getButtons(language);
  const selectedRegion = TIMEZONE_REGIONS[regionKey];

  const sortedTimezoneList = [...selectedRegion.zones].sort((timezoneFirst, timezoneSecond) => {
    const cityFirst = extractCityName(timezoneFirst);
    const citySecond = extractCityName(timezoneSecond);
    return cityFirst.localeCompare(citySecond);
  });

  return Markup.inlineKeyboard([
    ...sortedTimezoneList.map(timezoneIdentifier => [
      Markup.button.callback(formatCityTimezoneLabel(timezoneIdentifier), `timezone:set:${timezoneIdentifier}`)
    ]),
    [Markup.button.callback(buttons.BACK, 'settings:timezone')]
  ]);
};
