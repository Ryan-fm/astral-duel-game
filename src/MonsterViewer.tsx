import {useEffect,useRef,useState} from 'react';
import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {createMonsterActor} from './monsterModels';
import './MonsterViewer.css';
export default function MonsterViewer({id,name,reduced=false}:{id:string,name:string,reduced?:boolean}){
 const host=useRef<HTMLDivElement>(null);const [error,setError]=useState(false);
 useEffect(()=>{if(!host.current)return;const el=host.current;let renderer:T.WebGLRenderer;try{renderer=new T.WebGLRenderer({antialias:true,alpha:true});}catch{setError(true);return;}
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFShadowMap;el.appendChild(renderer.domElement);
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(38,1,.1,50),actor=createMonsterActor(id),height=actor.height;scene.add(actor.root);camera.position.set(height*1.2,height*.85,height*2.5);
 const environment=new RoomEnvironment(),pmrem=new T.PMREMGenerator(renderer),env=pmrem.fromScene(environment,.04);scene.environment=env.texture;scene.environmentIntensity=.45;environment.dispose();pmrem.dispose();
 scene.add(new T.HemisphereLight(0xc3d9fa,0x292632,1.1));const light=new T.DirectionalLight(0xffe8cc,3.4);light.position.set(-3,7,5);light.castShadow=true;light.shadow.mapSize.set(1024,1024);Object.assign(light.shadow.camera,{left:-5,right:5,top:6,bottom:-4,near:.5,far:20});light.shadow.normalBias=.025;scene.add(light);const rim=new T.DirectionalLight(0x7aafff,2.8);rim.position.set(3,5,-5);scene.add(rim);
 const floor=new T.Mesh(new T.CylinderGeometry(2.8,2.9,.12,96),new T.MeshStandardMaterial({color:0x223346,metalness:.45,roughness:.6}));floor.position.y=-.065;floor.receiveShadow=true;scene.add(floor);const rimFloor=new T.Mesh(new T.TorusGeometry(2.75,.018,8,96),new T.MeshBasicMaterial({color:0x68d7ed}));rimFloor.rotation.x=-Math.PI/2;rimFloor.position.y=.01;scene.add(rimFloor);
 const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,height*.46,0);controls.enablePan=false;controls.minDistance=height*1.3;controls.maxDistance=height*4;controls.minPolarAngle=.25;controls.maxPolarAngle=Math.PI*.48;controls.enableDamping=true;controls.autoRotate=!reduced;controls.autoRotateSpeed=.6;controls.update();
 const observer=new ResizeObserver(()=>{const w=el.clientWidth,h=el.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();});observer.observe(el);let frame=0,alive=true;
 function loop(now:number){if(!alive)return;actor.update(now/1000,{},reduced);controls.update();renderer.render(scene,camera);frame=requestAnimationFrame(loop);}frame=requestAnimationFrame(loop);
 return()=>{alive=false;cancelAnimationFrame(frame);observer.disconnect();controls.dispose();actor.dispose();env.dispose();floor.geometry.dispose();(floor.material as T.Material).dispose();rimFloor.geometry.dispose();(rimFloor.material as T.Material).dispose();renderer.dispose();renderer.domElement.remove();};
 },[id,reduced]);
 return <div className="monster-viewer"><div className="monster-stage" ref={host} role="img" aria-label={`${name} 的立体模型，可拖动旋转，滚动缩放`}>{error&&<p>无法加载 3D 预览，请使用支持 WebGL 的浏览器。</p>}</div><div className="monster-viewer-caption"><b>{name}</b><span>拖动旋转 · 滚动缩放</span></div></div>;
}
