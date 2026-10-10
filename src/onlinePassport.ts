import {inToyContext,inToyPreviewContext,loadToySDK,type ToyAPI} from './toyPlatform.ts';
const KEY='ruins_duel_online_v1';
export async function onlinePassport(origin:string,api?:ToyAPI){
 const preview=!api&&typeof location!=='undefined'&&inToyPreviewContext();
 // Preview hosts have no Toy id. Their temporary identity must never replace
 // the formal Toy page's account-bound cloud credential.
 let toy=api;if(!toy&&!preview&&inToyContext())toy=await loadToySDK();
 const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(origin));
 const key=KEY+'_'+Array.from(new Uint8Array(digest)).map(n=>n.toString(16).padStart(2,'0')).join('').slice(0,20);
 let token:string|undefined;
 if(toy){const values=await toy.getCloudStorage([key]);token=values[key];}
 else token=sessionStorage.getItem(key)||undefined;
 if(token&&!/^[a-f0-9]{64}$/.test(token))throw Error('联机云凭证异常，未覆盖原存档');
 return {token,cloud:!!toy,async save(next:string){
  if(token&&next!==token)throw Error('联机身份不一致，未覆盖原存档');
  if(token===next)return;
  if(toy){const prior=await toy.getCloudStorage([key]);if(prior[key]&&prior[key]!==next)throw Error('另一页面已创建联机身份，请重新连接恢复');await toy.setCloudStorage({[key]:next});const check=await toy.getCloudStorage([key]);if(check[key]!==next)throw Error('联机凭证尚未确认保存，请重新连接');}
  else sessionStorage.setItem(key,next);
  token=next;
 }};
}
