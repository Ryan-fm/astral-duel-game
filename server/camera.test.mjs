import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {frameTacticalCamera} from '../src/arenaCamera.ts';
import {createKingdomEnvironment} from '../src/kingdomEnvironment.ts';

test('all physical card corners stay above the hand and within the tactical play area',()=>{
 for(const [w,h] of [[1280,720],[1440,900],[844,390],[667,375],[568,320]]){
  const camera=new T.PerspectiveCamera(45,w/h,.1,300),frame=frameTacticalCamera(camera,w,h);
  for(const x of [-6,-3,0,3,6])for(const z of [-5.3,-2.4,2.4,5.3])for(const dx of [-.77,.77])for(const dz of [-1.11,1.11]){
   const point=new T.Vector3(x+dx,.12,z+dz).project(camera),px=(point.x+1)*w/2,py=(1-point.y)*h/2;
   assert.ok(px>=frame.left&&px<=frame.right,`card clipped horizontally at ${w}x${h}`);
   assert.ok(py>=frame.top&&py<=frame.bottom,`card behind HUD/hand at ${w}x${h}`);
  }
 }
});

test('projected card centres raycast back to their correct world zones after off-centre framing',()=>{
 for(const [w,h] of [[1280,720],[844,390]]){
  const camera=new T.PerspectiveCamera(),ray=new T.Raycaster(),plane=new T.Plane(new T.Vector3(0,1,0),-.05);frameTacticalCamera(camera,w,h);
  for(const x of [-6,-3,0,3,6])for(const z of [-5.3,-2.4,2.4,5.3]){
   const point=new T.Vector3(x,.05,z),screen=point.clone().project(camera);ray.setFromCamera(new T.Vector2(screen.x,screen.y),camera);
   assert.ok(ray.ray.intersectPlane(plane,new T.Vector3()).distanceTo(point)<.0001);
  }
 }
});

test('the illustrated city keeps all card zones on its visible floor instead of the skyline',()=>{
 for(const [w,h] of [[1280,720],[844,390]]){
  const camera=new T.PerspectiveCamera(),floor=h*(h<=560?.34:.35);frameTacticalCamera(camera,w,h,floor);
  for(const x of [-7.2,7.2])for(const z of [-6.65,6.65]){
   const p=new T.Vector3(x,.12,z).project(camera),y=(1-p.y)*h/2;
   assert.ok(y>=floor-.001&&y<=h-(h<=560?153:252)+.001);
  }
 }
});

test('tactical view softens near/far scale differences while increasing far card surface visibility',()=>{
 const camera=new T.PerspectiveCamera();frameTacticalCamera(camera,1280,720);
 const span=z=>{const a=new T.Vector3(-.75,.12,z).project(camera),b=new T.Vector3(.75,.12,z).project(camera);return b.x-a.x;};
 assert.ok(span(5.3)/span(-5.3)<1.35);
 const a=new T.Vector3(0,.12,-6.39).project(camera),b=new T.Vector3(0,.12,-4.21).project(camera);
 assert.ok((a.y-b.y)*360>32);
});

test('the raised camera retains unobstructed lines of sight to every card zone',()=>{
 const maps=()=>({color:new T.Texture(),normal:new T.Texture(),arm:new T.Texture()}),world=createKingdomEnvironment({floor:maps(),stone:maps()}),ray=new T.Raycaster();world.group.updateMatrixWorld(true);
 const architecture=world.group.children.filter(object=>object.userData.architecture);
 try{for(const [w,h] of [[1280,720],[844,390]]){
  const camera=new T.PerspectiveCamera();frameTacticalCamera(camera,w,h);
  for(const x of [-6,-3,0,3,6])for(const z of [-5.3,-2.4,2.4,5.3]){
   const point=new T.Vector3(x,.2,z);ray.set(camera.position,point.clone().sub(camera.position).normalize());ray.far=camera.position.distanceTo(point)-.02;
   assert.equal(ray.intersectObjects(architecture).length,0,`architecture blocks ${x},${z}`);
  }
 }}finally{world.dispose();}
});
