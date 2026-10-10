const CARD_RATIO=813/1185;
const EDGE_SPACE=18;

/** Keep the exposed portion of every card tappable; excess cards use another fan page. */
export function handFanLayout(width:number,height:number,count:number){
 const available=Math.max(0,width-EDGE_SPACE*2);
 const capacity=Math.max(1,Math.floor((available-68)/44)+1);
 const visible=Math.min(count,capacity);
 const cardHeight=Math.min(214,Math.max(96,height-40),Math.max(68,(available-Math.max(0,visible-1)*44))/CARD_RATIO);
 const cardWidth=cardHeight*CARD_RATIO;
 const step=visible>1?Math.min(cardWidth*.94,(available-cardWidth)/(visible-1)):0;
 return {capacity,cardHeight,cardWidth,cards:Array.from({length:visible},(_,i)=>{
  const offset=i-(visible-1)/2,unit=visible>1?offset/((visible-1)/2):0;
  return {x:offset*step,angle:unit*8,rise:(1-unit*unit)*12,z:i+1};
 })};
}
