import {useEffect,useRef} from 'react';import * as THREE from 'three';import {cards} from './cardRegistry';
const C:Record<string,any>=cards;
const COLORS:Record<string,number>={N:0x81d9ed,R:0x8eadff,SR:0xc69aff,UR:0xffd77a};
export default function GachaScene({stage,result,seed,reduced}:{stage:string,result:any,seed:string,reduced:boolean}){
 const host=useRef<HTMLDivElement>(null),latest=useRef({stage,result,seed,reduced});latest.current={stage,result,seed,reduced};
 useEffect(()=>{if(!host.current)return;const el=host.current;let renderer:THREE.WebGLRenderer;try{renderer=new THREE.WebGLRenderer({alpha:true,antialias:true});}catch{return;}
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.outputColorSpace=THREE.SRGBColorSpace;el.appendChild(renderer.domElement);const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(40,1,.1,60);camera.position.set(0,4.1,8);camera.lookAt(0,1.5,0);
 scene.add(new THREE.HemisphereLight(0xddf5ff,0x162344,2.4));const light=new THREE.PointLight(0x80e7ff,14,25);light.position.set(0,4,4);scene.add(light);
 const loader=new THREE.TextureLoader(),textures=new Map<string,THREE.Texture>();function tex(url:string){let t=textures.get(url);if(!t){t=loader.load(url);t.colorSpace=THREE.SRGBColorSpace;textures.set(url,t);}return t;}
 const front=new THREE.MeshStandardMaterial({map:tex('/game-assets/card-back.png'),roughness:.28,metalness:.16}),back=new THREE.MeshStandardMaterial({map:tex('/game-assets/card-back.png'),roughness:.25,metalness:.4});const edge=new THREE.MeshStandardMaterial({color:0xc2b185,metalness:.7,roughness:.35});
 const card=new THREE.Mesh(new THREE.BoxGeometry(1.45,2.11,.035),[edge,edge,edge,edge,front,back]);card.position.set(0,2.1,0);card.rotation.y=Math.PI;scene.add(card);
 const circleMat=new THREE.MeshBasicMaterial({map:tex('/game-assets/summon-circle.png'),transparent:true,depthWrite:false,opacity:.8,color:0x8ddfff});const circle=new THREE.Mesh(new THREE.PlaneGeometry(5.1,5.1),circleMat);circle.rotation.x=-Math.PI/2;circle.position.y=.15;scene.add(circle);
 const rings=new THREE.Group();scene.add(rings);const ringMaterials:THREE.MeshBasicMaterial[]=[];for(let i=0;i<3;i++){const mat=new THREE.MeshBasicMaterial({color:0x6bcce7,transparent:true,opacity:.45});ringMaterials.push(mat);const ring=new THREE.Mesh(new THREE.TorusGeometry(2.5+i*.21,.015,8,96),mat);ring.rotation.x=-Math.PI/2;ring.position.y=.13+i*.04;rings.add(ring);}
 const fragments:Array<{mesh:THREE.Mesh,origin:THREE.Vector3,direction:THREE.Vector3}>=[];
 for(let row=0;row<4;row++)for(let col=0;col<3;col++){
  const geom=new THREE.PlaneGeometry(1.45/3,2.11/4);const uv=geom.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,(uv.getX(i)+col)/3,(uv.getY(i)+row)/4);
  const mat=new THREE.MeshBasicMaterial({map:tex('/game-assets/card-back.png'),transparent:true,side:THREE.DoubleSide,opacity:0});
  const mesh=new THREE.Mesh(geom,mat),origin=new THREE.Vector3((col-1)*1.45/3,2.1+(row-1.5)*2.11/4,.09);mesh.position.copy(origin);scene.add(mesh);
  fragments.push({mesh,origin,direction:new THREE.Vector3((col-1)*1.5+(Math.random()-.5),row*.45+.4,(Math.random()-.5)*2)});
 }
 const geometry=new THREE.BufferGeometry(),positions=new Float32Array(220*3),velocities=Array.from({length:220},()=>Math.random()*1.6+.3);for(let i=0;i<220;i++){const theta=Math.random()*Math.PI*2,radius=Math.random()*2.5+.2;positions[i*3]=Math.cos(theta)*radius;positions[i*3+1]=Math.random()*4.6;positions[i*3+2]=Math.sin(theta)*radius;}geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));const particlesMat=new THREE.PointsMaterial({color:0x88ddff,size:.033,transparent:true,opacity:.5,blending:THREE.AdditiveBlending,depthWrite:false});const particles=new THREE.Points(geometry,particlesMat);scene.add(particles);
 let previous='',start=performance.now(),frame=0,alive=true,drag=false,energy=0;const pointerDown=()=>{drag=true;energy=Math.min(energy+.3,1);},pointerUp=()=>{drag=false;},pointerMove=()=>{if(drag)energy=Math.min(energy+.025,1);};renderer.domElement.addEventListener('pointerdown',pointerDown);renderer.domElement.addEventListener('pointerup',pointerUp);renderer.domElement.addEventListener('pointermove',pointerMove);
 const resize=()=>{if(!el.clientWidth||!el.clientHeight)return;renderer.setSize(el.clientWidth,el.clientHeight,false);camera.aspect=el.clientWidth/el.clientHeight;camera.updateProjectionMatrix();};const observer=new ResizeObserver(resize);observer.observe(el);resize();let last=performance.now();
 function render(now:number){if(!alive)return;const v=latest.current,dt=Math.min((now-last)/1000,.1);last=now;const key=v.seed+v.stage;if(previous!==key){previous=key;start=now;if(v.result)front.map=tex(C[v.result.cardId].face);front.needsUpdate=true;const color=COLORS[v.result?.rarity||'N'];light.color.setHex(color);circleMat.color.setHex(color);particlesMat.color.setHex(color);ringMaterials.forEach(m=>m.color.setHex(color));}
 const t=(now-start)/1000,charge=v.stage==='charging',reveal=v.stage==='revealed',strong=['SR','UR'].includes(v.result?.rarity);const speed=v.reduced?.3:charge?3+t*.8:reveal?1.5:.35;
 circle.rotation.z+=dt*speed;rings.rotation.y+=dt*speed*.6;circleMat.opacity=v.reduced?.4:charge?.65+Math.sin(t*3)*.15:reveal?.85:.48;
 if(reveal){const ratio=v.reduced?1:Math.min(1,t/.85),easing=1-Math.pow(1-ratio,3);card.rotation.y=Math.PI*(1-easing);card.rotation.z=Math.sin(now*.0005)*.015;card.position.y=2.05+Math.sin(now*.0014)*.055;card.scale.setScalar(strong?1.17:1.07);}else {card.rotation.y=Math.PI+Math.sin(now*.0007)*.15;card.rotation.z=0;card.position.y=2.05+Math.sin(now*.0015)*.08;card.scale.setScalar(charge?1+Math.min(t,.8)*.1:1);}
 particlesMat.opacity=v.reduced?.2:charge?.8:reveal&&strong?.95:.4;particlesMat.size=strong?.055:.032;
 for(const f of fragments){const visible=reveal&&!v.reduced&&t<1.15;f.mesh.visible=visible;if(visible){f.mesh.position.copy(f.origin).addScaledVector(f.direction,t*1.8);f.mesh.rotation.set(t*1.2,t*2,t*.9);(f.mesh.material as THREE.MeshBasicMaterial).opacity=Math.max(0,1-t/1.15);}}
 for(let i=0;i<220;i++){positions[i*3+1]+=dt*velocities[i]*(charge?2.4:1);if(positions[i*3+1]>5)positions[i*3+1]=.1;}geometry.attributes.position.needsUpdate=true;energy=Math.max(0,energy-dt*.15);light.intensity=v.reduced?9:charge?14+t*4+energy*15:strong&&reveal?23:13;
 const close=reveal&&strong&&!v.reduced?Math.min(t*.7,1):0;camera.position.z=8-close*.65;camera.lookAt(0,1.6,0);renderer.render(scene,camera);frame=requestAnimationFrame(render);
 }frame=requestAnimationFrame(render);
 return()=>{alive=false;cancelAnimationFrame(frame);observer.disconnect();scene.traverse((o:any)=>{o.geometry?.dispose();if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();});textures.forEach(t=>t.dispose());renderer.dispose();renderer.domElement.remove();};
 },[]);
 return <div className="gacha-scene" ref={host} aria-label="触碰法阵注入能量的 3D 召唤演出"/>;
}
