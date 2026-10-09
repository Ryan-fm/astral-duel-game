export type DropSite = {type:'zone', player:number, area:'field'|'spells', zone:number, uid?:string} | {type:'activate'};
export type DropPoint = {x:number,y:number};
export type ArenaDropApi = {hitTest:(x:number,y:number)=>DropSite|null, center:(site:DropSite)=>DropPoint|null};
export type CardDrag = DropPoint & {uid:string,site:DropSite|null,valid:boolean,returning?:boolean,keyboard?:boolean};

export function siteKey(site:DropSite|null){return !site?'':site.type==='activate'?'activate':`${site.player}:${site.area}:${site.zone}`;}
export function handPlayActions(game:any,uid:string,position='attack'):any[]{
 if(!game||game.paused||game.result||!game.players[game.you].hand.some((c:any)=>c.uid===uid))return [];
 return (game.legal||[]).filter((a:any)=>a.cardUid===uid&&['summon','set','activate'].includes(a.kind)&&(!a.position||a.position===position));
}
export function cardDropSites(game:any,uid:string,position='attack'):DropSite[]{
 const sites=new Map<string,DropSite>();
 for(const action of handPlayActions(game,uid,position)){
  if(Number.isInteger(action.zone)){
   const area=action.kind==='set'?'spells':'field';
   const site:DropSite={type:'zone',player:game.you,area,zone:action.zone};
   sites.set(siteKey(site),site);
  }else if(action.kind==='activate'){
   sites.set('activate',{type:'activate'});
   if(action.targetUid)for(let player=0;player<2;player++)for(const area of ['field','spells'] as const){
    const zone=game.players[player][area].findIndex((c:any)=>c?.uid===action.targetUid);
    if(zone>=0){const site:DropSite={type:'zone',player,area,zone,uid:action.targetUid};sites.set(siteKey(site),site);}
   }
  }
 }
 return [...sites.values()];
}
/** Select server-issued actions only. A spatial hit must never invent an action. */
export function actionsAtDrop(game:any,uid:string,site:DropSite|null,position='attack'):any[]{
 if(!site)return [];
 return handPlayActions(game,uid,position).filter(a=>{
  if(site.type==='activate')return a.kind==='activate'&&!Number.isInteger(a.zone);
  if(a.kind==='activate'&&!Number.isInteger(a.zone))return !!site.uid&&a.targetUid===site.uid;
  return site.player===game.you&&a.zone===site.zone&&site.area===(a.kind==='set'?'spells':'field');
 });
}
export function dropNeedsChoice(actions:any[],site:DropSite){
 return actions.some(a=>a.tributes?.length>0||a.targetUid!==undefined&&(site.type!=='zone'||site.uid!==a.targetUid));
}
export function dragStillCurrent(game:any,snapshot:{id:string,version:number}){
 return !!game&&!game.paused&&!game.result&&game.id===snapshot.id&&game.version===snapshot.version;
}
