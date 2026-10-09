export function connectionOutcome(members,disconnects,now){
 const gone=members.filter(t=>t!=='AI'&&disconnects[t]!==undefined);
 if(gone.length===2&&gone.every(t=>now-disconnects[t]>=60000))return {winner:null,reason:'双方断线，本局未完成'};
 if(gone.length===1&&now-disconnects[gone[0]]>=60000)return {winner:1-members.indexOf(gone[0]),reason:'对手断线超时'};
 return null;
}
