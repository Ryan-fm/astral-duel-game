import {readFileSync} from 'node:fs';
const read=(p:string)=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
// Both Toy and standalone solo builds run the same browser-safe rules.
export function browserRulesAdapter(relativeAssets=false){return {name:'browser-rules-adapter',enforce:'pre' as const,transform(code:string,id:string){
 if(id.endsWith('/server/engine.mjs'))return code.replace("import { readFileSync } from 'node:fs';",'').replace("import { randomUUID, randomInt } from 'node:crypto';","import {randomUUID,randomInt} from '../src/browserRandom';").replace(/^export const CARDS = .*$/m,`export const CARDS = ${JSON.stringify({...JSON.parse(read('src/cards.json')),...JSON.parse(read('server/hidden-cards.json'))})};`).replace(/^export const DECKS = .*$/m,`export const DECKS = ${read('server/decks.json')};`).replace(/^export const SCENARIOS = .*$/m,`export const SCENARIOS = ${read('server/scenarios.json')};`);
 if(id.endsWith('/server/gacha.mjs'))return code.replace("import {randomInt,randomUUID} from 'node:crypto';","import {randomInt,randomUUID} from '../src/browserRandom';");
 if(relativeAssets&&/\/src\/.*\.(tsx|ts)$/.test(id))return code.replaceAll("'/game-assets/","'./game-assets/").replaceAll('"/game-assets/','"./game-assets/');
 if(relativeAssets&&id.endsWith('/src/cards.json'))return code.replaceAll('/game-assets/','./game-assets/');
 }};}
