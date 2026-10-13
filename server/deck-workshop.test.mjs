import test from 'node:test';
import assert from 'node:assert/strict';
import {CARDS,DECKS} from './engine.mjs';
import {validateCustom,validateExtra} from './gacha.mjs';
import {deckCapacity,deckDraftIssues,deckSignature,editDeckCard,workshopCards} from '../src/deckWorkshopModel.ts';
const preset=id=>({main:DECKS.find(d=>d.id===id).cards.flatMap(c=>Array(c.count).fill(c.card_id)),extra:[...(DECKS.find(d=>d.id===id).extra||[])]});
const filter={area:'main',era:'DM',kind:'all',query:''};
test('workshop search and filters reveal only owned cards and separate Main / Extra',()=>{
 const p={collection:{gemini_elf:1,alexandrite_dragon:1}},main=workshopCards(p,CARDS,filter),extra=workshopCards(p,CARDS,{...filter,area:'extra'});
 assert.ok(main.every(c=>c.summonType!=='fusion'&&(!c.hiddenPool||p.collection[c.id])));assert.ok(extra.every(c=>c.summonType==='fusion'&&!c.hiddenPool));assert.ok(!main.some(c=>c.id==='alexandrite_dragon'));
 assert.deepEqual(workshopCards(p,CARDS,{...filter,query:'gEMIni ELF'}).map(c=>c.id),['gemini_elf']);assert.ok(workshopCards(p,CARDS,{...filter,era:'all',query:'亚历山大'}).some(c=>c.id==='alexandrite_dragon'));
 const traps=workshopCards(p,CARDS,{...filter,kind:'trap'});assert.ok(traps.length&&traps.every(c=>c.kind==='trap'));assert.deepEqual(workshopCards(p,CARDS,{...filter,query:'unknown card'}),[]);
});
test('workshop edits enforce limited cards, owned copies, deck size and correct deck area without mutating originals',()=>{
 const p={collection:{gemini_elf:1}},draft=preset('tempo_starter'),original=JSON.stringify(draft);
 assert.equal(editDeckCard(draft,'main','gemini_elf',1,p,CARDS),draft,'full Main cannot accept cards');assert.equal(deckCapacity(p,'mirror_force',CARDS),1);assert.equal(deckCapacity(p,'gemini_elf',CARDS),1);
 const shorter=editDeckCard(draft,'main','kuriboh',-1,p,CARDS);assert.equal(shorter.main.length,39);assert.equal(shorter.extra,draft.extra);assert.equal(editDeckCard(shorter,'main','mirror_force',1,p,CARDS),shorter,'limited copy cannot be added');
 assert.equal(editDeckCard(shorter,'main','b_skull_dragon',1,p,CARDS),shorter,'fusion cannot enter Main');assert.equal(editDeckCard(shorter,'extra','kuriboh',1,p,CARDS),shorter);assert.equal(editDeckCard(shorter,'main','unknown',1,p,CARDS),shorter);
 const filled=editDeckCard(shorter,'main','gemini_elf',1,p,CARDS);assert.equal(filled.main.length,40);assert.deepEqual(deckDraftIssues(filled,p,CARDS),[]);assert.deepEqual(validateCustom(p,filled.main),filled.main);assert.equal(JSON.stringify(draft),original);
 assert.equal(editDeckCard({...filled,main:filled.main.filter(c=>c!=='kuriboh')},'main','gemini_elf',1,p,CARDS).main.filter(c=>c==='gemini_elf').length,1,'owned quantity stays capped');
});
test('every template remains server-valid and incomplete or legacy over-limit drafts receive actionable issues',()=>{
 for(const d of DECKS){const draft=preset(d.id);assert.deepEqual(deckDraftIssues(draft,{},CARDS),[]);validateCustom({},draft.main);validateExtra({},draft.extra);}
 const draft=preset('tempo_starter'),partial=editDeckCard(draft,'main','kuriboh',-1,{},CARDS);assert.match(deckDraftIssues(partial,{},CARDS)[0],/还差 1 张/);
 const old={...draft,main:[...draft.main]};const index=old.main.findIndex(c=>c==='kuriboh');old.main[index]='mirror_force';assert.ok(deckDraftIssues(old,{},CARDS).some(s=>/神圣防护罩.*上限 1/.test(s)));assert.throws(()=>validateCustom({},old.main));
});
test('undo snapshots and dirty comparison preserve order-independent deck membership and separate Extra contents',()=>{
 const draft=preset('dm_fusion_starter'),key=deckSignature(draft);assert.equal(deckSignature({main:[...draft.main].reverse(),extra:[...draft.extra].reverse()}),key);
 const next=editDeckCard(draft,'main',draft.main[0],-1,{},CARDS);assert.notEqual(deckSignature(next),key);assert.equal(deckSignature(draft),key);assert.notEqual(deckSignature({...draft,extra:[]}),key);
 const restored=editDeckCard(next,'main',draft.main[0],1,{},CARDS);assert.equal(deckSignature(restored),key);
});
