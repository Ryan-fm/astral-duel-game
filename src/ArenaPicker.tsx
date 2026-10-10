import {Check} from '@phosphor-icons/react';
import './ArenaPicker.css';
const scenes=[{id:'night',name:'古罗马遗迹',image:'roman-arena.jpg'},{id:'city',name:'霓虹都市',image:'arena.png'}];
export default function ArenaPicker({value,onChange,disabled=false}:{value:string,onChange:(id:string)=>void,disabled?:boolean}){
 return <fieldset className="arena-picker"><legend>选择场景</legend><div>{scenes.map(s=><button type="button" key={s.id} disabled={disabled} aria-pressed={(value==='ice'?'night':value)===s.id} onClick={()=>onChange(s.id)} style={{backgroundImage:`linear-gradient(0deg,#061321ee,transparent 80%),url('/game-assets/${s.image}')`}}><span>{s.name}</span>{(value==='ice'?'night':value)===s.id&&<Check size={18}/>}</button>)}</div></fieldset>;
}
