export type MusicTrack='lobby'|'summon'|'battle'|'danger';
export const MUSIC_TRACKS:Record<MusicTrack,{title:string,url:string}>={
 lobby:{title:'遗迹序章',url:'/game-assets/music/lobby.mp3'},
 summon:{title:'秘藏的回应',url:'/game-assets/music/summon.mp3'},
 battle:{title:'决斗之刻',url:'/game-assets/music/battle.mp3'},
 danger:{title:'逆转之焰',url:'/game-assets/music/danger.mp3'}
};
export function musicForState(game:any,panel:string):MusicTrack{
 if(game&&!game.result)return game.players?.some((p:any)=>p.lp<=2500)?'danger':'battle';
 return panel==='summon'?'summon':'lobby';
}
export type MusicStatus='waiting'|'loading'|'playing'|'muted'|'paused'|'error';
export type MusicInfo={status:MusicStatus,track:MusicTrack|null};
type Voice={track:MusicTrack,source:AudioBufferSourceNode,gain:GainNode,retiring?:boolean};
/** One context, cached audio and revision-guarded transitions across all game screens. */
export class GameAudio{
 private context:AudioContext|null=null;
 private desired:MusicTrack|null=null;
 private current:Voice|null=null;
 private voices=new Set<Voice>();
 private buffers=new Map<MusicTrack,Promise<AudioBuffer>>();
 private enabled=true;private volume=.3;private visible=true;private paused=false;private revision=0;
 private listeners=new Set<(info:MusicInfo)=>void>();
 private info:MusicInfo={status:'waiting',track:null};
 private createContext:()=>AudioContext;private fetchAudio:typeof fetch;
 constructor(createContext=()=>new AudioContext(),fetchAudio:typeof fetch=(input,init)=>fetch(input,init)){this.createContext=createContext;this.fetchAudio=fetchAudio;}
 subscribe(callback:(info:MusicInfo)=>void){this.listeners.add(callback);callback(this.info);return ()=>{this.listeners.delete(callback);};}
 private report(status:MusicStatus){this.info={status,track:this.current?.track||null};this.listeners.forEach(fn=>fn(this.info));}
 async unlock(){
  if(!this.visible)return;
  try{this.context ||= this.createContext();if(this.context.state!=='running')await this.context.resume();if(this.context.state==='running')void this.reconcile();else this.report('waiting');}catch{this.report('waiting');}
 }
 configure(enabled:boolean,volume:number){
  const changed=this.enabled!==enabled;this.enabled=enabled;this.volume=Math.max(0,Math.min(1,Number.isFinite(volume)?volume:.3));
  if(changed)this.revision++;
  if(this.current&&enabled)this.ramp(this.current.gain,this.volume, .12);
  if(!enabled){this.silence(.08);this.report('muted');}else if(changed)void this.reconcile();
 }
 setTrack(track:MusicTrack,paused=false){if(this.desired===track&&this.paused===paused)return;this.desired=track;this.paused=paused;this.revision++;void this.reconcile();}
 setVisible(visible:boolean){if(this.visible===visible)return;this.visible=visible;this.revision++;if(!visible){this.silence(0);this.report('paused');void this.context?.suspend().catch(()=>{});}else void this.unlock();}
 private ramp(gain:GainNode,value:number,seconds:number){const t=this.context!.currentTime;gain.gain.cancelScheduledValues(t);gain.gain.setValueAtTime(gain.gain.value,t);gain.gain.linearRampToValueAtTime(value,t+seconds);}
 private retire(voice:Voice,seconds:number){if(voice.retiring&&seconds>0)return;voice.retiring=true;this.ramp(voice.gain,0,seconds);try{voice.source.stop(this.context!.currentTime+seconds+.015);}catch{};}
 private silence(seconds:number){for(const voice of this.voices)this.retire(voice,seconds);this.current=null;}
 private load(track:MusicTrack){
  let pending=this.buffers.get(track);
  if(!pending){pending=this.fetchAudio(MUSIC_TRACKS[track].url).then(r=>{if(!r.ok)throw new Error('Audio unavailable');return r.arrayBuffer();}).then(data=>this.context!.decodeAudioData(data));this.buffers.set(track,pending);pending.catch(()=>{if(this.buffers.get(track)===pending)this.buffers.delete(track);});}
  return pending;
 }
 private async reconcile(){
  if(!this.enabled){this.report('muted');return;}
  if(!this.visible||this.paused){this.silence(.15);this.report('paused');return;}
  if(!this.desired||this.context?.state!=='running'){this.report('waiting');return;}
  if(this.current?.track===this.desired){this.report('playing');return;}
  const track=this.desired,revision=this.revision;this.report('loading');
  try{
   const buffer=await this.load(track);
   if(revision!==this.revision||!this.enabled||!this.visible||this.paused||this.context?.state!=='running')return;
   // Repeated unlock gestures may share the same pending decode: start just one voice.
   if(this.current?.track===track){this.report('playing');return;}
   const source=this.context.createBufferSource(),gain=this.context.createGain();source.buffer=buffer;source.loop=true;source.connect(gain);gain.connect(this.context.destination);gain.gain.setValueAtTime(0,this.context.currentTime);
   const voice={track,source,gain};source.onended=()=>{source.disconnect();gain.disconnect();this.voices.delete(voice);};
   for(const old of this.voices)this.retire(old,1.35);this.current=voice;this.voices.add(voice);source.start();this.ramp(gain,this.volume,1.35);this.report('playing');
  }catch(error){if(revision===this.revision){console.warn('Game music could not load',error);this.report('error');}}
 }
 stop(){this.revision++;this.desired=null;this.silence(0);this.report('waiting');}
 playCue(kind:string,rarity?:string){
  const ctx=this.context;if(!this.visible||ctx?.state!=='running')return;
  const charge=kind==='charging',attack=kind==='attack';const tones=charge?[110]:kind==='revealed'?(['SR','UR'].includes(rarity||'')?[261.6,329.6,392,523.2]:[329.6,440]):[attack?140:440];
  for(const frequency of tones){const osc=ctx.createOscillator(),gain=ctx.createGain();osc.type='sine';osc.frequency.setValueAtTime(frequency,ctx.currentTime);if(charge||attack||kind==='summon')osc.frequency.exponentialRampToValueAtTime(charge?880:attack?70:880,ctx.currentTime+(charge?1.8:.2));gain.gain.setValueAtTime(.001,ctx.currentTime);gain.gain.exponentialRampToValueAtTime(charge?.035:.045,ctx.currentTime+.04);const duration=charge?2:kind==='revealed'?1.1:.35;gain.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+duration);osc.connect(gain);gain.connect(ctx.destination);osc.onended=()=>{osc.disconnect();gain.disconnect();};osc.start();osc.stop(ctx.currentTime+duration+.05);}
 }
}
let shared:GameAudio|undefined;
export const gameAudio=()=>shared ||= new GameAudio();
export const unlockGameAudio=()=>{void gameAudio().unlock();};
