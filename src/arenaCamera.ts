import * as T from 'three';

export type ArenaView='tactical'|'immersive';

/** Frame the four playable rows above the hand, with a longer lens to soften perspective. */
export function frameTacticalCamera(camera:T.PerspectiveCamera,width:number,height:number,groundStart=0){
 const compact=height<=560;
 const frame={left:Math.max(64,width*.09),right:width-Math.max(compact?176:205,width*.15),top:Math.max(groundStart,compact?Math.max(83,height*.20):Math.max(119,height*.17)),bottom:height-(compact?153:252)};
 // Very small/portrait windows still get a valid projection; landscape remains recommended.
 frame.right=Math.max(frame.left+120,frame.right);frame.bottom=Math.max(frame.top+88,frame.bottom);
 camera.fov=30;camera.aspect=width/height;camera.clearViewOffset();
 const pitch=(compact?38:43)*Math.PI/180;
 const corners=[-7.2,7.2].flatMap(x=>[-6.65,6.65].map(z=>new T.Vector3(x,.12,z)));
 let distance=20,bounds={left:0,right:0,top:0,bottom:0};
 for(let i=0;i<80;i++){
  camera.position.set(0,Math.sin(pitch)*distance,Math.cos(pitch)*distance);camera.lookAt(0,.12,0);camera.updateProjectionMatrix();camera.updateMatrixWorld();
  const points=corners.map(point=>point.clone().project(camera));
  bounds={left:Math.min(...points.map(p=>(p.x+1)*width/2)),right:Math.max(...points.map(p=>(p.x+1)*width/2)),top:Math.min(...points.map(p=>(1-p.y)*height/2)),bottom:Math.max(...points.map(p=>(1-p.y)*height/2))};
  if(bounds.right-bounds.left<=frame.right-frame.left&&bounds.bottom-bounds.top<=frame.bottom-frame.top)break;
  distance*=1.025;
 }
 camera.setViewOffset(width,height,(bounds.left+bounds.right-frame.left-frame.right)/2,(bounds.top+bounds.bottom-frame.top-frame.bottom)/2,width,height);camera.updateMatrixWorld();
 return frame;
}

export function canOrbit(view:ArenaView,locked:boolean,dragging:boolean,response:boolean){return view==='immersive'&&!locked&&!dragging&&!response;}
