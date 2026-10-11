export type DropSite = {type:'zone', player:number, area:'field'|'spells', zone:number, uid?:string} | {type:'activate'} | {type:'play',intent?:'play'|'set'};
export type DropPoint = {x:number,y:number};
export type PlayArea = {left:number,top:number,right:number,bottom:number};
export type ArenaDropApi = {hitTest:(x:number,y:number)=>DropSite|null, center:(site:DropSite)=>DropPoint|null};
export type CardDrag = DropPoint & {uid:string,cardId?:string,intent?:'play'|'set',site:DropSite|null,valid:boolean,area?:PlayArea,returning?:boolean,launching?:boolean,keyboard?:boolean,tilt?:number};

export function siteKey(site:DropSite|null){return !site?'':site.type==='activate'?'activate':site.type==='play'?'play:'+ (site.intent||'play'):`${site.player}:${site.area}:${site.zone}`;}
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
/** Collapse placement, never strategic choices: every returned command is server-issued. */
export function automaticPlayActions(game:any,uid:string,position='attack',intent='play'):any[]{
 const legal=handPlayActions(game,uid,position);
 const kind=intent==='set'?'set':legal.some(a=>a.kind==='summon')?'summon':legal.some(a=>a.kind==='activate')?'activate':'set';
 const grouped=new Map<string,any>();
 for(const action of legal.filter(a=>a.kind===kind)){
  const {zone,...choice}=action,key=JSON.stringify(choice),previous=grouped.get(key);
  // Prefer an already empty slot; a full tribute board may use a slot freed by the chosen sacrifices.
  const rank=(a:any)=>Number.isInteger(a.zone)?(game.players[game.you][a.kind==='set'?'spells':'field'][a.zone]?10:0)+a.zone:-1;
  if(!previous||rank(action)<rank(previous))grouped.set(key,action);
 }
 return [...grouped.values()];
}
export function automaticPreviewSite(game:any,actions:any[]):DropSite|null{
 const action=actions[0];return action&&Number.isInteger(action.zone)&&actions.every(a=>a.zone===action.zone)?{type:'zone',player:game.you,area:action.kind==='set'?'spells':'field',zone:action.zone}:null;
}
/** Crossing the hand edge and a minimum upward distance arms play; release still commits it. */
export function isPulledIntoPlay(point:DropPoint,start:DropPoint,area:PlayArea,liftDistance:number){
 return point.y<=start.y-liftDistance&&point.x>=area.left&&point.x<=area.right&&point.y>=area.top&&point.y<=area.bottom;
}
/** Select server-issued actions only. A spatial hit must never invent an action. */
export function actionsAtDrop(game:any,uid:string,site:DropSite|null,position='attack'):any[]{
 if(!site)return [];
 if(site.type==='play')return automaticPlayActions(game,uid,position,site.intent);
 return handPlayActions(game,uid,position).filter(a=>{
  if(site.type==='activate')return a.kind==='activate'&&!Number.isInteger(a.zone);
  if(a.kind==='activate'&&!Number.isInteger(a.zone))return !!site.uid&&a.targetUid===site.uid;
  return site.player===game.you&&a.zone===site.zone&&site.area===(a.kind==='set'?'spells':'field');
 });
}
export function dropNeedsChoice(actions:any[],site:DropSite){
 return actions.some(a=>a.tributes?.length>0||a.materialUids?.length>0||a.fusionId!==undefined||a.ritualUid!==undefined||a.targetUid!==undefined&&(site.type!=='zone'||site.uid!==a.targetUid));
}
export function dragStillCurrent(game:any,snapshot:{id:string,version:number}){
 return !!game&&!game.paused&&!game.result&&game.id===snapshot.id&&game.version===snapshot.version;
}
