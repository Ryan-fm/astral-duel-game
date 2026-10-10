import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync,readFileSync} from 'node:fs';import {tmpdir} from 'node:os';import path from 'node:path';import {createHash} from 'node:crypto';
import {checkRights} from '../scripts/check-rights.mjs';
import {checkPrototypePublication} from '../scripts/check-prototype-publication.mjs';
function fixture(){
 const root=mkdtempSync(path.join(tmpdir(),'duel-rights-'));mkdirSync(path.join(root,'public'));mkdirSync(path.join(root,'legal'));
 writeFileSync(path.join(root,'public','stone.txt'),'stone');
 const manifest={assets:[{path:'public/stone.txt',sha256:createHash('sha256').update('stone').digest('hex'),status:'cc0-verified'}]},policy={publicRelease:'cleared',blockers:[]};
 const save=()=>{writeFileSync(path.join(root,'legal/asset-rights.json'),JSON.stringify(manifest));writeFileSync(path.join(root,'legal/release-policy.json'),JSON.stringify(policy));};save();return {root,manifest,policy,save,close:()=>rmSync(root,{recursive:true,force:true})};
}
test('release check allows only an unchanged registered package with resolved review policy',()=>{const f=fixture();try{assert.equal(checkRights(f.root).ok,true);f.policy.publicRelease='blocked';f.save();assert.equal(checkRights(f.root).ok,false);}finally{f.close();}});
test('new, changed and removed packaged assets invalidate the reviewed inventory',()=>{const f=fixture();try{writeFileSync(path.join(f.root,'public/new.txt'),'unknown');writeFileSync(path.join(f.root,'public/stone.txt'),'changed');let r=checkRights(f.root);assert.ok(r.findings.some(x=>x.reason==='未登记素材'));assert.ok(r.findings.some(x=>x.reason.includes('已改变')));rmSync(path.join(f.root,'public/stone.txt'));assert.ok(checkRights(f.root).findings.some(x=>x.reason.includes('缺失')));}finally{f.close();}});
test('attribution or a permissive code notice cannot clear unlicensed card imagery',()=>{const f=fixture();try{f.manifest.assets[0].status='ip-authorization-missing';f.manifest.assets[0].source='API with attribution';f.save();assert.equal(checkRights(f.root).ok,false);f.manifest.assets[0].status='cc0-verified';f.policy.blockers=[{scope:'branding',status:'unresolved',reason:'IP permission missing'}];f.save();assert.equal(checkRights(f.root).ok,false);}finally{f.close();}});
test('current game inventory covers all public assets and explicitly blocks public release',()=>{const root=new URL('../',import.meta.url);const r=checkRights(root.pathname);assert.equal(r.ok,false);assert.equal(r.findings.some(x=>x.reason==='未登记素材'),false);assert.equal(r.findings.some(x=>x.reason.includes('已改变')),false);assert.ok(r.findings.some(x=>x.path.includes('/cards/')));});
test('prototype authorization does not clear rights and expires on asset or policy changes',()=>{
 const f=fixture();try{
  f.policy.publicRelease='blocked';f.manifest.assets[0].status='ip-authorization-missing';f.save();
  const hash=name=>createHash('sha256').update(readFileSync(path.join(f.root,'legal',name))).digest('hex');
  const approval={kind:'author-approved-prototype',request:'公网服务部署 然后更新PR／Toy',claimsIpClearance:false,assetManifestSha256:hash('asset-rights.json'),releasePolicySha256:hash('release-policy.json')};
  const saveApproval=()=>writeFileSync(path.join(f.root,'legal/publication-authorization.json'),JSON.stringify(approval));saveApproval();
  assert.equal(checkPrototypePublication(f.root).ok,true);assert.equal(checkPrototypePublication(f.root).rightsCleared,false);assert.equal(checkRights(f.root).ok,false);
  approval.claimsIpClearance=true;saveApproval();assert.equal(checkPrototypePublication(f.root).ok,false);approval.claimsIpClearance=false;saveApproval();
  writeFileSync(path.join(f.root,'public/stone.txt'),'changed');assert.equal(checkPrototypePublication(f.root).ok,false);writeFileSync(path.join(f.root,'public/stone.txt'),'stone');
  f.policy.reviewedAt='changed';f.save();assert.equal(checkPrototypePublication(f.root).ok,false);
 }finally{f.close();}
});
