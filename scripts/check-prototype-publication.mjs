import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {checkRights} from './check-rights.mjs';

// Author publication permission is separate from third-party asset clearance.
// The strict release commands remain unchanged; this path is for the explicitly
// requested prototype publication and pins the reviewed asset/policy records.
export function checkPrototypePublication(root){
 const rights=checkRights(root),approval=JSON.parse(readFileSync(path.join(root,'legal/publication-authorization.json'),'utf8'));
 const hash=name=>createHash('sha256').update(readFileSync(path.join(root,'legal',name))).digest('hex');
 const structural=rights.findings.filter(f=>['未登记素材','登记文件缺失，请更新台账','文件已改变，许可记录需复核'].includes(f.reason));
 const permitted=approval.kind==='author-approved-prototype'&&approval.request==='公网服务部署 然后更新PR／Toy'&&approval.claimsIpClearance===false&&approval.assetManifestSha256===hash('asset-rights.json')&&approval.releasePolicySha256===hash('release-policy.json')&&structural.length===0;
 return {ok:permitted,publication:'author-approved-prototype',rightsCleared:rights.ok,assetCount:rights.assetCount,unresolvedFindings:rights.findings.length,structural,reason:permitted?'作者已明确授权发布当前原型，素材权利待确认记录保留':'发布授权缺失或本次素材／权利记录已变化，需重新复核'};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{const result=checkPrototypePublication(fileURLToPath(new URL('../',import.meta.url)));console.log(JSON.stringify(result,null,2));if(!result.ok)process.exitCode=1;}
 catch(e){console.error('原型发布检查失败：'+e.message);process.exitCode=1;}
}
