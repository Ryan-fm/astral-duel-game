import {useEffect,useRef,useState} from 'react';
import * as THREE from 'three';
const palette:Record<string,number>={N:0x8ce7ef,R:0x7ca8ff,SR:0xc99cff,UR:0xffd174};
export default function DeckCardStage({card,reduced,pulse}:{card:any,reduced:boolean,pulse:number}){
 const host=useRef<HTMLDivElement>(null),latest=useRef({card,reduced,pulse});latest.current={card,reduced,pulse};
 const [ready,setReady]=useState(false),[fallback,setFallback]=useState(false);
 useEffect(()=>{
  const el=host.current;if(!el)return;
  let renderer:THREE.WebGLRenderer;
  try{renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});}catch{setFallback(true);return;}
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;
  el.appendChild(renderer.domElement);
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(34,1,.1,30);camera.position.set(0,1,5.8);camera.lookAt(0,.5,0);
  scene.add(new THREE.HemisphereLight(0xe8f4ff,0x19324b,2.2));
  const key=new THREE.DirectionalLight(0xfff1d6,3.2);key.position.set(-3,4,5);scene.add(key);
  const glow=new THREE.PointLight(palette.N,12,14);glow.position.set(2,2,1);scene.add(glow);
  const loader=new THREE.TextureLoader(),textures=new Map<string,THREE.Texture>();let alive=true,activeURL='',needsPaint=true;
  function texture(url:string){
   let t=textures.get(url);
   if(t){textures.delete(url);textures.set(url,t);return t;}
   t=loader.load(url,()=>{if(!alive)return;needsPaint=true;if(url===activeURL&&textures.get(url)===t){setReady(true);setFallback(false);}},undefined,()=>{if(alive&&url===activeURL)setFallback(true);});t.colorSpace=THREE.SRGBColorSpace;textures.set(url,t);
   if(textures.size>9)for(const [old,value] of textures){if(old!==url&&old!==activeURL&&old!=='/game-assets/card-back.png'&&old!=='/game-assets/summon-circle.png'){textures.delete(old);value.dispose();break;}}
   return t;
  }
  const front=new THREE.MeshPhysicalMaterial({roughness:.42,metalness:.02,clearcoat:.65,clearcoatRoughness:.22});
  const back=new THREE.MeshStandardMaterial({map:texture('/game-assets/card-back.png'),roughness:.5});
  const edge=new THREE.MeshStandardMaterial({color:0xcbb897,roughness:.55,metalness:.15});
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(1.75,2.55,.045),[edge,edge,edge,edge,front,back]);mesh.position.y=.7;scene.add(mesh);
  const sealMat=new THREE.MeshBasicMaterial({map:texture('/game-assets/summon-circle.png'),color:palette.N,transparent:true,opacity:.36,depthWrite:false});
  const seal=new THREE.Mesh(new THREE.PlaneGeometry(3.6,3.6),sealMat);seal.rotation.x=-Math.PI/2;seal.position.y=-.8;scene.add(seal);
  const points=new Float32Array(36*3);for(let i=0;i<36;i++){const angle=i/36*Math.PI*2;points.set([Math.cos(angle)*1.5,(i%7)*.38-.6,Math.sin(angle)*.8-.6],i*3);}
  const moteGeometry=new THREE.BufferGeometry();moteGeometry.setAttribute('position',new THREE.BufferAttribute(points,3));
  const moteMat=new THREE.PointsMaterial({size:.023,color:palette.N,transparent:true,opacity:.48,depthWrite:false,blending:THREE.AdditiveBlending});const motes=new THREE.Points(moteGeometry,moteMat);scene.add(motes);
  let frame=0,lastPaint=0,shown='',selectedAt=0,flashAt=-10000,lastPulse=-1,aimX=0,aimY=.15;
  const move=(e:PointerEvent)=>{if(latest.current.reduced)return;const r=el.getBoundingClientRect();aimX=-((e.clientY-r.top)/r.height-.5)*.22;aimY=((e.clientX-r.left)/r.width-.5)*.5;needsPaint=true;};
  const leave=()=>{aimX=0;aimY=.15;};
  const resize=()=>{if(!el.clientWidth||!el.clientHeight)return;renderer.setSize(el.clientWidth,el.clientHeight,false);camera.aspect=el.clientWidth/el.clientHeight;camera.updateProjectionMatrix();needsPaint=true;};
  const observer=new ResizeObserver(resize);observer.observe(el);resize();
  function render(now:number){
   if(!alive)return;frame=requestAnimationFrame(render);if(document.hidden||!el?.clientWidth||!el?.clientHeight||now-lastPaint<33)return;
   const v=latest.current,url=v.card?.face;
   if(url&&shown!==url){shown=url;activeURL=url;selectedAt=now;setReady(false);front.map=texture(url);front.needsUpdate=true;if(front.map.image){setReady(true);setFallback(false);}const color=palette[v.card.rarity||'N'];glow.color.setHex(color);sealMat.color.setHex(color);moteMat.color.setHex(color);front.iridescence=v.card.rarity==='UR'?.3:v.card.rarity==='SR'?.18:0;needsPaint=true;}
   if(lastPulse!==v.pulse){lastPulse=v.pulse;if(v.pulse)flashAt=now;needsPaint=true;}
   if(v.reduced&&!needsPaint)return;lastPaint=now;needsPaint=false;
   const t=now*.001,arrival=v.reduced?1:Math.min(1,(now-selectedAt)/500),ease=1-Math.pow(1-arrival,3),flash=v.reduced?0:Math.max(0,1-(now-flashAt)/650);
   mesh.rotation.x+=((v.reduced?0:aimX)-mesh.rotation.x)*.09;mesh.rotation.y+=(aimY-mesh.rotation.y)*.09;mesh.rotation.z=v.reduced?0:Math.sin(t*.65)*.013;mesh.position.y=.7+(v.reduced?0:Math.sin(t*1.5)*.045);mesh.scale.setScalar(.92+ease*.08+flash*.035);
   seal.rotation.z=v.reduced?0:t*.15;sealMat.opacity=.32+flash*.32;glow.intensity=9+flash*9;motes.rotation.y=v.reduced?0:t*.08;moteMat.opacity=.4+flash*.35;renderer.render(scene,camera);
  }
  const lost=(e:Event)=>{e.preventDefault();if(alive){setFallback(true);cancelAnimationFrame(frame);}};
  el.addEventListener('pointermove',move);el.addEventListener('pointerleave',leave);el.addEventListener('pointerup',leave);el.addEventListener('pointercancel',leave);renderer.domElement.addEventListener('webglcontextlost',lost);frame=requestAnimationFrame(render);
  return()=>{alive=false;cancelAnimationFrame(frame);observer.disconnect();el.removeEventListener('pointermove',move);el.removeEventListener('pointerleave',leave);el.removeEventListener('pointerup',leave);el.removeEventListener('pointercancel',leave);renderer.domElement.removeEventListener('webglcontextlost',lost);scene.traverse((o:any)=>{o.geometry?.dispose();if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();});textures.forEach(t=>t.dispose());renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();};
 },[]);
 return <div className={'workshop-stage '+(ready&&!fallback?'is-ready':'is-fallback')} aria-label={`${card.name} 3D 卡面预览`}><div ref={host} className="workshop-stage-canvas" aria-hidden="true"/><img className="workshop-stage-fallback" src={card.face} alt={card.name} draggable={false}/>{fallback&&<small>卡面预览</small>}<span className="stage-caption">{reduced||fallback?'完整卡面':'全息卡台 · 拖动查看卡面'}</span></div>;
}
