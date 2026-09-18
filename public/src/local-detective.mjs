import { CATEGORIES } from './game.mjs';
import { nameDeck } from './data/names.mjs';
import { reasonDeck } from './data/reasons.mjs';
import { dobDeck } from './data/dates.mjs';
import { pharmacyDeck } from './data/pharmacies.mjs';
import { generateFromDeck } from './tree.mjs';

export const DECKS = {name:nameDeck, reason:reasonDeck, dob:dobDeck, pharmacy:pharmacyDeck};

export function generateTurn(game) {
  const key = CATEGORIES[game.categoryIndex].key;
  return generateFromDeck(DECKS[key], {
    asked:game.asked,
    history:game.history.filter(entry => entry.category === key),
  });
}
