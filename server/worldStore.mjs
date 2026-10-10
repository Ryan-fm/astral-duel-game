import {readFileSync,writeFileSync,renameSync,mkdirSync,existsSync} from 'node:fs';
import path from 'node:path';

export const emptyWorld=()=>({schema:1,revision:0,profiles:{},games:{},rooms:{},queues:{}});
export const CAS_SCRIPT=`local current=redis.call('GET',KEYS[1]); local revision=0; if current then revision=cjson.decode(current).revision end; if revision~=tonumber(ARGV[1]) then return 0 end; redis.call('SET',KEYS[1],ARGV[2]); return 1`;

// All world transitions commit atomically. This deliberately serializes the small
// first-release pool; partition rooms before scaling beyond a small playtest.
export function createWorldStore(env=process.env){
 // Vercel's DUEL-prefixed integration credentials remain server-only.
 const standard=!!(env.UPSTASH_REDIS_REST_URL||env.UPSTASH_REDIS_REST_TOKEN);
 const url=standard?env.UPSTASH_REDIS_REST_URL:env.DUEL_KV_REST_API_URL,token=standard?env.UPSTASH_REDIS_REST_TOKEN:env.DUEL_KV_REST_API_TOKEN;
 if(!!url!==!!token)throw Error('Redis URL and token must both be configured');
 if(env.VERCEL&&!url)throw Error('Vercel requires durable Redis storage');
 if(url){
  if(env.DUEL_REDIS_SHARED==='1'&&!env.DUEL_REDIS_NAMESPACE)throw Error('Shared Redis requires an explicit game namespace');
  if(new URL(url).protocol!=='https:'&&!(env.NODE_ENV==='test'&&new URL(url).hostname==='127.0.0.1'))throw Error('Redis requires HTTPS');
  const namespace=env.DUEL_REDIS_NAMESPACE||'ruins-duel-v1';
  if(!/^[a-zA-Z0-9:_-]{1,80}$/.test(namespace))throw Error('Invalid Redis namespace');
  const key=namespace+':world';
  async function command(args){
   const res=await fetch(url,{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(args),signal:AbortSignal.timeout(5000)});
   if(!res.ok)throw Error('联机存储暂时不可用');
   const data=await res.json();if(data.error)throw Error('联机存储操作失败');return data.result;
  }
  return {kind:'redis',async read(){const raw=await command(['GET',key]);const world=raw?JSON.parse(raw):emptyWorld();if(world.schema!==1)throw Error('Unsupported world schema');return world;},async commit(expected,world){return (await command(['EVAL',CAS_SCRIPT,1,key,expected,JSON.stringify(world)]))===1;}};
 }
 const dir=env.DUEL_DATA_DIR||path.resolve('work/duel-runtime');mkdirSync(dir,{recursive:true});const file=path.join(dir,'world.json'),legacy=path.join(dir,'profiles.json');
 let current=existsSync(file)?JSON.parse(readFileSync(file,'utf8')):emptyWorld();
 if(!existsSync(file)&&existsSync(legacy)){const old=JSON.parse(readFileSync(legacy,'utf8'));for(const [id,p]of Object.entries(old))current.profiles[id]={...p,token:id,gameId:null,roomCode:null,queue:null,presence:null,memo:{}};}
 return {kind:'file',async read(){return structuredClone(current);},async commit(expected,world){if(current.revision!==expected)return false;writeFileSync(file+'.tmp',JSON.stringify(world),{mode:0o600});renameSync(file+'.tmp',file);current=structuredClone(world);return true;}};
}

export async function transact(store,mutate){
 for(let attempt=0;attempt<16;attempt++){
  const world=await store.read(),before=JSON.stringify(world);const result=mutate(world);
  if(before===JSON.stringify(world))return {world,result};
  const expected=world.revision;world.revision=expected+1;
  if(await store.commit(expected,world))return {world,result};
  await new Promise(resolve=>setTimeout(resolve,Math.min(80,5*(attempt+1))));
 }
 throw Error('联机操作繁忙，请稍后重试');
}
