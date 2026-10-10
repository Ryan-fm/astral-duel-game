import {useEffect,useState} from 'react';
import {gameAudio,musicForState,type MusicInfo} from './gameAudio';
export function useGameMusic(game:any,panel:string,settings:any){
 const [info,setInfo]=useState<MusicInfo>({status:'waiting',track:null});
 const track=musicForState(game,panel);
 useEffect(()=>{
  const player=gameAudio(),unsubscribe=player.subscribe(setInfo);
  const unlock=()=>{void player.unlock();},visibility=()=>player.setVisible(!document.hidden);
  window.addEventListener('pointerdown',unlock,true);window.addEventListener('keydown',unlock,true);document.addEventListener('visibilitychange',visibility);visibility();
  return()=>{unsubscribe();window.removeEventListener('pointerdown',unlock,true);window.removeEventListener('keydown',unlock,true);document.removeEventListener('visibilitychange',visibility);player.stop();};
 },[]);
 useEffect(()=>gameAudio().configure(settings.music!==false,(settings.musicVolume??30)/100),[settings.music,settings.musicVolume]);
 useEffect(()=>gameAudio().setTrack(track,!!game?.paused),[track,game?.paused]);
 return info;
}
