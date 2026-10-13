import {initCollection} from './gacha.mjs';

/** Called by both authoritative and solo settlement; repeat calls are idempotent. */
export function awardDuelRewards(profile,game,player){
 if(!game.result)return null;
 game.result.rewards||={};if(game.result.rewards[player])return game.result.rewards[player];
 initCollection(profile);profile.completed||=[];profile.cosmetics||=[];
 const reward={packs:0,tickets:0,cosmetics:[],firstClear:false};
 if(game.result.winner===player){
  if(game.mode==='practice')reward.packs=1;
  if(game.scenario&&!profile.completed.includes(game.scenario)){
   profile.completed.push(game.scenario);reward.firstClear=true;reward.packs=1;
   reward.tickets=game.scenario.startsWith('C')?5:3;
  }
  if(game.scenario){
   const cosmetic={C01:'blue_back',C02:'ice',C03:'violet'}[game.scenario];
   if(cosmetic&&!profile.cosmetics.includes(cosmetic))reward.cosmetics.push(cosmetic);
   if(['T01','T02','T03'].every(id=>profile.completed.includes(id))&&!profile.cosmetics.includes('intro_back'))reward.cosmetics.push('intro_back');
  }
 }
 profile.rewardPacks+=reward.packs;profile.tickets+=reward.tickets;profile.cosmetics.push(...reward.cosmetics);
 game.result.rewards[player]=reward;return reward;
}
