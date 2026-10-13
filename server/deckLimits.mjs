// A published balance table for this curated DM prototype, not an OCG/TCG list.
export const DECK_LIMITS_VERSION='dm-balance-2026-10';
export const DECK_LIMITS_NAME='DM 经典平衡表 · 2026.10';
export const DECK_LIMITS={monster_reborn:1,mirror_force:1,magic_cylinder:1,trap_hole:2,negate_attack:2};
export const cardLimit=id=>DECK_LIMITS[id]??3;
export function deckLimitIssues(list,catalog){
 const counts={};for(const id of list||[])counts[id]=(counts[id]||0)+1;
 return Object.entries(counts).filter(([id,n])=>n>cardLimit(id)).map(([id,count])=>({id,count,limit:cardLimit(id),name:catalog[id]?.name||id}));
}
export function assertDeckLimits(list,catalog){
 const issue=deckLimitIssues(list,catalog)[0];if(issue)throw Error(`${issue.name}最多加入 ${issue.limit} 张（当前 ${issue.count} 张）；请按 DM 经典平衡表调整卡组`);
}
