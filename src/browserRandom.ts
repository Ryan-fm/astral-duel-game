export const randomUUID=()=>crypto.randomUUID();
export function randomInt(max:number){if(!Number.isSafeInteger(max)||max<1)throw new Error('无效随机范围');const limit=Math.floor(0x100000000/max)*max,b=new Uint32Array(1);do{crypto.getRandomValues(b);}while(b[0]>=limit);return b[0]%max;}
