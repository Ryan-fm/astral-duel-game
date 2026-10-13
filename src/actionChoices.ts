const strategic=new Set(['fusionId','ritualUid','materialUids','tributes','targetUid']);
export type ActionSelection={key:string,options:string[],value:string,required:boolean,enabled:boolean,complete:boolean};
/** Placement may default. Targets and sacrifices must come from a deliberate choice. */
export function actionChoices(actions:any[],choices:Record<string,string>,automatic=false){
 let candidates=actions,ready=true;const selections:ActionSelection[]=[];
 for(const key of ['position','fusionId','ritualUid','materialUids','tributes','targetUid','zone']){
  if(key==='zone'&&automatic||!candidates.length||!(key in candidates[0]))continue;
  const options=[...new Set<string>(candidates.map(a=>JSON.stringify(a[key])))];
  const required=strategic.has(key)&&!(key==='tributes'&&options.every(v=>v==='[]'));
  const enabled=ready,raw=choices[key]||'',complete=options.includes(raw);
  const value=complete?raw:required?raw:options[0];
  selections.push({key,options,value,required,enabled,complete:required?complete:true});
  if(required&&!complete)ready=false;
  if(options.includes(value))candidates=candidates.filter(a=>JSON.stringify(a[key])===value);
 }
 return {selections,action:ready?candidates[0]:null};
}
export function materialChoice(s:ActionSelection,uid:string){
 let selected:string[]=[];try{selected=JSON.parse(s.value||'[]');}catch{}
 const next=selected.includes(uid)?selected.filter(x=>x!==uid):[...selected,uid];
 const groups=s.options.map(v=>JSON.parse(v) as string[]);
 if(!groups.some(g=>next.every(id=>g.includes(id))))return s.value;
 // Use the server's order for a complete group, preserving command identity.
 return JSON.stringify(groups.find(g=>g.length===next.length&&next.every(id=>g.includes(id)))||next);
}
