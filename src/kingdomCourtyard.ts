import * as T from 'three';

/** Weathered joints and mineral inlay belong to the existing world-space PBR floor. */
export function carveCourtyard(material:T.MeshStandardMaterial){
 const patina=material.onBeforeCompile;
 material.onBeforeCompile=(shader,renderer)=>{
  patina.call(material,shader,renderer);
  shader.fragmentShader='float courtHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
   vec2 court=vStoneWorld.xz;
   float courtRadius=length(court*vec2(.83,1.));
   float courtBlend=1.-smoothstep(11.6,14.2,courtRadius);
   vec2 slab=vec2(court.x*.48+mod(floor(court.y*.48),2.)*.5,court.y*.48);
   vec2 cell=floor(slab),edge=min(fract(slab),1.-fract(slab));
   float grout=(1.-smoothstep(.008,.025,min(edge.x,edge.y)))*courtBlend;
   float mineral=courtHash(cell);
   float luma=dot(diffuseColor.rgb,vec3(.2126,.7152,.0722));
   vec3 aged=mix(diffuseColor.rgb,luma*vec3(.79,.89,.94),.52);
   diffuseColor.rgb=mix(diffuseColor.rgb,aged*(.82+mineral*.29),courtBlend);
   diffuseColor.rgb*=1.-grout*.43;
   float rim=(1.-smoothstep(.035,.075,abs(courtRadius-11.1)))+(1.-smoothstep(.025,.055,abs(courtRadius-10.65)));
   float angle=atan(court.y,court.x*.83);
   float key=step(.72,fract(angle*12.7324))*(1.-smoothstep(.035,.065,abs(courtRadius-10.88)));
   float erosion=smoothstep(.18,.6,patina(vStoneWorld*1.6));
   diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(1.34,1.19,.79),clamp((rim+key)*erosion*.52,0.,.7));
  `);
 };
 material.customProgramCacheKey=()=> 'kingdom-continuous-courtyard-v1';
}
