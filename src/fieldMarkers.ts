export type MarkerCard={uid:string,id?:string,faceUp?:boolean,position?:string,bonus?:number};

/** Hidden cards use the same neutral seal regardless of their private kind or statistics. */
export function fieldMarker(card:MarkerCard,own:boolean,area:string,zone:number,catalog:Record<string,any>,activating=false){
 const definition=card.id&&(own||card.faceUp)?catalog[card.id]:undefined;
 const combat=area==='field'&&card.faceUp&&definition?.kind==='monster';
 const sealed=!card.faceUp,kind=sealed?'sealed':definition?.kind||'sealed';
 const name=definition?.name||`${own?'我方':'对方'}盖牌`;
 const stat=combat?`${card.position==='defense'?'DEF':'ATK'} ${card.position==='defense'?definition.def:definition.atk+(card.bonus||0)}`:'';
 const status=sealed?'盖放':activating?'发动中':combat?card.position==='defense'?'守备表示':'攻击表示':'表侧表示';
 return {name,stat,status,kind,sealed,combat,number:String(zone+1).padStart(2,'0'),icon:sealed?'sealed':combat?card.position==='defense'?'shield':'sword':activating?'bolt':kind==='trap'?'trap':'spell',ariaLabel:`${own?'我方':'对方'} ${definition?.name||'未知盖牌'}${combat?' '+(card.position==='defense'?'守备 '+definition.def:'攻击 '+(definition.atk+(card.bonus||0))):''} · ${area==='field'?'怪兽区':'魔法陷阱区'} ${zone+1}号`,width:combat?76:44};
}

/** Keep adjacent field buttons distinct as perspective compresses a far row. */
export function packFieldMarkers(markers:Array<{id:string,x:number,width:number}>,viewport:number,gap=5){
 if(!markers.length)return new Map<string,number>();
 const sorted=[...markers].sort((a,b)=>a.x-b.x),padding=8,total=sorted.reduce((n,m)=>n+m.width,0)+gap*(sorted.length-1);
 const effectiveGap=total>viewport-2*padding?Math.max(0,(viewport-2*padding-sorted.reduce((n,m)=>n+m.width,0))/(sorted.length-1||1)):gap;
 const placed=sorted.map(m=>({...m,x:Math.max(padding+m.width/2,Math.min(viewport-padding-m.width/2,m.x))}));
 for(let i=1;i<placed.length;i++)placed[i].x=Math.max(placed[i].x,placed[i-1].x+(placed[i-1].width+placed[i].width)/2+effectiveGap);
 const overflow=placed.at(-1)!.x+placed.at(-1)!.width/2-(viewport-padding);
 if(overflow>0){placed.at(-1)!.x-=overflow;for(let i=placed.length-2;i>=0;i--)placed[i].x=Math.min(placed[i].x,placed[i+1].x-(placed[i].width+placed[i+1].width)/2-effectiveGap);}
 return new Map(placed.map(m=>[m.id,m.x]));
}

/** Pull paired public-pile controls outside the playable columns, with separate 44px targets. */
export function packPileMarkers(markers:Array<{id:string,x:number,y:number,own:boolean}>,width:number,height:number){
 const result=new Map<string,{x:number,y:number}>(),half=44,gap=50;
 for(const own of [true,false]){
  const group=markers.filter(m=>m.own===own).sort((a,b)=>a.y-b.y);if(!group.length)continue;
  const edge=own?Math.min(...group.map(m=>m.x))-40:Math.max(...group.map(m=>m.x))+40;
  const x=Math.max(half+70,Math.min(width-half-12,edge));
  const low=height<=560?112:150,high=height*(height<=560?.57:.66);
  const positions=group.map(m=>Math.max(low,Math.min(high,m.y)));
  for(let i=1;i<positions.length;i++)positions[i]=Math.max(positions[i],positions[i-1]+gap);
  if(positions.at(-1)!>high){positions[positions.length-1]=high;for(let i=positions.length-2;i>=0;i--)positions[i]=Math.min(positions[i],positions[i+1]-gap);}
  group.forEach((m,i)=>result.set(m.id,{x,y:positions[i]}));
 }
 return result;
}

const glyphs:Record<string,string>={
 sealed:'M6 3h11a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Zm3 4h5v10H9V7Zm-1 6 3.5-3 3.5 3-3.5 3-3.5-3Z',
 sword:'m15 3 6 0 0 6-10 10-6-6L15 3Zm1 5L8 16M3 17l4 4M5 19l-2 2',
 shield:'M12 3 20 6v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Zm0 5v9',
 bolt:'m14 2-9 12h6l-1 8 9-12h-6l1-8Z',
 trap:'M5 4h14v16H5V4Zm4 7 3-4 3 4-3 6-3-6Z',
 spell:'M12 3v18M3 12h18M6 6l12 12M6 18 18 6M9 9l3-2 3 2 2 3-2 3-3 2-3-2-2-3 2-3Z'
};
export function markerGlyph(kind:string){
 const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');
 const path=document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('d',glyphs[kind]||glyphs.sealed);path.setAttribute('fill','none');path.setAttribute('stroke','currentColor');path.setAttribute('stroke-width','1.5');path.setAttribute('stroke-linecap','round');path.setAttribute('stroke-linejoin','round');svg.append(path);return svg;
}
