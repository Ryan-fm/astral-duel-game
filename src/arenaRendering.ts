import * as T from 'three';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {SSAOPass} from 'three/addons/postprocessing/SSAOPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';

export type ArenaQuality='auto'|'high'|'low';

/** Occlusion belongs to the stone world. Transparent card art must not cast rectangular AO. */
export function createArenaRendering(renderer:T.WebGLRenderer,scene:T.Scene,camera:T.PerspectiveCamera,exclude:T.Object3D[]){
 // Older GPUs retain the direct renderer instead of allocating unsupported float buffers.
 if(!renderer.extensions.has('EXT_color_buffer_float'))return null;
 // Alpha cutout foliage, card art and glass inlays are not solid AO occluders.
 scene.traverse(object=>{if(object instanceof T.Mesh){const materials=Array.isArray(object.material)?object.material:[object.material];if(materials.some(material=>material.transparent||material.alphaTest>0)&&!exclude.includes(object))exclude.push(object);}});
 const target=new T.WebGLRenderTarget(1,1,{type:T.HalfFloatType,samples:2});
 const composer=new EffectComposer(renderer,target),beauty=new RenderPass(scene,camera);
 const contact=new SSAOPass(scene,camera,512,288,16),output=new OutputPass();
 contact.kernelRadius=.65;contact.minDistance=.00015;contact.maxDistance=.014;
 const drawContact=contact.render.bind(contact);
 contact.render=(...args)=>{const visible=exclude.map(object=>object.visible);exclude.forEach(object=>object.visible=false);try{drawContact(...args);}finally{exclude.forEach((object,i)=>object.visible=visible[i]);}};
 composer.addPass(beauty);composer.addPass(contact);composer.addPass(output);
 let width=1,height=1,quality:ArenaQuality='auto',slowFrames=0,automaticLow=false;
 function resize(w:number,h:number){
  width=w;height=h;composer.setSize(w,h);
  // AO is evaluated at half resolution. UI/card art retain the full render resolution.
  contact.setSize(Math.max(1,Math.round(w*.5)),Math.max(1,Math.round(h*.5)));
 }
 return {
  resize,
  render(delta:number,next:ArenaQuality){
   if(next!==quality){quality=next;slowFrames=0;automaticLow=false;}
   if(quality==='auto'&&delta<.2){slowFrames=delta>.042?slowFrames+1:Math.max(0,slowFrames-1);if(slowFrames>45)automaticLow=true;}
   const detailed=quality==='high'||quality==='auto'&&Math.min(width,height)>=500&&!automaticLow;
   if(detailed)composer.render(delta);else renderer.render(scene,camera);
  },
  dispose(){contact.dispose();output.dispose();composer.dispose();}
 };
}
