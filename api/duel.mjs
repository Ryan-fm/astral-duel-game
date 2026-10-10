import {createDuelServer} from '../server/app.mjs';
const service=createDuelServer({env:{...process.env,DUEL_SOCKET_PATH:'/api/duel/socket.io'}});
// Vercel can forward the rewritten function path during an upgrade. Restore
// only this endpoint's canonical Engine.IO path before its upgrade listener.
service.server.prependListener('upgrade',req=>{
 const url=new URL(req.url,'https://duel.invalid');
 if(['/api/duel','/socket.io','/socket.io/','/api/duel/socket.io','/api/duel/socket.io/'].includes(url.pathname))req.url='/api/duel/socket.io/'+url.search;
});
export default service.server;
