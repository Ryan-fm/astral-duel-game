// Challenge scores use only finished engine games, never a UI supplied number.
export function recordChallenge(profile, game, player) {
 if (!/^C0[1-4]$/.test(game.scenario||'') || game.result?.winner!==player) return false;
 const score=1000-Math.min(20,Math.max(1,game.turn))*25+Math.min(80,Math.floor(Math.max(0,game.players[player].lp)/100));
 profile.challengeBest||={};
 if(score<=(profile.challengeBest[game.scenario]||0))return false;
 profile.challengeBest[game.scenario]=score;return true;
}
export function challengeScore(profile){return ['C01','C02','C03','C04'].reduce((n,id)=>n+Math.max(0,Math.min(1055,Math.floor(profile.challengeBest?.[id]||0))),0);}
export function rankProfiles(profiles, mine, board=1){
 const value=p=>board===2?Math.max(0,p.wins||0):challengeScore(p);
 const ranked=[...profiles].filter(p=>value(p)>0).sort((a,b)=>value(b)-value(a));
 const index=ranked.indexOf(mine);
 return {rows:ranked.slice(0,20).map((p,i)=>({rank:i+1,score:value(p),nickname:p.name,avatar:''})),my:{ranked:index>=0,rank:index+1,score:value(mine)}};
}
