import {readFileSync,readdirSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

// An evidence check, not a legal clearance or an upload authorization.
export function listFiles(root){
 return readdirSync(root,{withFileTypes:true}).flatMap(e=>e.isDirectory()?listFiles(path.join(root,e.name)):[path.join(root,e.name)]).sort();
}
export function checkRights(root){
 const manifest=JSON.parse(readFileSync(path.join(root,'legal/asset-rights.json'),'utf8'));
 const policy=JSON.parse(readFileSync(path.join(root,'legal/release-policy.json'),'utf8'));
 const findings=[],seen=new Set();
 for(const filename of listFiles(path.join(root,'public'))){
  const relative=path.relative(root,filename).split(path.sep).join('/');seen.add(relative);
  const row=manifest.assets.find(a=>a.path===relative);
  if(!row){findings.push({path:relative,reason:'未登记素材'});continue;}
  const hash=createHash('sha256').update(readFileSync(filename)).digest('hex');
  if(hash!==row.sha256)findings.push({path:relative,reason:'文件已改变，许可记录需复核'});
  if(!['cc0-verified','dependency-notice','provenance-document'].includes(row.status))findings.push({path:relative,reason:row.reason||'发布权利未确认'});
 }
 for(const row of manifest.assets)if(!seen.has(row.path))findings.push({path:row.path,reason:'登记文件缺失，请更新台账'});
 for(const issue of policy.blockers)if(issue.status!=='resolved')findings.push({path:issue.scope,reason:issue.reason});
 if(policy.publicRelease!=='cleared')findings.push({path:'legal/release-policy.json',reason:'当前版本仍是本地评审原型，未获发布权利确认'});
 return {ok:findings.length===0,assetCount:seen.size,findings};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const root=fileURLToPath(new URL('../',import.meta.url)),result=checkRights(root);
 console.log(JSON.stringify(result,null,2));if(!result.ok)process.exitCode=1;
}
