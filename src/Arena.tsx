import {useEffect,useRef,useState} from 'react';
import * as THREE from 'three';
import {cards} from './cardRegistry';
const CARD:Record<string,any>=cards;
export default function Arena({game,deck,onPick,effects=true,reduced=false,skip=0,heroId='blue_eyes',active=true}:{game:any,deck:string,onPick:(uid:string)=>void,effects?:boolean,reduced?:boolean,skip?:number,heroId?:string,active?:boolean}){
 const host=useRef<HTMLDivElement>(null),latest=useRef({game,deck,onPick,effects,reduced,skip,heroId,active});latest.current={game,deck,onPick,effects,reduced,skip,heroId,active};
 const [error,setError]=useState(false);
 useEffect(()=>{
  if(!host.current)return;const el=host.current;let renderer:THREE.WebGLRenderer;
  try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});}catch{setError(true);return;}
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.outputColorSpace=THREE.SRGBColorSpace;el.appendChild(renderer.domElement);
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(43,1,.1,120);camera.position.set(0,14.5,16);camera.lookAt(0,0,0);
  scene.add(new THREE.HemisphereLight(0xbbeaff,0x10162e,2.6));const key=new THREE.DirectionalLight(0xc2edff,3);key.position.set(-5,14,5);scene.add(key);
  const loader=new THREE.TextureLoader(),textures=new Map<string,THREE.Texture>();
  function tex(url:string){let t=textures.get(url);if(!t){t=loader.load(url);t.colorSpace=THREE.SRGBColorSpace;textures.set(url,t);}return t;}
  const floorTex=tex('/game-assets/metal-floor.png');floorTex.wrapS=floorTex.wrapT=THREE.RepeatWrapping;floorTex.repeat.set(4,4);
  const floor=new THREE.Mesh(new THREE.BoxGeometry(19,.6,15),new THREE.MeshStandardMaterial({map:floorTex,color:0x8095a8,roughness:.6,metalness:.5}));floor.position.y=-.33;scene.add(floor);
  const floorTrim=new THREE.Mesh(new THREE.BoxGeometry(19.1,.09,15.1),new THREE.MeshBasicMaterial({color:0x215c77}));floorTrim.position.y=-.58;scene.add(floorTrim);
  const entities=new THREE.Group();scene.add(entities);const transient=new THREE.Group();scene.add(transient);let version='',frame=0,alive=true;const seen=new Set<string>();let lastTime=performance.now();
  const pickables:THREE.Object3D[]=[];const slots=new Map<string,THREE.Vector3>();
  function disposeGroup(group:THREE.Group){for(const obj of [...group.children]){group.remove(obj);obj.traverse((o:any)=>{o.geometry?.dispose();if(o.material){for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();}});}}
  function cardMesh(c:any,x:number,z:number,own:boolean){const url=c.id&& (own||c.faceUp)?CARD[c.id].face:'/game-assets/card-back.png';const mat=new THREE.MeshStandardMaterial({map:tex(url),roughness:.45,metalness:.12,side:THREE.DoubleSide,color:!c.id||(!own&&!c.faceUp)?(latest.current.game?.players[1-latest.current.game.you]?.appearance?.back==='blue_back'?0x72eaff:latest.current.game?.players[1-latest.current.game.you]?.appearance?.back==='intro_back'?0xffe1a8:0xffffff):0xffffff});const mesh=new THREE.Mesh(new THREE.PlaneGeometry(1.5,2.18),mat);mesh.rotation.x=-Math.PI/2;mesh.position.set(x,.07,z);if(c.position==='defense')mesh.rotation.z=Math.PI/2;mesh.userData.uid=c.uid;pickables.push(mesh);entities.add(mesh);slots.set(c.uid,mesh.position.clone());return mesh;}
  function creature(id:string,x:number,z:number,hall=false,uid?:string){
   const ace=['blue_eyes','dark_magician'].includes(id),url=id==='blue_eyes'?'/game-assets/blue-eyes.png':id==='dark_magician'?'/game-assets/dark-magician.png':CARD[id].art;
   const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:tex(url),transparent:true,depthWrite:false,color:ace?0xffffff:0xbbeeff}));
   const ownCount=latest.current.game?.players.flatMap((p:any)=>p.field).filter((c:any)=>c?.faceUp&&['blue_eyes','dark_magician'].includes(c.id)).length||0;
   const h=hall?8:ace?(ownCount<=2?4.9:3.6):1.6,w=id==='dark_magician'?h*2/3:ace?h*1.5:h;
   sprite.scale.set(w,h,1);sprite.position.set(x,h*.48+.3,z);if(uid){sprite.userData.uid=uid;pickables.push(sprite);}entities.add(sprite);
   const ring=new THREE.Mesh(new THREE.PlaneGeometry(hall?7:2.6,hall?7:2.6),new THREE.MeshBasicMaterial({map:tex('/game-assets/summon-circle.png'),color:latest.current.game?.players[latest.current.game.you]?.appearance?.summon==='violet'?0xc88aff:0xffffff,transparent:true,opacity:.7,depthWrite:false}));ring.rotation.x=-Math.PI/2;ring.position.set(x,.09,z);entities.add(ring);
  }
  function rebuild(){const {game:g,deck:d}=latest.current;disposeGroup(entities);pickables.length=0;slots.clear();
   if(!g){creature(latest.current.heroId,-3,-.5,true);return;}
   for(let p=0;p<2;p++){const own=p===g.you,near=own?1:-1;for(const area of ['field','spells'])for(let i=0;i<5;i++){
    const x=(own?i:4-i)*3-6,z=near*(area==='field'?2.4:5.3);
    const c=g.players[p][area][i],available=c&&g.legal.some((a:any)=>a.cardUid===c.uid);const zone=new THREE.Mesh(new THREE.BoxGeometry(2.18,.045,2.5),new THREE.MeshStandardMaterial({color:own?0x194558:0x392747,emissive:own?0x0c3248:0x291238,emissiveIntensity:available?2:.5,metalness:.65,roughness:.45,transparent:true,opacity:.35}));zone.position.set(x,.015,z);entities.add(zone);
    const edge=new THREE.LineSegments(new THREE.EdgesGeometry(zone.geometry),new THREE.LineBasicMaterial({color:available?0xbaf8ff:own?0x61c9e0:0xa183c9,transparent:true,opacity:available?1:.55}));edge.position.copy(zone.position);entities.add(edge);
    if(c){cardMesh(c,x,z,own);if(area==='field'&&c.faceUp&&c.id)creature(c.id,x,z,false,c.uid);}
   }}
  }
  const fx:Array<{mesh:THREE.Object3D,start:number,duration:number,type:string}>=[];let cinema:{start:number,pos:THREE.Vector3}|null=null,oldSkip=latest.current.skip;
  function animateEvent(e:any,now:number){if(!latest.current.effects||latest.current.reduced)return;const position=slots.get(e.uid);if(!position)return;
   if(e.type==='summon'){
    if(['blue_eyes','dark_magician'].includes(e.id))cinema={start:now,pos:position.clone()};
    const m=new THREE.Mesh(new THREE.PlaneGeometry(4,4),new THREE.MeshBasicMaterial({map:tex('/game-assets/summon-circle.png'),transparent:true,depthWrite:false,opacity:.9}));m.rotation.x=-Math.PI/2;m.position.copy(position);m.position.y=.15;transient.add(m);fx.push({mesh:m,start:now,duration:3000,type:'summon'});
   }else if(e.type==='attack'){
    const end=slots.get(e.targetUid)||new THREE.Vector3(0,.4,e.player===latest.current.game.you?-6:6),a=position.clone();a.y=.8;end.y=.8;const diff=end.clone().sub(a),m=new THREE.Mesh(new THREE.CylinderGeometry(.1,.16,diff.length(),12),new THREE.MeshBasicMaterial({color:0x67ecff,transparent:true,opacity:.8}));m.position.copy(a.add(end).multiplyScalar(.5));m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),diff.normalize());transient.add(m);fx.push({mesh:m,start:now,duration:1200,type:'attack'});
   }
  }
  function resize(){const w=el.clientWidth,h=el.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}const observer=new ResizeObserver(resize);observer.observe(el);resize();
  const ray=new THREE.Raycaster();let pointerDown:{x:number,y:number}|null=null,angle=0;
  const down=(e:PointerEvent)=>{pointerDown={x:e.clientX,y:e.clientY};};
  const up=(e:PointerEvent)=>{if(!pointerDown)return;const moved=e.clientX-pointerDown.x;if(Math.abs(moved)>25){angle=Math.max(-.15,Math.min(.15,angle+moved*.0005));pointerDown=null;return;}const rect=renderer.domElement.getBoundingClientRect();ray.setFromCamera(new THREE.Vector2((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1),camera);const hit=ray.intersectObjects(pickables)[0];if(hit?.object.userData.uid)latest.current.onPick(hit.object.userData.uid);pointerDown=null;};
  renderer.domElement.addEventListener('pointerdown',down);renderer.domElement.addEventListener('pointerup',up);
  renderer.domElement.addEventListener('webglcontextlost',()=>setError(true));
  function loop(now:number){if(!alive)return;if(!latest.current.active){lastTime=now;frame=requestAnimationFrame(loop);return;}const g=latest.current.game,next=g?g.id+':'+g.version:latest.current.deck+latest.current.heroId;if(next!==version){version=next;rebuild();for(const e of g?.events||[]){if(!seen.has(e.id)){seen.add(e.id);animateEvent(e,now);}}}
   const dt=Math.min((now-lastTime)/1000,.1);lastTime=now;if(!latest.current.effects||latest.current.reduced||oldSkip!==latest.current.skip){for(const f of fx)f.start=0;cinema=null;oldSkip=latest.current.skip;}
   for(let i=fx.length-1;i>=0;i--){const f=fx[i],t=(now-f.start)/f.duration;if(t>=1){transient.remove(f.mesh);(f.mesh as THREE.Mesh).geometry.dispose();((f.mesh as THREE.Mesh).material as THREE.Material).dispose();fx.splice(i,1);}else{const m=f.mesh as THREE.Mesh;(m.material as THREE.MeshBasicMaterial).opacity=(1-t)*.8;if(f.type==='summon'){m.scale.setScalar(.7+t*.8);m.rotation.z+=dt*.5;}}}
   let blend=0;if(cinema){const t=(now-cinema.start)/3000;if(t>=1)cinema=null;else blend=Math.sin(t*Math.PI)*.85;}
   camera.position.set(Math.sin(angle)*16*(1-blend)+(cinema?.pos.x||0)*blend*.5,14.5-blend*8,16-blend*4);
   camera.lookAt(cinema?cinema.pos.x*blend:g?0:-1,blend,cinema?cinema.pos.z*blend:0);renderer.render(scene,camera);frame=requestAnimationFrame(loop);
  }frame=requestAnimationFrame(loop);
  return()=>{alive=false;cancelAnimationFrame(frame);observer.disconnect();disposeGroup(entities);disposeGroup(transient);floor.geometry.dispose();(floor.material as THREE.Material).dispose();floorTrim.geometry.dispose();(floorTrim.material as THREE.Material).dispose();textures.forEach(t=>t.dispose());renderer.dispose();renderer.domElement.remove();};
 },[]);
 return <div className="arena-canvas" ref={host} aria-label="可点击卡牌、左右拖动视角的 3D 决斗场">{error&&<div className="webgl-error">当前浏览器无法渲染 3D 场景，请使用支持 WebGL 的浏览器。</div>}</div>;
}
