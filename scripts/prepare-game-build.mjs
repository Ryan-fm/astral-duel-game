import {rmSync,readdirSync,readFileSync} from 'node:fs';
// Standalone game does not use protected mobile device images.
// Remove copies from generated output only; never touch runtime source assets.
const edition=process.argv[2]||'game';if(!['game','solo'].includes(edition))throw Error('Unknown game build edition');
const output=new URL('../dist/'+edition+'/',import.meta.url);
for(const name of ['android','iphone','status'])rmSync(new URL(`assets/${name}/`,output),{recursive:true,force:true});
for(const name of readdirSync(new URL('assets/',output))){if(!name.endsWith('.js'))continue;const code=readFileSync(new URL('assets/'+name,output),'utf8');if(/\breadFileSync\s*\(/.test(code))throw Error('Game browser bundle contains server-only filesystem access: '+name);}
