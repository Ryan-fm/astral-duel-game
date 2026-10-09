import {io} from 'socket.io-client';
export const IS_TOY=import.meta.env.VITE_TOY_MODE==='1';
export type GameConnection={connected:boolean;auth:any;on:(event:string,listener:(...args:any[])=>void)=>any;timeout:(ms:number)=>{emitWithAck:(event:string,message:any)=>Promise<any>};disconnect:()=>void};
export async function connectGame():Promise<GameConnection>{
 if(IS_TOY){const {createOfflineConnection}=await import('./offlineConnection');return createOfflineConnection();}
 return io({auth:{token:sessionStorage.getItem('duel-token')},reconnection:true,reconnectionDelay:500}) as GameConnection;
}
