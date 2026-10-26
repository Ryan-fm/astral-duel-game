import base from './cards.json';
const revealed:Record<string,any>=import.meta.hot?.data.revealed||{};
if(import.meta.hot)import.meta.hot.data.revealed=revealed;
export const cards:Record<string,any>={...base,...revealed};
export function registerCards(catalog:Record<string,any>|undefined){if(catalog){Object.assign(revealed,catalog);Object.assign(cards,catalog);}}
