import base from './cards.json';
export const cards:Record<string,any>={...base};
export function registerCards(catalog:Record<string,any>|undefined){if(catalog)Object.assign(cards,catalog);}
