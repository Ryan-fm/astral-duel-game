export type PublicPile='grave'|'banished';
export type PublicPileMove={uid:string,id:string,player:number,area:PublicPile,fromPlayer:number,fromArea:string,fromZone:number};
/** Piles are public. Derive movements from projected state, never from hidden engine state. */
export function publicPileMoves(previous:any,next:any):PublicPileMove[]{
 if(!previous||!next||previous.id!==next.id||next.version<=previous.version)return [];
 const result:PublicPileMove[]=[];
 for(let player=0;player<2;player++)for(const area of ['grave','banished'] as const){
  const old=new Set((previous.players[player][area]||[]).map((c:any)=>c.uid));
  for(const card of next.players[player][area]||[]){
   if(old.has(card.uid)||!card.id)continue;
   let fromPlayer=player,fromArea='unknown',fromZone=-1;
   for(let p=0;p<2;p++)for(const source of ['field','spells','hand','grave','banished']){
    const index=(previous.players[p][source]||[]).findIndex((c:any)=>c?.uid===card.uid);
    if(index>=0){fromPlayer=p;fromArea=source;fromZone=index;}
   }
   result.push({uid:card.uid,id:card.id,player,area,fromPlayer,fromArea,fromZone});
  }
 }
 return result;
}
/** Mirror stations for the opponent, keeping the five playable columns untouched. */
export function publicPilePosition(own:boolean,area:PublicPile){
 const side=own?1:-1;return {x:-8.65*side,y:.10,z:(area==='grave'?2.65:5.35)*side};
}
export function visiblePileCards(game:any,player:number,area:PublicPile){return [...(game.players[player][area]||[])].filter((c:any)=>c?.id).reverse();}

export const PILE_TRANSFER_MS=2300;
/** Separate lift/readability, travel, then landing; independent from authoritative rules. */
export function pileTransferPhase(t:number){
 const clamp=(n:number)=>Math.max(0,Math.min(1,n)),smooth=(n:number)=>{const u=clamp(n);return u*u*(3-2*u);};
 return {lift:smooth(t/.22),travel:smooth((t-.22)/.52),sink:smooth((t-.74)/.16),fade:t>=1?0:1-clamp((t-.90)/.10)};
}
