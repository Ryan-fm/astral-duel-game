import {useEffect,useRef,useState,type RefObject} from 'react';
import {siteKey,type DropSite,type ArenaDropApi} from './cardDrop';
import * as THREE from 'three';
import {HDRLoader} from 'three/addons/loaders/HDRLoader.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {summonEffect,attackEffect,disposeEffect,type ArenaEffect} from './arenaEffects';
import {monsterPresentation,shouldShowMonster} from './battleModel';
import {fieldMarker,markerGlyph,packFieldMarkers} from './fieldMarkers';
import {cards} from './cardRegistry';
import {createKingdomCliffs} from './kingdomCliffs';
import {createAncientArena} from './ancientArena';
import {createCityArena} from './cityArena';
import {createZoneInlay} from './arenaStage';
import {createArenaRendering,type ArenaQuality} from './arenaRendering';
const CARD:Record<string,any>=cards;
export default function Arena({game,deck,theme='night',onPick,effects=true,reduced=false,skip=0,heroId='celtic_guardian',active=true,selectedUid=null,targetUids=[],targetUid=null,tributeUids=[],dropApi,dropSites=[],dropHover=null,dragging=false,quality='auto'}:{game:any,deck:string,theme?:string,onPick:(uid:string)=>void,effects?:boolean,reduced?:boolean,skip?:number,heroId?:string,active?:boolean,selectedUid?:string|null,targetUids?:string[],targetUid?:string|null,tributeUids?:string[],dropApi?:RefObject<ArenaDropApi|null>,dropSites?:DropSite[],dropHover?:DropSite|null,dragging?:boolean,quality?:ArenaQuality}){
 const host=useRef<HTMLDivElement>(null),latest=useRef({game,deck,onPick,effects,reduced,skip,heroId,active,selectedUid,targetUids,targetUid,tributeUids,dropSites,dropHover,dragging,quality});latest.current={game,deck,onPick,effects,reduced,skip,heroId,active,selectedUid,targetUids,targetUid,tributeUids,dropSites,dropHover,dragging,quality};
 const [error,setError]=useState(false);
 useEffect(()=>{
  if(!host.current)return;const el=host.current;let renderer:THREE.WebGLRenderer;
  try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});}catch{setError(true);return;}
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.02;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;el.appendChild(renderer.domElement);const labelLayer=document.createElement('div');labelLayer.className='arena-label-layer';el.appendChild(labelLayer);const labels:Array<{node:HTMLElement,anchor:THREE.Vector3,row?:string,width?:number,above?:boolean}>=[];
  const spatial=theme!=='city',scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(spatial?45:35,1,.1,300);if(spatial){scene.background=new THREE.Color(0x66758f);scene.fog=new THREE.FogExp2(0x869dba,.0085);}let alive=true,skyTexture:THREE.DataTexture|null=null,skyEnv:THREE.WebGLRenderTarget|null=null;camera.position.set(0,14.5,16);camera.lookAt(0,0,0);
  scene.add(new THREE.HemisphereLight(theme==='city'?0xcde5ff:0x889bc9,0x3a4254,spatial?.55:1.3));const key=new THREE.DirectionalLight(theme==='city'?0xadddff:0xffe3c2,spatial?3.1:2.4);key.position.set(spatial?-12:-7,spatial?20:14,spatial?4:8);key.castShadow=true;key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:spatial?-23:-12,right:spatial?23:12,top:spatial?23:11,bottom:spatial?-23:-11,near:1,far:spatial?160:40});key.shadow.bias=-.0003;key.shadow.normalBias=.025;key.shadow.radius=spatial?3:1;scene.add(key);const rim=new THREE.DirectionalLight(spatial?0xa8c5ec:0x9fb5ce,spatial?.55:1.7);rim.position.set(6,9,-9);scene.add(rim);const fill=new THREE.DirectionalLight(0xc6d8ff,spatial?.32:.65);fill.position.set(9,5,9);scene.add(fill);
  const pmrem=new THREE.PMREMGenerator(renderer),environment=new RoomEnvironment(),env=pmrem.fromScene(environment,.04);scene.environment=env.texture;scene.environmentIntensity=spatial?.22:.4;environment.dispose();pmrem.dispose();
  const loader=new THREE.TextureLoader(),textures=new Map<string,THREE.Texture>();
  function tex(url:string,data=false){let t=textures.get(url);if(!t){t=loader.load(url,ready=>{scene.traverse((object:any)=>{for(const material of Array.isArray(object.material)?object.material:object.material?[object.material]:[]){for(const key of ['map','bumpMap','normalMap','roughnessMap','aoMap','alphaMap'])if(material[key]?.source===ready.source)material[key].needsUpdate=true;}});});t.colorSpace=data?THREE.NoColorSpace:THREE.SRGBColorSpace;textures.set(url,t);}return t;}
  const stoneMaps=(name:string)=>({color:tex('/game-assets/pbr/'+name+'_diff.jpg'),normal:tex('/game-assets/pbr/'+name+'_nor_gl.jpg',true),arm:tex('/game-assets/pbr/'+name+'_arm.jpg',true)});
  const ancient=theme==='city'?createCityArena():createAncientArena({floor:stoneMaps('monastery_stone_floor'),stone:stoneMaps('sandstone_cracks')},{ground:stoneMaps('leafy_grass'),path:stoneMaps('monastery_stone_floor'),twig:tex('/game-assets/pbr/pine_twig_diff.jpg'),alpha:tex('/game-assets/pbr/pine_twig_alpha.png',true),bark:tex('/game-assets/pbr/pine_bark_diff.jpg')});scene.add(ancient.group);const cliffs=spatial?createKingdomCliffs():null;if(cliffs)scene.add(cliffs.group);
  if(spatial)new HDRLoader().load('/game-assets/pbr/kloppenheim_06_puresky_1k.hdr',hdr=>{
   if(!alive){hdr.dispose();return;}skyTexture=hdr;hdr.mapping=THREE.EquirectangularReflectionMapping;
   const generator=new THREE.PMREMGenerator(renderer);skyEnv=generator.fromEquirectangular(hdr);generator.dispose();scene.background=hdr;scene.backgroundIntensity=.52;scene.backgroundRotation.set(-.2,.65,0);scene.environment=skyEnv.texture;scene.environmentIntensity=.38;scene.environmentRotation.set(-.2,.65,0);
  });
  const entities=new THREE.Group();scene.add(entities);const transient=new THREE.Group();scene.add(transient);const rendering=spatial?createArenaRendering(renderer,scene,camera,[entities,transient]):null;let version='',frame=0;const seen=new Set<string>();let lastTime=performance.now();
  const births=new Map<string,number>();const pickables:THREE.Object3D[]=[];const slots=new Map<string,THREE.Vector3>();
  function disposeGroup(group:THREE.Group){for(const obj of [...group.children]){group.remove(obj);obj.traverse((o:any)=>{o.geometry?.dispose();if(o.material){for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();}});}}
  function cardMesh(c:any,x:number,z:number,own:boolean){const stock=new THREE.Mesh(new THREE.BoxGeometry(1.53,.04,2.21),new THREE.MeshStandardMaterial({color:0xd4cab7,roughness:.8}));stock.position.set(x,.05,z);if(c.position==='defense')stock.rotation.y=Math.PI/2;stock.castShadow=true;stock.receiveShadow=true;entities.add(stock);const url=c.id&& (own||c.faceUp)?CARD[c.id].face:'/game-assets/card-back.png';const mat=new THREE.MeshStandardMaterial({map:tex(url),roughness:.65,metalness:0,side:THREE.DoubleSide,color:!c.id||(!own&&!c.faceUp)?(latest.current.game?.players[1-latest.current.game.you]?.appearance?.back==='blue_back'?0x72eaff:latest.current.game?.players[1-latest.current.game.you]?.appearance?.back==='intro_back'?0xffe1a8:0xffffff):0xffffff});const mesh=new THREE.Mesh(new THREE.PlaneGeometry(1.5,2.18),mat);mesh.rotation.x=-Math.PI/2;mesh.position.set(x,.075,z);if(c.position==='defense')mesh.rotation.z=Math.PI/2;mesh.receiveShadow=true;mesh.userData.uid=c.uid;pickables.push(mesh);entities.add(mesh);slots.set(c.uid,mesh.position.clone());return mesh;}
  const shadowCanvas=document.createElement('canvas');shadowCanvas.width=shadowCanvas.height=128;const shadowCtx=shadowCanvas.getContext('2d')!;const shadowGradient=shadowCtx.createRadialGradient(64,64,8,64,64,64);shadowGradient.addColorStop(0,'rgba(0,0,0,.65)');shadowGradient.addColorStop(.4,'rgba(0,0,0,.35)');shadowGradient.addColorStop(1,'rgba(0,0,0,0)');shadowCtx.fillStyle=shadowGradient;shadowCtx.fillRect(0,0,128,128);const contactTexture=new THREE.CanvasTexture(shadowCanvas);
  function creature(id:string,x:number,z:number,hall=false,uid?:string){
   const ace=monsterPresentation(CARD[id]).featured,cutout=!hall&&['blue_eyes','dark_magician'].includes(id),url=cutout?(id==='blue_eyes'?'/game-assets/blue-eyes.png':'/game-assets/dark-magician.png'):CARD[id].face;
   const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:tex(url),transparent:true,depthWrite:false,color:0xffffff,toneMapped:false}));
   const ownCount=latest.current.game?.players.flatMap((p:any)=>p.field).filter((c:any)=>c?.faceUp&&monsterPresentation(CARD[c.id]).featured).length||0;
   const h=hall?7:ace?(ownCount<=2?3.9:3):2,w=cutout&&id==='blue_eyes'?h*1.5:h*2/3;
   sprite.scale.set(w,h,1);sprite.position.set(x,h*.48+.3,z);if(uid){sprite.userData.uid=uid;sprite.userData.baseScale=sprite.scale.clone();pickables.push(sprite);}entities.add(sprite);
   if(!hall){const shadow=new THREE.Mesh(new THREE.PlaneGeometry(2.7,2.7),new THREE.MeshBasicMaterial({map:contactTexture,transparent:true,opacity:.65,depthWrite:false,toneMapped:false}));shadow.rotation.x=-Math.PI/2;shadow.position.set(x,.045,z+.3);entities.add(shadow);}
   const ring=new THREE.Mesh(new THREE.PlaneGeometry(hall?7:2.6,hall?7:2.6),new THREE.MeshBasicMaterial({map:tex('/game-assets/summon-circle.png'),color:latest.current.game?.players[latest.current.game.you]?.appearance?.summon==='violet'?0xc88aff:monsterPresentation(CARD[id]).color,transparent:true,opacity:hall?.55:.38,depthWrite:false}));ring.rotation.x=-Math.PI/2;ring.position.set(x,.09,z);entities.add(ring);
  }
  function labelControl(c:any,x:number,z:number,own:boolean,area:string,zone:number){
   const button=document.createElement('button'),l=latest.current;
   const tribute=l.tributeUids.includes(c.uid),legal=l.game.legal.some((a:any)=>a.cardUid===c.uid),target=l.targetUids.includes(c.uid),chosen=l.targetUid===c.uid;
   const activating=!!l.game.pending?.chain?.some((link:any)=>link.id===c.id&&link.player===(own?l.game.you:1-l.game.you))&&l.game.events.some((event:any)=>event.type==='activate'&&event.uid===c.uid);
   const marker=fieldMarker(c,own,area,zone,CARD,activating);
   button.dataset.cardUid=c.uid;button.dataset.player=String(own?l.game.you:1-l.game.you);button.dataset.area=area;button.dataset.zone=String(zone);
   button.className='field-card-control field-marker kind-'+marker.kind+(marker.combat?' is-combat':'')+(!own?' is-opponent':'')+(activating?' is-activating':'')+(legal?' is-legal':'')+(l.selectedUid===c.uid?' is-selected':'')+(target?' is-target':'')+(chosen?' is-chosen':'')+(tribute?' is-tribute':'');
   button.setAttribute('aria-label',(target?'选择目标：':'')+marker.ariaLabel);button.setAttribute('aria-pressed',String(l.selectedUid===c.uid||chosen));
   const tether=document.createElement('span');tether.className='marker-tether';tether.setAttribute('aria-hidden','true');button.append(tether);
   const surface=document.createElement('span');surface.className='marker-surface';surface.setAttribute('aria-hidden','true');surface.append(markerGlyph(marker.icon));
   if(marker.combat){const stat=document.createElement('span');stat.className='marker-stat';const caption=document.createElement('em'),value=document.createElement('strong');[caption.textContent,value.textContent]=marker.stat.split(' ');stat.append(caption,value);surface.append(stat);}
   else{const number=document.createElement('span');number.className='marker-number';number.textContent=marker.number;surface.append(number);}
   button.append(surface);
   const tip=document.createElement('span');tip.className='marker-tip';tip.setAttribute('aria-hidden','true');const name=document.createElement('b'),status=document.createElement('small');name.textContent=marker.name;status.textContent=`${zone+1} 号 · ${tribute?'召唤素材':target?'选择目标':marker.status}`;tip.append(name,status);button.append(tip);
   button.onclick=()=>latest.current.onPick(c.uid);labelLayer.append(button);labels.push({node:button,anchor:new THREE.Vector3(x,.2,z+(area==='field'?1.22:own?.85:-1.5)),row:button.dataset.player+':'+area,width:marker.width,above:area==='spells'&&!own});
  }
  function zoneControl(x:number,z:number,site:DropSite){const node=document.createElement('span'),chosen=siteKey(latest.current.dropHover)===siteKey(site);node.className='drop-zone-label'+(chosen?' is-hovered':'');node.textContent=chosen?'松手放置':'拖入这里';if(site.type==='zone'){node.dataset.dropZone=String(site.zone);node.dataset.dropArea=site.area;node.dataset.dropPlayer=String(site.player);}labelLayer.append(node);labels.push({node,anchor:new THREE.Vector3(x,.25,z)});}
  function rebuild(){const {game:g,deck:d}=latest.current;disposeGroup(entities);pickables.length=0;slots.clear();labels.length=0;labelLayer.replaceChildren();
   if(!g){creature(latest.current.heroId,-3,-.5,true);return;}
   // Physical stacks at the margins give the scene scale without exposing hidden cards.
   for(const own of [true,false]){const near=own?1:-1;for(let i=0;i<4;i++){const stack=new THREE.Mesh(new THREE.BoxGeometry(1.45,.055,2.1),new THREE.MeshStandardMaterial({color:theme==='city'?0x203344:0x65513c,metalness:.38,roughness:.5}));stack.position.set(8.65*near,.055+i*.065,5.35*near);stack.rotation.y=near*.08;entities.add(stack);}const back=new THREE.Mesh(new THREE.PlaneGeometry(1.4,2.04),new THREE.MeshBasicMaterial({map:tex('/game-assets/card-back.png'),toneMapped:false}));back.rotation.x=-Math.PI/2;back.rotation.z=-near*.08;back.position.set(8.65*near,.31,5.35*near);entities.add(back);}
   for(let p=0;p<2;p++){const own=p===g.you,near=own?1:-1;for(const area of ['field','spells'])for(let i=0;i<5;i++){
    const x=(own?i:4-i)*3-6,z=near*(area==='field'?2.4:5.3);
    const dropSite=latest.current.dropSites.find(s=>s.type==='zone'&&s.player===p&&s.area===area&&s.zone===i),hovered=!!dropSite&&siteKey(dropSite)===siteKey(latest.current.dropHover);
    const c=g.players[p][area][i],available=c&&g.legal.some((a:any)=>a.cardUid===c.uid);const zone=createZoneInlay(theme==='city',own,!!available,!!dropSite,hovered);zone.position.set(x,0,z);entities.add(zone);
    if(c){cardMesh(c,x,z,own);if(shouldShowMonster(c,area))creature(c.id,x,z,false,c.uid);labelControl(c,x,z,own,area,i);}if(dropSite)zoneControl(x,z,dropSite);
   }}
  }
  const fx:Array<ArenaEffect&{start:number}>=[];let cinema:{start:number,pos:THREE.Vector3}|null=null,oldSkip=latest.current.skip;
  function animateEvent(e:any,now:number,previousSlots:Map<string,THREE.Vector3>){
   if(!latest.current.effects||latest.current.reduced)return;const position=slots.get(e.uid)||previousSlots.get(e.uid);if(!position)return;
   let effect:ArenaEffect|null=null;
   if(e.type==='summon'){
    const {featured:ace,color:baseColor}=monsterPresentation(CARD[e.id]),color=e.summonType==='fusion'?0xd9a0ff:e.summonType==='ritual'?0x75baff:baseColor;
    births.set(e.uid,now);if(ace)cinema={start:now,pos:position.clone()};
    effect=summonEffect(position,color,tex('/game-assets/summon-circle.png'),ace);
   }else if(e.type==='attack'){
    const end=(slots.get(e.targetUid)||previousSlots.get(e.targetUid))?.clone()||new THREE.Vector3(0,.4,e.player===latest.current.game.you?-6:6);
    effect=attackEffect(position,end);
   }
   if(effect){transient.add(effect.group);fx.push({...effect,start:now});}
  }
  function resize(){const w=el.clientWidth,h=el.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();rendering?.resize(w,h);}const observer=new ResizeObserver(resize);observer.observe(el);resize();
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
   const delta=Math.min((now-lastTime)/1000,.2);lastTime=now;if(!latest.current.effects||latest.current.reduced||oldSkip!==latest.current.skip){for(const f of fx){transient.remove(f.group);disposeEffect(f.group);}fx.length=0;entities.traverse((o:any)=>{if(o.isSprite&&o.userData.baseScale){o.scale.copy(o.userData.baseScale);o.material.opacity=1;}});births.clear();cinema=null;oldSkip=latest.current.skip;}
   for(let i=fx.length-1;i>=0;i--){const f=fx[i],t=(now-f.start)/f.duration;if(t>=1){transient.remove(f.group);disposeEffect(f.group);fx.splice(i,1);}else f.update(Math.max(0,t));}
   entities.traverse((object:any)=>{if(!object.isSprite||!object.userData.uid)return;const born=births.get(object.userData.uid);if(!born)return;const t=latest.current.effects&&!latest.current.reduced?Math.min(1,(now-born)/1100):1;object.scale.copy(object.userData.baseScale).multiplyScalar(.25+.75*(1-Math.pow(1-t,3)));object.material.opacity=Math.min(1,t*1.7);if(t>=1)births.delete(object.userData.uid);});
   let blend=0;if(cinema){const t=(now-cinema.start)/3000;if(t>=1||latest.current.selectedUid||latest.current.dragging||g?.window)cinema=null;else blend=Math.sin(t*Math.PI)*.8;}
   ancient.update(now,latest.current.effects&&!latest.current.reduced);
   const radius=spatial?23:17.5;camera.position.set(Math.sin(angle)*radius*(1-blend)+(cinema?.pos.x||0)*blend*.5,(spatial?10.5:12.5)-blend*6,Math.cos(angle)*radius-blend*4);
   camera.lookAt(cinema?cinema.pos.x*blend:g?0:-1,(spatial?1.8:0)+blend,cinema?cinema.pos.z*blend:spatial?-1:0);camera.updateMatrixWorld();
   const projected=labels.map(label=>{const p=label.anchor.clone().project(camera);return {...label,x:(p.x+1)*el.clientWidth/2,y:(1-p.y)*el.clientHeight/2-(label.above?44:0),visible:p.z<1};});
   const rows=new Set(projected.map(label=>label.row).filter(Boolean));
   for(const row of rows){const members=projected.filter(label=>label.row===row&&label.visible),packed=packFieldMarkers(members.map(label=>({id:label.node.dataset.cardUid!,x:label.x,width:label.width!})),el.clientWidth);for(const label of members){const x=packed.get(label.node.dataset.cardUid!)!,offset=label.x-x;label.node.style.setProperty('--marker-tether-angle',Math.atan2(-offset,11)*180/Math.PI+'deg');label.node.style.setProperty('--marker-tether-scale',String(Math.hypot(offset,11)/11));label.x=x;}}
   for(const label of projected){label.node.style.left=label.x+'px';label.node.style.top=label.y+'px';label.node.style.visibility=label.visible?'visible':'hidden';}if(rendering)rendering.render(delta,latest.current.quality);else renderer.render(scene,camera);frame=requestAnimationFrame(loop);
  }frame=requestAnimationFrame(loop);
  return()=>{if(dropApi)dropApi.current=null;alive=false;cancelAnimationFrame(frame);observer.disconnect();disposeGroup(entities);disposeGroup(transient);ancient.dispose();cliffs?.dispose();contactTexture.dispose();textures.forEach(t=>t.dispose());skyTexture?.dispose();skyEnv?.dispose();env.dispose();rendering?.dispose();renderer.dispose();renderer.domElement.remove();labelLayer.remove();};
 },[theme]);
 return <div className="arena-canvas" ref={host} aria-label="3D 遗迹决斗场：拖动空白场地旋转视角，点击卡牌查看详情">{error&&<div className="webgl-error">当前浏览器无法渲染 3D 场景，请使用支持 WebGL 的浏览器。</div>}</div>;
}
