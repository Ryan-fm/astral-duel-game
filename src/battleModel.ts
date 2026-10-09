// UI guidance consumes only the server's projected state and legal action list.
// It never creates moves or looks up an opponent's hidden card definition.
export function monsterPresentation(card:any){
 const palette:Record<string,number>={LIGHT:0x8aeaff,DARK:0xc598ff,EARTH:0xffce88,WIND:0x9ef3be,FIRE:0xff9b79,WATER:0x83bfff};
 return {featured:card?.kind==='monster'&&card.level>=5,color:palette[card?.attribute]||0x8aeaff};
}
export function findVisibleCard(game:any,uid:string|null){
 if(!game||!uid)return null;
 for(let player=0;player<2;player++)for(const area of ['hand','field','spells','grave']){
  const card=game.players[player][area].find((c:any)=>c?.uid===uid);
  if(card)return {card,player,area};
 }
 return null;
}
export function attackPreview(game:any,action:any,catalog:Record<string,any>){
 if(action?.kind!=='attack')return null;
 const a=findVisibleCard(game,action.cardUid);if(!a?.card.id||!catalog[a.card.id])return null;
 const atk=catalog[a.card.id].atk+(a.card.bonus||0);
 if(action.targetUid===null)return {tone:'good',text:`直接攻击 · 预计对方 LP −${atk}`,note:'预估不含陷阱、连锁和伤害减免。'};
 const b=findVisibleCard(game,action.targetUid);
 if(!b?.card.faceUp||!b.card.id||!catalog[b.card.id])return {tone:'unknown',text:'目标为盖放怪兽 · 数值未知',note:'翻开后结算，无法预估伤害。'};
 const defense=b.card.position==='defense',value=defense?catalog[b.card.id].def:catalog[b.card.id].atk+(b.card.bonus||0),delta=atk-value;
 const text=delta>0?`破坏目标 · ${defense?'无贯穿伤害':`预计对方 LP −${delta}`}`:delta<0?`${defense?'对方守备成功':'我方怪兽被破坏'} · 预计我方 LP −${-delta}`:defense?'攻击与守备相等 · 无伤害':'双方怪兽同归于尽 · 无伤害';
 return {tone:delta>=0?'good':'danger',text,note:'按当前公开数值预估；连锁效果可能改变结果。'};
}
export function unavailableReason(game:any,card:any,catalog:Record<string,any>){
 if(!game)return '查看卡牌详情';
 if(game.result)return '本局已结束';if(game.paused)return '练习已暂停，请先继续决斗';
 const loc=findVisibleCard(game,card?.uid),d=catalog[card?.id];
 if(game.window)return game.window.responder!==game.you?'等待对方连锁响应':'此卡不满足当前连锁的发动条件';
 if(game.active!==game.you)return '对手正在行动，等待你的回合或响应机会';
 if(!loc||loc.player!==game.you)return '对方卡牌只能查看；先选我方怪兽再选择攻击目标';
 if(loc.area==='grave')return '墓地卡牌需要通过复活等效果使用';
 if(loc.area==='hand'&&d?.kind==='monster'){
  if(!['main1','main2'].includes(game.phase))return '怪兽需在主要阶段召唤';
  if(game.players[game.you].normalUsed)return '本回合的通常召唤机会已使用';
  const need=d.level>=7?2:d.level>=5?1:0;
  if(game.players[game.you].field.filter(Boolean).length<need)return `上级召唤需要 ${need} 只祭品，场上数量不足`;
  return '怪兽区没有可用落点';
 }
 if(loc.area==='field'){
  if(card.attacked)return '这只怪兽本回合已经攻击';
  if(card.position==='defense'&&game.phase==='battle')return '守备表示不能攻击；在主要阶段切换表示';
  if(game.phase!=='battle')return '进入战斗阶段后才能攻击';
 }
 if(d?.kind==='trap')return card.placedTurn>=game.turn?'刚盖放的陷阱要等下一回合才能发动':'陷阱需要对应的攻击或召唤时机';
 return '当前阶段、落点或效果目标不满足条件';
}
export function battleGuidance(game:any){
 const legal=game.legal||[],you=game.players[game.you];
 if(game.result)return '决斗已完成';if(game.paused)return '练习已暂停';
 if(game.window)return game.window.responder===game.you?'对手行动中断：选择响应卡，或不响应':'等待对方响应连锁';
 if(game.active!==game.you)return '对手正在行动，你仍可查看公开卡牌';
 if(game.phase==='discard')return `手牌超过上限：还需弃置 ${Math.max(0,you.hand.length-6)} 张`;
 if(game.phase==='battle'){const count=new Set(legal.filter((a:any)=>a.kind==='attack').map((a:any)=>a.cardUid)).size;return count?`${count} 只怪兽可攻击 · 选我方怪兽，再点目标`:'没有可攻击怪兽，可进入主要阶段 2';}
 return you.normalUsed?'通常召唤已用 · 可盖放、发动效果或切换阶段':'主要阶段 · 拖动发光手牌召唤、盖放或发动效果';
}
