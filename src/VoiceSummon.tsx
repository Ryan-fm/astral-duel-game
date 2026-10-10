import {useEffect,useRef,useState} from 'react';
import {Microphone,MicrophoneSlash,X,Lightning} from '@phosphor-icons/react';
import {planVoiceSummon,voiceHand} from './voiceModel';
import {VoiceSession,voiceEnvironment} from './voiceSession';
import {inToyContext} from './toyPlatform';
import './PlatformFeatures.css';
export default function VoiceSummon({game,catalog,disabled,onSummon}:{game:any,catalog:Record<string,any>,disabled:boolean,onSummon:(plan:any)=>void}){
 const [open,setOpen]=useState(false),[listening,setListening]=useState(false),[level,setLevel]=useState(0),[message,setMessage]=useState(''),[uid,setUid]=useState(''),[position,setPosition]=useState('attack');
 const speech=!!((window as any).SpeechRecognition||(window as any).webkitSpeechRecognition);
 const [mode,setMode]=useState<'speech'|'energy'>(speech&&!inToyContext()?'speech':'energy');
 const session=useRef<VoiceSession|null>(null),latest=useRef(game);latest.current=game;
 const isLegal=(c:any)=>game.legal.some((a:any)=>a.cardUid===c.uid&&a.kind==='summon'||a.ritualUid===c.uid||a.fusionId===c.id);
 const hand=voiceHand(game,catalog),canStart=!disabled&&!game.paused&&!game.result&&!game.window&&game.active===game.you&&['main1','main2'].includes(game.phase)&&hand.some(isLegal);
 const selected=hand.find((c:any)=>c.uid===uid&&isLegal(c))||hand.find(isLegal);
 function stop(){session.current?.stop();session.current=null;setListening(false);}
 useEffect(()=>{stop();},[game.id,game.version,game.paused,game.result,disabled]);
 useEffect(()=>{const hide=()=>{if(document.hidden)stop();};document.addEventListener('visibilitychange',hide);return()=>{document.removeEventListener('visibilitychange',hide);session.current?.stop();};},[]);
 useEffect(()=>{const esc=(e:KeyboardEvent)=>{if(e.key==='Escape'){stop();setOpen(false);}};addEventListener('keydown',esc);return()=>removeEventListener('keydown',esc);},[]);
 function start(){
  if(!canStart)return;stop();setMessage('');const snapshot={id:game.id,version:game.version};
  const value=selected?.uid;
  const env=voiceEnvironment(inToyContext()?window.toy:undefined);
  if(inToyContext()&&!window.toy){setMessage('B站麦克风能力尚未就绪，请稍后重试');return;}
  const next=new VoiceSession(env,{level:setLevel,error:m=>{setListening(false);setMessage(m);},result:text=>{
   setListening(false);const current=latest.current;
   if(current.id!==snapshot.id||current.version!==snapshot.version){setMessage('局面已变化，请重新召唤');return;}
   const plan=planVoiceSummon(current,catalog,mode==='energy'?{uid:value,position}:{text:text||''});
   if(plan.error){setMessage(plan.error);return;}setMessage(`${text?'识别到：'+text+' · ':''}${plan.name}`);onSummon(plan);setOpen(false);
  }});session.current=next;setListening(true);void next.start(mode);
 }
 return <div className="voice-summon"><button className={'voice-trigger '+(listening?'listening':'')} aria-label="语音召唤" title="语音召唤" disabled={!canStart} onClick={()=>{if(open)stop();setOpen(v=>!v);}}><Microphone size={19}/><span>语音召唤</span></button>{open&&<section className="voice-panel" aria-label="语音召唤面板"><header><b><Microphone size={19}/>呼唤你的怪兽</b><button className="icon-btn" aria-label="关闭语音召唤" onClick={()=>{stop();setOpen(false);}}><X/></button></header><div className="voice-mode"><button className={mode==='energy'?'selected':''} disabled={listening} onClick={()=>setMode('energy')}>声量唤醒</button><button className={mode==='speech'?'selected':''} disabled={listening||!speech} onClick={()=>setMode('speech')}>识别卡名{!speech?' · 不支持':''}</button></div>{mode==='energy'?<><p>选一张怪兽，点击聆听后喊出召唤口号。按声音触发，不识别文字。</p><div className="voice-hand">{hand.filter(isLegal).map((c:any)=><button key={c.uid} disabled={listening||!isLegal(c)} className={selected?.uid===c.uid?'selected':''} aria-pressed={selected?.uid===c.uid} onClick={()=>setUid(c.uid)}><img src={catalog[c.id].face} alt=""/><span>{catalog[c.id].name}</span></button>)}</div><div className="voice-mode">{[['attack','攻击召唤'],['defense','守备召唤']].map(([v,label])=><button key={v} disabled={listening} className={position===v?'selected':''} onClick={()=>setPosition(v)}>{label}</button>)}</div></>:<p>说“召唤精灵剑士”等完整怪兽卡名；说“守备＋卡名”切换表示，融合／仪式仍需确认素材。浏览器识别可能联网处理音频。</p>}<div className="voice-meter" aria-label="麦克风声量"><i style={{width:`${level*100}%`}}/></div><div className="voice-message" role="status">{message|| (listening?mode==='speech'?'聆听中 · 请说完整卡名':'聆听中 · 先安静片刻，再喊出召唤口号':'自动使用合法落点 · 素材与祭品仍需确认')}</div><button className="primary-btn full" disabled={!canStart||mode==='energy'&&!selected} onClick={()=>listening?stop():start()}>{listening?<MicrophoneSlash/>:<Lightning/>}{listening?'停止聆听':'开始聆听'}</button><small>只在你点击后开启麦克风，完成或关闭即停止采集。</small></section>}</div>;
}
