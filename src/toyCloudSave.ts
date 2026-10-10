import type {ToyAPI} from './toyPlatform.ts';
const PREFIX='ruins_duel_v2',PARTS=24;
const key=(slot:string,i:number)=>`${PREFIX}_${slot}_${i}`;
export const CLOUD_KEYS=[PREFIX,...['a','b'].flatMap(slot=>Array.from({length:PARTS},(_,i)=>key(slot,i)))];
const bytes=(text:string)=>new TextEncoder().encode(text).length;
async function hash(text:string){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text))),n=>n.toString(16).padStart(2,'0')).join('');}
export function saveSnapshot(p:any){
 return {name:p.name,wins:p.wins,losses:p.losses,recent:p.recent?.slice(-20)||[],cosmetics:p.cosmetics,completed:p.completed,appearance:p.appearance,collection:p.collection,tickets:p.tickets,dust:p.dust,pity:p.pity,drawHistory:p.drawHistory?.slice(0,5)||[],claimedDate:p.claimedDate,customDeck:p.customDeck,customExtra:p.customExtra??null,challengeBest:p.challengeBest||{},rankEnabled:p.rankEnabled===true};
}
function validate(p:any){
 if(!p||typeof p!=='object'||Array.isArray(p)||typeof p.name!=='string'||!Array.isArray(p.completed)||!Array.isArray(p.cosmetics)||!p.collection||typeof p.collection!=='object'||Array.isArray(p.collection)||!Number.isSafeInteger(p.tickets)||p.tickets<0||p.customDeck!==null&&p.customDeck!==undefined&&(!Array.isArray(p.customDeck)||p.customDeck.length!==40||p.customDeck.some((id:any)=>typeof id!=='string')))throw Error('云存档格式异常，未覆盖原有存档');
 if(p.customExtra!=null&&(!Array.isArray(p.customExtra)||p.customExtra.length>15||p.customExtra.some((id:any)=>typeof id!=='string')))throw Error('云存档额外卡组格式异常');
 return p;
}
export function splitSave(text:string){
 const result:string[]=[];let part='';for(const ch of text){if(bytes(part+ch)>900){result.push(part);part='';}part+=ch;}if(part)result.push(part);
 if(result.length>PARTS)throw Error('存档过大，未覆盖原有云存档');return result;
}
/** Two generations: commit a manifest only after every new chunk has succeeded. */
export class ToyCloudSave {
 private slot='b';private checksum='';private revision=0;private tail:Promise<any>=Promise.resolve();
 private api:Pick<ToyAPI,'getCloudStorage'|'setCloudStorage'>;
 constructor(api:Pick<ToyAPI,'getCloudStorage'|'setCloudStorage'>){this.api=api;}
 async load(){
  const all=await this.api.getCloudStorage(CLOUD_KEYS);const raw=all[PREFIX];
  if(!raw){this.slot='b';this.checksum='';return null;}
  let m:any;try{m=JSON.parse(raw);}catch{throw Error('云存档索引异常，请稍后重试');}
  if(m.v!==2||!['a','b'].includes(m.slot)||!Number.isInteger(m.count)||m.count<1||m.count>PARTS)throw Error('云存档版本或索引异常，未覆盖原有存档');
  const parts=Array.from({length:m.count},(_,i)=>all[key(m.slot,i)]);if(parts.some(p=>typeof p!=='string'))throw Error('云存档不完整，未覆盖原有存档');
  const text=parts.join('');if(await hash(text)!==m.hash)throw Error('云存档校验失败，未覆盖原有存档');
  const p=validate(JSON.parse(text));this.slot=m.slot;this.checksum=m.hash;this.revision=m.revision||0;return p;
 }
 save(profile:any){
  const snapshot=saveSnapshot(profile);
  const run=this.tail.catch(()=>{}).then(async()=>{
   const text=JSON.stringify(snapshot),checksum=await hash(text);if(checksum===this.checksum)return;
   const slot=this.slot==='a'?'b':'a',parts=splitSave(text),revision=this.revision+1;
   await this.api.setCloudStorage(Object.fromEntries(parts.map((p,i)=>[key(slot,i),p])));
   try{await this.api.setCloudStorage({[PREFIX]:JSON.stringify({v:2,slot,count:parts.length,hash:checksum,revision})});}catch(cause:any){const error:any=new Error('云端保存结果未确认，请重新连接云存档后继续');error.commitUnknown=true;error.code=cause?.code;throw error;}
   this.slot=slot;this.checksum=checksum;this.revision=revision;
  });this.tail=run;return run;
 }
}
