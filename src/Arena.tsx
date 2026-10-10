import {useEffect,useRef,useState,type RefObject} from 'react';
import {siteKey,type DropSite,type ArenaDropApi} from './cardDrop';
import * as THREE from 'three';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {summonEffect,attackEffect,disposeEffect,type ArenaEffect} from './arenaEffects';
import {monsterPresentation,shouldShowMonster} from './battleModel';
import {cards} from './cardRegistry';
import {createAncientArena} from './ancientArena';
import {createCityArena} from './cityArena';
const CARD:Record<string,any>=cards;
export default function Arena({game,deck,theme='night',onPick,effects=true,reduced=false,skip=0,heroId='celtic_guardian',active=true,selectedUid=null,targetUids=[],targetUid=null,tributeUids=[],dropApi,dropSites=[],dropHover=null,dragging=false}:{game:any,deck:string,theme?:string,onPick:(uid:string)=>void,effects?:boolean,reduced?:boolean,skip?:number,heroId?:string,active?:boolean,selectedUid?:string|null,targetUids?:string[],targetUid?:string|null,tributeUids?:string[],dropApi?:RefObject<ArenaDropApi|null>,dropSites?:DropSite[],dropHover?:DropSite|null,dragging?:boolean}){
 const host=useRef<HTMLDivElement>(null),latest=useRef({game,deck,onPick,effects,reduced,skip,heroId,active,selectedUid,targetUids,targetUid,tributeUids,dropSites,dropHover,dragging});latest.current={game,deck,onPick,effects,reduced,skip,heroId,active,selectedUid,targetUids,targetUid,tributeUids,dropSites,dropHover,dragging};
 const [error,setError]=useState(false);
 useEffect(()=>{
  if(!host.current)return;const el=host.current;let renderer:THREE.WebGLRenderer;
  try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});}catch{setError(true);return;}
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.02;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;el.appendChild(renderer.domElement);const labelLayer=document.createElement('div');labelLayer.className='arena-label-layer';el.appendChild(labelLayer);const labels:Array<{node:HTMLElement,anchor:THREE.Vector3}>=[];
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(35,1,.1,120);camera.position.set(0,14.5,16);camera.lookAt(0,0,0);
  scene.add(new THREE.HemisphereLight(0xcde5ff,0x3a4254,1.3));const key=new THREE.DirectionalLight(theme==='city'?0xadddff:0xffdfb0,2.7);key.position.set(-7,14,8);key.castShadow=true;key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-12,right:12,top:11,bottom:-11,near:1,far:40});key.shadow.bias=-.0003;key.shadow.normalBias=.045;scene.add(key);const rim=new THREE.DirectionalLight(0x9fb5ce,1.7);rim.position.set(6,9,-9);scene.add(rim);const fill=new THREE.DirectionalLight(0xc6d8ff,.65);fill.position.set(9,5,9);scene.add(fill);
  const pmrem=new THREE.PMREMGenerator(renderer),environment=new RoomEnvironment(),env=pmrem.fromScene(environment,.04);scene.environment=env.texture;scene.environmentIntensity=.4;environment.dispose();pmrem.dispose();
  const loader=new THREE.TextureLoader(),textures=new Map<string,THREE.Texture>();
  function tex(url:string){let t=textures.get(url);if(!t){t=loader.load(url);t.colorSpace=THREE.SRGBColorSpace;textures.set(url,t);}return t;}
  const ancient=theme==='city'?createCityArena():createAncientArena();scene.add(ancient.group);
  const entities=new THREE.Group();scene.add(entities);const transient=new THREE.Group();scene.add(transient);let version='',frame=0,alive=true;const seen=new Set<string>();let lastTime=performance.now();
  const births=new Map<string,number>();const pickables:THREE.Object3D[]=[];const slots=new Map<string,THREE.Vector3>();
  function disposeGroup(group:THREE.Group){for(const obj of [...group.children]){group.remove(obj);obj.traverse((o:any)=>{o.geometry?.dispose();if(o.material){for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();}});}}
  function cardMesh(c:any,x:number,z:number,own:boolean){const url=c.id&& (own||c.faceUp)?CARD[c.id].face:'/game-assets/card-back.png';const mat=new THREE.MeshStandardMaterial({map:tex(url),roughness:.45,metalness:.12,side:THREE.DoubleSide,color:!c.id||(!own&&!c.faceUp)?(latest.current.game?.players[1-latest.current.game.you]?.appearance?.back==='blue_back'?0x72eaff:latest.current.game?.players[1-latest.current.game.you]?.appearance?.back==='intro_back'?0xffe1a8:0xffffff):0xffffff});const mesh=new THREE.Mesh(new THREE.PlaneGeometry(1.5,2.18),mat);mesh.rotation.x=-Math.PI/2;mesh.position.set(x,.07,z);if(c.position==='defense')mesh.rotation.z=Math.PI/2;mesh.receiveShadow=true;mesh.userData.uid=c.uid;pickables.push(mesh);entities.add(mesh);slots.set(c.uid,mesh.position.clone());return mesh;}
  function creature(id:string,x:number,z:number,hall=false,uid?:string){
   const ace=monsterPresentation(CARD[id]).featured,cutout=!hall&&['blue_eyes','dark_magician'].includes(id),url=cutout?(id==='blue_eyes'?'/game-assets/blue-eyes.png':'/game-assets/dark-magician.png'):CARD[id].face;
   const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:tex(url),transparent:true,depthWrite:false,color:0xffffff,toneMapped:false}));
   const ownCount=latest.current.game?.players.flatMap((p:any)=>p.field).filter((c:any)=>c?.faceUp&&monsterPresentation(CARD[c.id]).featured).length||0;
   const h=hall?7:ace?(ownCount<=2?3.9:3):2,w=cutout&&id==='blue_eyes'?h*1.5:h*2/3;
   sprite.scale.set(w,h,1);sprite.position.set(x,h*.48+.3,z);if(uid){sprite.userData.uid=uid;sprite.userData.baseScale=sprite.scale.clone();pickables.push(sprite);}entities.add(sprite);
   const ring=new THREE.Mesh(new THREE.PlaneGeometry(hall?7:2.6,hall?7:2.6),new THREE.MeshBasicMaterial({map:tex('/game-assets/summon-circle.png'),color:latest.current.game?.players[latest.current.game.you]?.appearance?.summon==='violet'?0xc88aff:monsterPresentation(CARD[id]).color,transparent:true,opacity:.7,depthWrite:false}));ring.rotation.x=-Math.PI/2;ring.position.set(x,.09,z);entities.add(ring);
  }
  function labelControl(c:any,x:number,z:number,own:boolean,area:string){
   const button=document.createElement('button'),l=latest.current,d=c.id?CARD[c.id]:null;
   const tribute=l.tributeUids.includes(c.uid);const legal=l.game.legal.some((a:any)=>a.cardUid===c.uid),target=l.targetUids.includes(c.uid),chosen=l.targetUid===c.uid;
   button.dataset.cardUid=c.uid;button.dataset.player=String(own?l.game.you:1-l.game.you);button.dataset.area=area;
   button.className='field-card-control'+(legal?' is-legal':'')+(l.selectedUid===c.uid?' is-selected':'')+(target?' is-target':'')+(chosen?' is-chosen':'')+(tribute?' is-tribute':'');
   button.setAttribute('aria-label',`${target?'选择目标：':''}${own?'我方':'对方'} ${d?.name||'未知盖牌'}${d?.kind==='monster'?' '+(c.position==='defense'?'守备 '+d.def:'攻击 '+(d.atk+(c.bonus||0))):''}`);
   button.setAttribute('aria-pressed',String(l.selectedUid===c.uid||chosen));
   const title=document.createElement('b');title.textContent=d?.name||'未知盖牌';button.append(title);
   const stats=document.createElement('small');stats.textContent=d?.kind==='monster'?`${c.position==='defense'?'DEF':'ATK'} ${c.position==='defense'?d.def:d.atk+(c.bonus||0)}`:c.faceUp?'已发动':'盖放';button.append(stats);
   if(area==='field'){const status=document.createElement('span');status.className='card-state';status.textContent=tribute?'将作为祭品':target?'点击选为目标':own&&c.attacked?'本回合已攻击':legal?'可操作':c.position==='defense'?'守备表示':'攻击表示';button.append(status);}
   button.onclick=()=>latest.current.onPick(c.uid);labelLayer.append(button);labels.push({node:button,anchor:new THREE.Vector3(x,.2,z+(area==='field'?1.22:.85))});
  }
  function zoneControl(x:number,z:number,site:DropSite){const node=document.createElement('span'),chosen=siteKey(latest.current.dropHover)===siteKey(site);node.className='drop-zone-label'+(chosen?' is-hovered':'');node.textContent=chosen?'松手放置':'拖入这里';if(site.type==='zone'){node.dataset.dropZone=String(site.zone);node.dataset.dropArea=site.area;node.dataset.dropPlayer=String(site.player);}labelLayer.append(node);labels.push({node,anchor:new THREE.Vector3(x,.25,z)});}
  function rebuild(){const {game:g,deck:d}=latest.current;disposeGroup(entities);pickables.length=0;slots.clear();labels.length=0;labelLayer.replaceChildren();
   if(!g){creature(latest.current.heroId,-3,-.5,true);return;}
   for(let p=0;p<2;p++){const own=p===g.you,near=own?1:-1;for(const area of ['field','spells'])for(let i=0;i<5;i++){
    const x=(own?i:4-i)*3-6,z=near*(area==='field'?2.4:5.3);
    const dropSite=latest.current.dropSites.find(s=>s.type==='zone'&&s.player===p&&s.area===area&&s.zone===i),hovered=!!dropSite&&siteKey(dropSite)===siteKey(latest.current.dropHover);
    const c=g.players[p][area][i],available=c&&g.legal.some((a:any)=>a.cardUid===c.uid);const zone=new THREE.Mesh(new THREE.BoxGeometry(2.18,.045,2.5),new THREE.MeshStandardMaterial({color:hovered?0x816b30:dropSite?0x277384:own?(theme==='city'?0x316d88:0x6e8e8c):(theme==='city'?0x715190:0x957975),emissive:hovered?0xb78628:dropSite?0x127a89:own?0x123d57:0x422143,emissiveIntensity:hovered?2.2:dropSite?1.3:available?2:.5,metalness:.2,roughness:.7,transparent:true,opacity:hovered?.78:dropSite?.48:.1}));zone.receiveShadow=true;zone.position.set(x,.015,z);entities.add(zone);
    const edge=new THREE.LineSegments(new THREE.EdgesGeometry(zone.geometry),new THREE.LineBasicMaterial({color:hovered?0xffd36f:dropSite?0x96faff:available?0xbaf8ff:own?0x82b7b7:0xd3a19a,transparent:true,opacity:dropSite||available?1:.55}));edge.position.copy(zone.position);entities.add(edge);
    if(c){cardMesh(c,x,z,own);if(shouldShowMonster(c,area))creature(c.id,x,z,false,c.uid);labelControl(c,x,z,own,area);}if(dropSite)zoneControl(x,z,dropSite);
   }}
  }
  const fx:Array<ArenaEffect&{start:number}>=[];let cinema:{start:number,pos:THREE.Vector3}|null=null,oldSkip=latest.current.skip;
  function animateEvent(e:any,now:number,previousSlots:Map<string,THREE.Vector3>){
   if(!latest.current.effects||latest.current.reduced)return;const position=slots.get(e.uid)||previousSlots.get(e.uid);if(!position)return;
   let effect:ArenaEffect|null=null;
   if(e.type==='summon'){
    const {featured:ace,color}=monsterPresentation(CARD[e.id]);
    births.set(e.uid,now);if(ace)cinema={start:now,pos:position.clone()};
    effect=summonEffect(position,color,tex('/game-assets/summon-circle.png'),ace);
   }else if(e.type==='attack'){
    const end=(slots.get(e.targetUid)||previousSlots.get(e.targetUid))?.clone()||new THREE.Vector3(0,.4,e.player===latest.current.game.you?-6:6);
    effect=attackEffect(position,end);
   }
   if(effect){transient.add(effect.group);fx.push({...effect,start:now});}
  }
  function resize(){const w=el.clientWidth,h=el.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}const observer=new ResizeObserver(resize);observer.observe(el);resize();
  const ray=new THREE.Raycaster();let pointerDown:{x:number,y:number,angle:number}|null=null,angle=0;
  const down=(e:PointerEvent)=>{pointerDown={x:e.clientX,y:e.clientY,angle};renderer.domElement.setPointerCapture(e.pointerId);};
  const move=(e:PointerEvent)=>{if(pointerDown)angle=Math.max(-.65,Math.min(.65,pointerDown.angle+(e.clientX-pointerDown.x)*.003));};
  const cancel=()=>{pointerDown=null;};
  const up=(e:PointerEvent)=>{if(!pointerDown)return;const moved=e.clientX-pointerDown.x;if(Math.hypot(moved,e.clientY-pointerDown.y)>12){pointerDown=null;return;}const rect=renderer.domElement.getBoundingClientRect();ray.setFromCamera(new THREE.Vector2((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1),camera);const hit=ray.intersectObjects(pickables,true)[0];if(hit?.object.userData.uid)latest.current.onPick(hit.object.userData.uid);pointerDown=null;};
  function locateSite(uid:string):DropSite|null{const g=latest.current.game;if(!g)return null;for(let player=0;player<2;player++)for(const area of ['field','spells'] as const){const zone=g.players[player][area].findIndex((c:any)=>c?.uid===uid);if(zone>=0)return {type:'zone',player,area,zone,uid};}return null;}
  const boardPlane=new THREE.Plane(new THREE.Vector3(0,1,0),-.05);
  if(dropApi)dropApi.current={
   hitTest:(x,y)=>{const g=latest.current.game,rect=renderer.domElement.getBoundingClientRect();if(!g||x<rect.left||x>rect.right||y<rect.top||y>rect.bottom)return null;
    const label=document.elementFromPoint(x,y)?.closest<HTMLElement>('[data-card-uid]');if(label){const site=locateSite(label.dataset.cardUid!);if(site)return site;}
    ray.setFromCamera(new THREE.Vector2((x-rect.left)/rect.width*2-1,-(y-rect.top)/rect.height*2+1),camera);
    const hit=ray.intersectObjects(pickables,true).find(h=>latest.current.dropSites.some(s=>s.type==='zone'&&s.uid===h.object.userData.uid));if(hit)return locateSite(hit.object.userData.uid);
    const point=ray.ray.intersectPlane(boardPlane,new THREE.Vector3());if(!point)return null;
    const own=point.z>0,player=own?g.you:1-g.you,area=Math.abs(point.z)<3.85?'field':'spells',row=area==='field'?2.4:5.3;
    if(Math.abs(Math.abs(point.z)-row)>1.35)return null;
    const column=Math.round((point.x+6)/3);if(column<0||column>4||Math.abs(point.x-(column*3-6))>1.4)return null;
    const zone=own?column:4-column;return {type:'zone',player,area,zone,uid:g.players[player][area][zone]?.uid};
   },
   center:site=>{if(site.type!=='zone')return null;const own=site.player===latest.current.game?.you,x=(own?site.zone:4-site.zone)*3-6,z=(own?1:-1)*(site.area==='field'?2.4:5.3),p=new THREE.Vector3(x,.25,z).project(camera),rect=renderer.domElement.getBoundingClientRect();return {x:rect.left+(p.x+1)*rect.width/2,y:rect.top+(1-p.y)*rect.height/2};}
  };
  renderer.domElement.addEventListener('pointerdown',down);renderer.domElement.addEventListener('pointerup',up);renderer.domElement.addEventListener('pointermove',move);renderer.domElement.addEventListener('pointercancel',cancel);renderer.domElement.style.touchAction='none';
  renderer.domElement.addEventListener('webglcontextlost',()=>setError(true));
  function loop(now:number){if(!alive)return;if(!latest.current.active){lastTime=now;frame=requestAnimationFrame(loop);return;}const g=latest.current.game,next=g?g.id+':'+g.version+':'+latest.current.selectedUid+':'+latest.current.targetUid+':'+latest.current.targetUids.join(',')+':'+latest.current.tributeUids.join(',')+':'+JSON.stringify(latest.current.dropSites)+':'+siteKey(latest.current.dropHover):latest.current.deck+latest.current.heroId;if(next!==version){version=next;const previousSlots=new Map([...slots].map(([uid,p])=>[uid,p.clone()]));rebuild();for(const e of g?.events||[]){const key=e.eventId||e.id+':'+e.uid;if(!seen.has(key)){seen.add(key);animateEvent(e,now,previousSlots);}}}
   lastTime=now;if(!latest.current.effects||latest.current.reduced||oldSkip!==latest.current.skip){for(const f of fx){transient.remove(f.group);disposeEffect(f.group);}fx.length=0;entities.traverse((o:any)=>{if(o.isSprite&&o.userData.baseScale){o.scale.copy(o.userData.baseScale);o.material.opacity=1;}});births.clear();cinema=null;oldSkip=latest.current.skip;}
   for(let i=fx.length-1;i>=0;i--){const f=fx[i],t=(now-f.start)/f.duration;if(t>=1){transient.remove(f.group);disposeEffect(f.group);fx.splice(i,1);}else f.update(Math.max(0,t));}
   entities.traverse((object:any)=>{if(!object.isSprite||!object.userData.uid)return;const born=births.get(object.userData.uid);if(!born)return;const t=latest.current.effects&&!latest.current.reduced?Math.min(1,(now-born)/1100):1;object.scale.copy(object.userData.baseScale).multiplyScalar(.25+.75*(1-Math.pow(1-t,3)));object.material.opacity=Math.min(1,t*1.7);if(t>=1)births.delete(object.userData.uid);});
   let blend=0;if(cinema){const t=(now-cinema.start)/3000;if(t>=1||latest.current.selectedUid||latest.current.dragging||g?.window)cinema=null;else blend=Math.sin(t*Math.PI)*.8;}
   camera.position.set(Math.sin(angle)*17.5*(1-blend)+(cinema?.pos.x||0)*blend*.5,12.5-blend*6,Math.cos(angle)*17.5-blend*4);
   camera.lookAt(cinema?cinema.pos.x*blend:g?0:-1,blend,cinema?cinema.pos.z*blend:0);camera.updateMatrixWorld();for(const {node,anchor} of labels){const p=anchor.clone().project(camera);node.style.left=((p.x+1)*50)+'%';node.style.top=((1-p.y)*50)+'%';node.style.visibility=p.z<1?'visible':'hidden';}renderer.render(scene,camera);frame=requestAnimationFrame(loop);
  }frame=requestAnimationFrame(loop);
  return()=>{if(dropApi)dropApi.current=null;alive=false;cancelAnimationFrame(frame);observer.disconnect();disposeGroup(entities);disposeGroup(transient);ancient.dispose();textures.forEach(t=>t.dispose());env.dispose();renderer.dispose();renderer.domElement.remove();labelLayer.remove();};
 },[theme]);
 return <div className="arena-canvas" ref={host} aria-label="3D 遗迹决斗场：拖动空白场地旋转视角，点击卡牌查看详情">{error&&<div className="webgl-error">当前浏览器无法渲染 3D 场景，请使用支持 WebGL 的浏览器。</div>}</div>;
}
