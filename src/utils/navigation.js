import { BUTTONS } from '../constants/buttons.js';
import { UI } from '../constants/ui.js';

const collectAllButtonValues = (buttonObject) =>
  Object.values(buttonObject).flatMap((item) =>
    typeof item === 'object' && item !== null ? Object.values(item) : [item]
  );

export const allKnownNavigationButtons = [
  ...collectAllButtonValues(BUTTONS),
  ...collectAllButtonValues(UI)
];

export const isNavigationButton = (buttonText) =>
  Boolean(buttonText && allKnownNavigationButtons.includes(buttonText));
