import scenarioData from '../server/scenarios.json' with {type:'json'};

export type DuelHubMode='journey'|'practice'|'pvp';
export type JourneyChapter={id:string;sigil:string;name:string;theme:string;stageIds:readonly string[]};
export const JOURNEY_CHAPTERS:readonly JourneyChapter[]=[
 {id:'departure',sigil:'Ⅰ',name:'启程与攻防',theme:'召唤 · 攻击 · 上级',stageIds:['T01','T02','C01']},
 {id:'counter',sigil:'Ⅱ',name:'连锁与反击',theme:'响应 · 突破 · 逆转',stageIds:['T03','C02','C03']},
 {id:'ritual',sigil:'Ⅲ',name:'融合与仪式',theme:'素材 · 祭品 · 墓地',stageIds:['T04','T05','C04']},
 {id:'heroes',sigil:'Ⅳ',name:'GX 英雄试炼',theme:'英雄 · 奇迹 · 双重攻击',stageIds:['T06','T07','C05']},
];
export type JourneyStage={id:string;name:string;objective:string;chapterId:string;kind:'lesson'|'challenge';tickets:number;packs:number};
const catalogue=new Map(scenarioData.map(row=>[row[0],row]));
export const JOURNEY_STAGES:readonly JourneyStage[]=JOURNEY_CHAPTERS.flatMap(chapter=>chapter.stageIds.map(id=>{
 const row=catalogue.get(id);
 if(!row)throw new Error(`Unknown journey scenario: ${id}`);
 return {id,name:row[1].replace(/^GX · /,''),objective:row[2],chapterId:chapter.id,kind:id.startsWith('C')?'challenge':'lesson',tickets:id.startsWith('C')?5:3,packs:1};
}));
const stageIds=new Set(JOURNEY_STAGES.map(stage=>stage.id));
/** Reads the authoritative archive; this does not infer wins, unlocks or rewards. */
export function completedJourneyStages(completed?:string[]):Set<string>{
 return new Set(Array.isArray(completed)?completed.filter(id=>stageIds.has(id)):[]);
}
export function nextJourneyStage(completed?:string[]):string|null{
 const done=completedJourneyStages(completed);
 return JOURNEY_STAGES.find(stage=>!done.has(stage.id))?.id??null;
}
export function journeyProgress(completed?:string[]):{done:number;total:number;nextId:string|null;nextName:string}{
 const done=completedJourneyStages(completed),next=JOURNEY_STAGES.find(stage=>!done.has(stage.id));
 return {done:done.size,total:JOURNEY_STAGES.length,nextId:next?.id??null,nextName:next?.name??'全部试炼已完成'};
}
