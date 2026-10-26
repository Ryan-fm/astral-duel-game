import {readFileSync,writeFileSync,readdirSync,statSync,rmSync,existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

// Optional publication step after build:toy. Requires the official libwebp cwebp CLI.
// Rebuilding restores dist/toy. Source assets and card faces are never modified.
const root=fileURLToPath(new URL('../dist/toy/',import.meta.url));
if(!existsSync(path.join(root,'index.html')))throw Error('Build Toy before optimizing its package');
execFileSync('cwebp',['-version'],{stdio:'ignore'});
const walk=dir=>readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);
const bytes=()=>walk(root).reduce((n,p)=>n+statSync(p).size,0),hash=file=>createHash('sha256').update(readFileSync(file)).digest('hex');
const before=bytes(),conversions=[];
const images=walk(path.join(root,'game-assets')).filter(file=>{
 const relative=path.relative(path.join(root,'game-assets'),file);
 return !relative.includes(path.sep)&&file.endsWith('.png')||path.dirname(relative)==='pbr'&&/\.(jpg|png)$/.test(file);
});
for(const file of images){
 const destination=file.replace(/\.(jpg|png)$/,'.webp');
 execFileSync('cwebp',['-quiet','-q','95','-m','6','-alpha_q','100',file,'-o',destination],{stdio:'pipe'});
 const inputBytes=statSync(file).size,outputBytes=statSync(destination).size;
 // Always keep one consistent suffix for the procedural PBR texture family.
 if(outputBytes>=inputBytes&&!file.includes(path.sep+'pbr'+path.sep)){rmSync(destination);continue;}
 conversions.push({source:path.relative(root,file).split(path.sep).join('/'),output:path.relative(root,destination).split(path.sep).join('/'),inputBytes,outputBytes,inputSha256:hash(file),outputSha256:hash(destination)});
 rmSync(file);
}
const mappings=new Map(conversions.map(row=>[path.basename(row.source),path.basename(row.output)]));
for(const suffix of ['_diff','_nor_gl','_arm']){
 const family=images.filter(p=>p.endsWith(suffix+'.jpg')&&path.dirname(p)===path.join(root,'game-assets/pbr'));
 if(family.length&&family.every(p=>mappings.has(path.basename(p))))mappings.set(suffix+'.jpg',suffix+'.webp');
}
for(const file of walk(root).filter(p=>/\.(js|css|html)$/.test(p))){
 let code=readFileSync(file,'utf8');
 // Longer basenames first, followed by the dynamically constructed PBR suffixes.
 for(const [from,to]of [...mappings].sort((a,b)=>b[0].length-a[0].length))code=code.split(from).join(to);
 writeFileSync(file,code);
}
// Scanned glTF's original JPEG files and JSON references remain byte-identical.
const report={format:'toy-webp-transport-v1',encoder:'libwebp cwebp, quality 95 / alpha 100, original dimensions',sourceAssetsUnchanged:true,cardFacesUnchanged:true,scannedModelUnchanged:true,beforeBytes:before,afterBytes:bytes(),conversions};
writeFileSync(path.join(root,'asset-transforms.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({beforeMiB:before/1048576,afterMiB:report.afterBytes/1048576,images:conversions.length,report:'dist/toy/asset-transforms.json'},null,2));
