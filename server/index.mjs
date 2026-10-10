import path from 'node:path';
import {fileURLToPath} from 'node:url';
import express from 'express';
import {createDuelServer} from './app.mjs';
const root=path.resolve(fileURLToPath(new URL('..',import.meta.url)));
const service=createDuelServer({env:{...process.env,DUEL_DATA_DIR:process.env.DUEL_DATA_DIR||path.resolve(root,'../../work/duel-runtime')}});
if(process.env.NODE_ENV==='production'){
 service.app.use(express.static(path.join(root,'dist/game')));service.app.get('/',(_,res)=>res.redirect('/game.html'));
}else{
 const {createServer}=await import('vite');const vite=await createServer({root,configFile:path.join(root,'vite.config.ts'),server:{middlewareMode:true},appType:'mpa'});service.app.use(vite.middlewares);
}
const port=Number(process.env.PORT||5175),host=process.env.HOST||'127.0.0.1';
service.server.listen(port,host,()=>console.log(`DUEL_URL=http://${host}:${port}/game.html`));
for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>void service.close().finally(()=>process.exit(0)));
