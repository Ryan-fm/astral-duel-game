import {readFileSync,writeFileSync,renameSync,rmSync,existsSync,readdirSync} from 'node:fs';
const dir=new URL('../dist/toy/',import.meta.url);if(existsSync(new URL('game.html',dir)))renameSync(new URL('game.html',dir),new URL('index.html',dir));
for(const name of ['android','iphone','status'])rmSync(new URL(`assets/${name}`,dir),{recursive:true,force:true});
// Runtime card catalogs contain public-root paths in the full server edition.
for(const name of readdirSync(new URL('assets/',dir))){if(!name.endsWith('.js'))continue;const file=new URL(`assets/${name}`,dir),code=readFileSync(file,'utf8');if(/\breadFileSync\s*\(/.test(code))throw new Error('Toy browser bundle still contains server-only filesystem access: '+name);writeFileSync(file,code.replace(/(?<![.\w])\/game-assets\//g,'./game-assets/'));}
// Exclude retired backgrounds only when the final browser bundles do not reference them.
// Source artwork and the rights inventory stay intact for local review.
const browserCode=readdirSync(new URL('assets/',dir)).filter(name=>/\.(js|css)$/.test(name)).map(name=>readFileSync(new URL(`assets/${name}`,dir),'utf8')).join('\n');
for(const name of ['metal-floor.png','roman-arena-refined.jpg','roman-arena.jpg','roman-stone.jpg']){
 if(!browserCode.includes(name))rmSync(new URL(`game-assets/${name}`,dir),{force:true});
}
