export function onlineEndpoint(value:string|undefined){
 if(!value?.trim())return null;
 const url=new URL(value.trim());
 if(url.username||url.password||url.search||url.hash||url.pathname!=='/')throw Error('联机地址必须是服务器域名，不包含路径或凭证');
 if(url.protocol!=='https:'&&!(url.protocol==='http:'&&['localhost','127.0.0.1','[::1]'].includes(url.hostname)))throw Error('联机服务必须使用 HTTPS');
 return url.origin;
}
export function onlinePath(value:string|undefined){const path=value||'/api/duel/socket.io';if(!/^\/[a-zA-Z0-9/_.-]+$/.test(path)||path.includes('..'))throw Error('联机路径配置无效');return path;}
export async function checkOnlineAvailability(endpoint:string,request:typeof fetch=fetch){
 let status:any;
 try{const response=await request(endpoint+'/api/online-status',{signal:AbortSignal.timeout(7000)});if(!response.ok)throw Error();status=await response.json();}
 catch{throw Error('联机服务暂不可用，请继续人机决斗或稍后重试');}
 if(status?.enabled!==true)throw Error('实时 PK 暂停开放，可继续人机决斗');
}
