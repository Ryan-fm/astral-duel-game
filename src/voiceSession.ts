import {VoiceEnergyGate} from './voiceModel.ts';
import type {ToyAPI} from './toyPlatform.ts';
export type VoiceEnvironment={microphone:()=>Promise<MediaStream>,release:(stream:MediaStream)=>Promise<void>,context:()=>AudioContext,recognizer?:()=>any,raf:(fn:FrameRequestCallback)=>number,cancelRaf:(id:number)=>void,now:()=>number};
export function voiceEnvironment(toy?:ToyAPI):VoiceEnvironment{
 const Recognition=(window as any).SpeechRecognition||(window as any).webkitSpeechRecognition;
 return {microphone:()=>toy?toy.requestMicrophone():navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:false}}),release:async s=>{try{if(toy)await toy.stopMedia(s);}finally{s.getTracks().forEach(t=>t.stop());}},context:()=>new AudioContext(),recognizer:Recognition?()=>new Recognition():undefined,raf:requestAnimationFrame,cancelRaf:cancelAnimationFrame,now:()=>performance.now()};
}
export class VoiceSession {
 private alive=true;private stream:MediaStream|null=null;private audio:AudioContext|null=null;private recognition:any=null;private frame=0;private timer:ReturnType<typeof setTimeout>|null=null;private source:MediaStreamAudioSourceNode|null=null;private analyser:AnalyserNode|null=null;
 private env:VoiceEnvironment;private callbacks:{level:(n:number)=>void,result:(text:string|null)=>void,error:(message:string)=>void};
 constructor(env:VoiceEnvironment,callbacks:{level:(n:number)=>void,result:(text:string|null)=>void,error:(message:string)=>void}){this.env=env;this.callbacks=callbacks;}
 async start(mode:'speech'|'energy'){
  try{
   if(mode==='speech'&&!this.env.recognizer)throw Error('当前浏览器不支持卡名识别，请切换声量唤醒');
   // Request in the click call stack, before any async work; Toy checks user activation.
   this.audio=this.env.context();void this.audio.resume().catch(()=>{});const pending=this.env.microphone();
   const stream=await pending;
   if(!this.alive){await this.env.release(stream);return;}this.stream=stream;
   this.source=this.audio.createMediaStreamSource(stream);this.analyser=this.audio.createAnalyser();this.analyser.fftSize=1024;this.source.connect(this.analyser);
   const samples=new Float32Array(this.analyser.fftSize),gate=new VoiceEnergyGate(),start=this.env.now();
   const tick=()=>{if(!this.alive)return;this.analyser!.getFloatTimeDomainData(samples);const rms=Math.sqrt(samples.reduce((n,v)=>n+v*v,0)/samples.length);this.callbacks.level(Math.min(1,rms*7));if(mode==='energy'&&gate.sample(rms,this.env.now()-start)){this.finish(null);return;}this.frame=this.env.raf(tick);};
   this.frame=this.env.raf(tick);
   if(mode==='speech'){
    this.recognition=this.env.recognizer!();this.recognition.lang='zh-CN';this.recognition.continuous=false;this.recognition.interimResults=false;this.recognition.maxAlternatives=1;
    this.recognition.onresult=(event:any)=>{if(!this.alive)return;for(let i=event.resultIndex||0;i<event.results.length;i++)if(event.results[i].isFinal){this.finish(event.results[i][0].transcript);return;}};
    this.recognition.onerror=(e:any)=>{if(!this.alive)return;this.fail(({ 'not-allowed':'麦克风或识别权限被拒绝，请在浏览器设置中开启',network:'语音识别服务不可用，可切换声量唤醒','no-speech':'没有听到卡名，请再试一次','audio-capture':'麦克风不可用，请检查设备'} as Record<string,string>)[e.error]||'卡名识别失败，可切换声量唤醒');};
    this.recognition.onend=()=>{if(this.alive)this.fail('未识别到完整卡名，请再试一次');};
    this.recognition.start(stream.getAudioTracks()[0]);
   }
   this.timer=setTimeout(()=>this.fail('聆听已结束，点击后可重新召唤'),10000);
  }catch(e:any){if(this.alive)this.fail(e.name==='NotAllowedError'?'麦克风权限被拒绝，请在浏览器设置中开启':e.message||'麦克风暂时不可用');}
 }
 private finish(text:string|null){if(!this.alive)return;this.stop();this.callbacks.result(text);}
 private fail(message:string){if(!this.alive)return;this.stop();this.callbacks.error(message);}
 stop(){
  if(!this.alive)return;this.alive=false;if(this.timer)clearTimeout(this.timer);this.env.cancelRaf(this.frame);
  if(this.recognition){this.recognition.onresult=this.recognition.onerror=this.recognition.onend=null;try{this.recognition.abort();}catch{}}
  this.source?.disconnect();this.analyser?.disconnect();if(this.audio)void this.audio.close().catch(()=>{});
  if(this.stream)void this.env.release(this.stream).catch(()=>{});this.callbacks.level(0);
 }
}
