import * as T from 'three';

/** Opt-in localhost-only measurements. No game commands, credentials, hidden cards or remote telemetry. */
export function createArenaDiagnostics(host:HTMLElement,renderer:T.WebGLRenderer,scene:T.Scene){
 const enabled=['localhost','127.0.0.1','[::1]'].includes(location.hostname)&&new URLSearchParams(location.search).has('studioDebug');
 if(!enabled)return null;
 const panel=document.createElement('details');panel.className='studio-diagnostics';panel.open=true;
 const heading=document.createElement('summary');heading.textContent='画面诊断';panel.appendChild(heading);
 const output=document.createElement('output');output.setAttribute('aria-label','本地渲染诊断');panel.appendChild(output);host.appendChild(panel);
 const gl=renderer.getContext(),extension=gl.getExtension('WEBGL_debug_renderer_info'),gpu=extension?String(gl.getParameter(extension.UNMASKED_RENDERER_WEBGL)):'unavailable';
 const softwareRendered=/swiftshader|llvmpipe|softpipe/i.test(gpu);let last=0,frames=0,total=0,worst=0,disposed=false;
 renderer.info.autoReset=false;
 return {
  begin(){renderer.info.reset();},
  sample(now:number,delta:number,post:boolean){
   if(disposed)return;frames++;total+=delta*1000;worst=Math.max(worst,delta*1000);if(now-last<1000)return;
   const materials=new Set<T.Material>();scene.traverse(object=>{if(object instanceof T.Mesh||object instanceof T.Line||object instanceof T.Points){for(const m of Array.isArray(object.material)?object.material:[object.material])materials.add(m);}});
   const data={calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,lines:renderer.info.render.lines,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures,materials:materials.size,frameMs:Number((total/frames).toFixed(2)),worstFrameMs:Number(worst.toFixed(2)),dpr:renderer.getPixelRatio(),post:post?'SSAO + output':'direct',gpu,softwareRendered,width:host.clientWidth,height:host.clientHeight};
   output.dataset.metrics=JSON.stringify(data);output.textContent=`${data.width} × ${data.height} · DPR ${data.dpr}\n绘制 ${data.calls} · 三角面 ${data.triangles.toLocaleString()}\n几何 ${data.geometries} · 纹理 ${data.textures} · 材质 ${data.materials}\n帧间隔 ${data.frameMs}ms · ${data.post}\n${gpu}${softwareRendered?' · 软件渲染':''}`;
   last=now;frames=0;total=0;worst=0;
  },
  dispose(){if(disposed)return;disposed=true;renderer.info.autoReset=true;panel.remove();}
 };
}
