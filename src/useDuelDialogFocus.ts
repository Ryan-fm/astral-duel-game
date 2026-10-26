import {useEffect} from 'react';

/** Only blocking root dialogs capture focus; battle inspectors still permit board targeting. */
export function useDuelDialogFocus(key:string){
 useEffect(()=>{
  if(!key)return;
  const previous=document.activeElement instanceof HTMLElement?document.activeElement:null;
  const dialogs=document.querySelectorAll<HTMLElement>('.studio-edition > .modal-backdrop > section,.studio-edition > .paused'),dialog=dialogs[dialogs.length-1];if(!dialog)return;
  const controls=()=>Array.from(dialog.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),summary,[tabindex="0"]')).filter(el=>el.getClientRects().length>0);
  const frame=requestAnimationFrame(()=>controls()[0]?.focus({preventScroll:true}));
  const trap=(event:KeyboardEvent)=>{if(event.key!=='Tab')return;const items=controls();if(!items.length)return;const first=items[0],last=items[items.length-1];if(!dialog.contains(document.activeElement)){event.preventDefault();first.focus();}else if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}};
  dialog.addEventListener('keydown',trap);return()=>{cancelAnimationFrame(frame);dialog.removeEventListener('keydown',trap);if(previous?.isConnected)previous.focus({preventScroll:true});};
 },[key]);
}
