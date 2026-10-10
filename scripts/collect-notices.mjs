import {readFileSync,writeFileSync,readdirSync,existsSync,mkdirSync} from 'node:fs';
import path from 'node:path';import {fileURLToPath} from 'node:url';import {createHash} from 'node:crypto';
const root=fileURLToPath(new URL('../',import.meta.url));
const lock=JSON.parse(readFileSync(path.join(root,'package-lock.json'),'utf8'));
const sections=['THIRD-PARTY NOTICES\n\nThese licenses cover the listed dependencies only. They do not license game artwork, card images, trademarks or other project content. This is a conservative inventory of production dependencies, including components not used by the standalone game.\n'],packages=[];
for(const [folder,info] of Object.entries(lock.packages)){
 if(!folder||info.dev)continue;
 const dir=path.join(root,folder);const meta=JSON.parse(readFileSync(path.join(dir,'package.json'),'utf8'));
 let names=readdirSync(dir).filter(n=>/^(LICEN[SC]E|COPYING|NOTICE|OFL)(\.|$|-)/i.test(n));
 const fallback=path.join(root,'legal/vendor',meta.name.replaceAll('/','__')+'.txt');
 if(!names.length&&!existsSync(fallback))throw Error('License text missing: '+meta.name);
 const texts=names.length?names.map(n=>({name:n,text:readFileSync(path.join(dir,n),'utf8')})):[{name:'upstream LICENSE (see legal/vendor/SOURCES.md)',text:readFileSync(fallback,'utf8')}];
 const license=meta.license||info.license||(meta.name==='xmlhttprequest-ssl'?'MIT (identified from distributed LICENSE)':'UNKNOWN');
 if(license==='UNKNOWN')throw Error('License classification needs review: '+meta.name);
 const entry={name:meta.name,version:meta.version,license,texts:texts.map(t=>({file:t.name,sha256:createHash('sha256').update(t.text).digest('hex')}))};packages.push(entry);
 sections.push(`\n========================================\n${meta.name} ${meta.version}\nLicense: ${license}\n${texts.map(t=>`\n--- ${t.name} ---\n${t.text}`).join('\n')}`);
}
mkdirSync(path.join(root,'public/legal'),{recursive:true});
writeFileSync(path.join(root,'public/legal/THIRD-PARTY-NOTICES.txt'),sections.join('\n'));
writeFileSync(path.join(root,'legal/dependency-licenses.json'),JSON.stringify({scope:'package-lock production dependencies; conservative superset of standalone game',packages},null,2)+'\n');
console.log(`Collected license texts for ${packages.length} production dependency instances.`);
