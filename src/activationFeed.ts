export type Activation={key:string,id:string,player:number};
export type ActivationFeed={gameId:string,seen:string[],history:Activation[],queue:Activation[],active:Activation|null};
export const ACTIVATION_HOLD_MS=4000;
export function emptyActivationFeed(gameId:string):ActivationFeed{return {gameId,seen:[],history:[],queue:[],active:null};}

/** Only publicly announced activations enter the feed, never hand/set-card identities. */
export function collectActivations(state:ActivationFeed,game:{id:string,events?:any[]},catalog:Record<string,any>):ActivationFeed{
 const base=state.gameId===game.id?state:emptyActivationFeed(game.id);
 const known=new Set(base.seen),added:Activation[]=[];
 for(const event of game.events||[]){
  const card=catalog[event.id];
  if(event.type!=='activate'||!['spell','trap','monster'].includes(card?.kind)||typeof event.eventId!=='string'||![0,1].includes(event.player)||known.has(event.eventId))continue;
  known.add(event.eventId);added.push({key:event.eventId,id:event.id,player:event.player});
 }
 if(!added.length)return base;
 const queue=[...base.queue,...added],active=base.active||queue.shift()!;
 return {gameId:game.id,seen:[...known].slice(-128),history:[...added].reverse().concat(base.history).slice(0,12),queue,active};
}
/** Reloading a duel restores the archive without replaying effects from earlier turns. */
export function restoreActivationFeed(game:any,catalog:Record<string,any>):ActivationFeed{
 const feed=collectActivations(emptyActivationFeed(game.id),game,catalog),link=game.pending?.chain?.at(-1);
 return {...feed,active:link?feed.history.find(entry=>entry.id===link.id&&entry.player===link.player)||null:null,queue:[]};
}
export function advanceActivation(state:ActivationFeed):ActivationFeed{
 return {...state,active:state.queue[0]||null,queue:state.queue.slice(1)};
}

/** The live response source is the latest publicly revealed link, including quick counters. */
export function currentChainCard(game:any,catalog:Record<string,any>){
 const link=game.pending?.chain?.at(-1),card=catalog[link?.id];
 return card&&['spell','trap','monster'].includes(card.kind)?{card,player:link.player}:null;
}
