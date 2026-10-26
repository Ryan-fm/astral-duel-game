import * as THREE from 'three';

// Presentation effects follow the authored GLB timeline and its breath_origin bone.
export function createDragonEffects(scene, reducedMotion = false) {
  const group = new THREE.Group(); scene.add(group);
  const textureCanvas = document.createElement('canvas'); textureCanvas.width=textureCanvas.height=128;
  const ctx=textureCanvas.getContext('2d'),g=ctx.createRadialGradient(64,64,0,64,64,64);
  g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.18,'rgba(180,237,255,.9)');g.addColorStop(.48,'rgba(55,150,255,.3)');g.addColorStop(1,'rgba(10,70,255,0)');ctx.fillStyle=g;ctx.fillRect(0,0,128,128);
  const glowMap=new THREE.CanvasTexture(textureCanvas);
  const material=(color,opacity=1)=>new THREE.MeshBasicMaterial({color,transparent:true,opacity,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide});
  const orb=new THREE.Group(),core=new THREE.Mesh(new THREE.SphereGeometry(.12,24,16),material(0xe6fbff));
  const halo=new THREE.Sprite(new THREE.SpriteMaterial({map:glowMap,color:0x54b9ff,blending:THREE.AdditiveBlending,transparent:true,depthWrite:false}));halo.scale.setScalar(1.1);orb.add(core,halo);group.add(orb);
  const beam=new THREE.Group();group.add(beam);
  const beamLayers=[new THREE.Mesh(new THREE.CylinderGeometry(1,1,1,24,1,true),material(0x216cff,.18)),new THREE.Mesh(new THREE.CylinderGeometry(1,1,1,24,1,true),material(0x55ccff,.42)),new THREE.Mesh(new THREE.CylinderGeometry(1,1,1,20,1,true),material(0xeaffff,.95))];beamLayers.forEach(m=>beam.add(m));
  const rings=new THREE.Group();group.add(rings);
  for(let i=0;i<3;i++){const mesh=new THREE.Mesh(new THREE.TorusGeometry(1+i*.34,.013,8,96),material(i===1?0xd4eeff:0x389aff));mesh.rotation.x=-Math.PI/2;mesh.position.y=.075+i*.035;rings.add(mesh);}
  const runes=new THREE.Group();rings.add(runes);for(let i=0;i<12;i++){const m=new THREE.Mesh(new THREE.OctahedronGeometry(.06,0),material(0x72cfff));const a=i*Math.PI/6;m.position.set(Math.cos(a)*1.7,.10,Math.sin(a)*1.7);m.scale.set(.55,1.4,.55);runes.add(m);}
  const shield=new THREE.Group();group.add(shield);shield.position.set(0,2.1,.85);
  const panel=new THREE.Mesh(new THREE.CircleGeometry(1.15,6),material(0x3f9cff,.10));shield.add(panel);
  for(const radius of [1.15,.94]){const geo=new THREE.BufferGeometry().setFromPoints(Array.from({length:7},(_,i)=>new THREE.Vector3(Math.cos(i*Math.PI/3)*radius,Math.sin(i*Math.PI/3)*radius,0)));shield.add(new THREE.Line(geo,new THREE.LineBasicMaterial({color:0x77d9ff,transparent:true,opacity:.65,blending:THREE.AdditiveBlending,depthWrite:false})));}
  const particleCount=64,positions=new Float32Array(particleCount*3),pgeo=new THREE.BufferGeometry();pgeo.setAttribute('position',new THREE.BufferAttribute(positions,3));
  const motes=new THREE.Points(pgeo,new THREE.PointsMaterial({map:glowMap,size:.09,color:0x82cfff,transparent:true,opacity:.8,blending:THREE.AdditiveBlending,depthWrite:false}));group.add(motes);
  const point=new THREE.PointLight(0x53acff,0,5,2);group.add(point);
  const up=new THREE.Vector3(0,1,0),pos=new THREE.Vector3(),direction=new THREE.Vector3(),quat=new THREE.Quaternion();
  let socket=null,materials=[];
  const clamp=THREE.MathUtils.clamp;
  const envelope=(t,start,end,edge=.16)=>clamp((t-start)/edge,0,1)*clamp((end-t)/edge,0,1);
  function reset(){group.visible=false;point.intensity=0;for(const [m,c,p] of materials){m.emissive.copy(c);m.emissiveIntensity=p;}}
  return {
    bind(model){reset();socket=model?.getObjectByName('breath_origin');materials=[];model?.traverse(o=>{if(o.isMesh)for(const m of Array.isArray(o.material)?o.material:[o.material])if(m.emissive&&!materials.some(([v])=>v===m))materials.push([m,m.emissive.clone(),m.emissiveIntensity]);});},
    update(name,t,enabled=true){
      reset();if(!enabled||!socket)return;group.visible=true;orb.visible=beam.visible=rings.visible=shield.visible=motes.visible=false;
      socket.getWorldQuaternion(quat);socket.getWorldPosition(pos);direction.copy(up).applyQuaternion(quat).normalize();pos.addScaledVector(direction,.25);
      const calm=reducedMotion?.35:1;
      if(name==='attack'){
        const charge=envelope(t,.22,1.30,.22),blast=envelope(t,1.20,2.25,.12);
        orb.visible=charge+blast>0;orb.position.copy(pos);orb.scale.setScalar(.35+charge*.95+blast*.45);halo.material.opacity=(charge+blast*.7)*calm;core.material.opacity=clamp(charge+blast,0,1);point.position.copy(pos);point.intensity=(charge*2.5+blast*4)*calm;
        beam.visible=blast>0;beam.position.copy(pos);beam.quaternion.setFromUnitVectors(up,direction);
        const length=3.4*clamp((t-1.2)/.18,0,1);beamLayers.forEach((m,i)=>{const radius=[.20,.11,.04][i]*blast;m.scale.set(radius,length,radius);m.position.y=length*.5;m.material.opacity=[.18,.42,.95][i]*blast*calm;});
        motes.visible=charge>0;motes.material.opacity=charge*.75*calm;
        for(let i=0;i<particleCount;i++){const a=i*2.399+t*3,r=(.25+(i%9)/12)*(1-charge*.6);positions[i*3]=pos.x+Math.cos(a)*r;positions[i*3+1]=pos.y+Math.sin(a)*r;positions[i*3+2]=pos.z+Math.sin(a*.7)*r;}
      } else if(name==='summon'||name==='defeat'){
        const k=name==='summon'?envelope(t,0,2.9,.35):envelope(t,2,3.6,.3);rings.visible=motes.visible=k>0;rings.scale.setScalar(name==='summon'?.65+Math.min(t,2)*.45:1.5-k*.6);runes.rotation.y=t*.3;
        rings.traverse(o=>{if(o.material)o.material.opacity=k*calm;});motes.material.opacity=k*.7*calm;
        for(let i=0;i<particleCount;i++){const a=i*2.399+t*.22,r=.7+(i%11)*.13;positions[i*3]=Math.cos(a)*r;positions[i*3+1]=.1+((i/particleCount+t*.6)%1)*3.5;positions[i*3+2]=Math.sin(a)*r;}
      } else if(name==='guard'){
        const k=envelope(t,.30,2.7,.4);shield.visible=k>0;shield.scale.setScalar(.8+.25*k);shield.rotation.z=Math.sin(t)*.025;shield.children.forEach((o,i)=>{o.material.opacity=(i?.65:.09)*k*calm;});
      } else if(name==='hit'&&!reducedMotion){
        const k=envelope(t,.04,.35,.10);for(const [m,c,p] of materials){m.emissive.copy(c).lerp(new THREE.Color(0x69bfff),k*.45);m.emissiveIntensity=p+k*.55;}
      }
      if(motes.visible)pgeo.attributes.position.needsUpdate=true;
    },reset
  };
}
