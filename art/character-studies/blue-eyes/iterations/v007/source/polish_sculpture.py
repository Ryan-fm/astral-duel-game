"""Real-time sculpture refinement: clean armor, silhouette, UV micro-normal and cavity color.
All geometry and texture images are authored locally in Blender.
"""
import bpy,os,math,json,bmesh
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from math import pi,sin,cos
OUT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
bpy.ops.wm.open_mainfile(filepath=os.path.join(OUT,'source','base-v006.blend'))
s=bpy.context.scene;rig=bpy.data.objects['BlueEyes_Rig'];character=bpy.data.collections['01 • BLUE-EYES — editable sculpture'];parts=[]
rig.animation_data_clear()
for b in rig.pose.bones:b.rotation_mode='QUATERNION';b.rotation_quaternion=(1,0,0,0);b.location=(0,0,0);b.scale=(1,1,1)
M={key:bpy.data.materials[name] for key,name in {'silver':'01 | Moon silver enamel','edge':'02 | Platinum bevel','dark':'03 | Blue graphite joints','belly':'04 | Pearl ventral armor','wing':'05 | Blue wing membrane','eye':'08 | Azure eyes'}.items()}
exec(open(os.path.join(OUT,'source','geometry_helpers.py')).read())
def at(points,t):
 p=[Vector(v) for v in points];u=max(0,min(1,t))*(len(p)-1);j=min(int(u),len(p)-2);u-=j;a=p[max(0,j-1)];b=p[j];c=p[j+1];d=p[min(j+2,len(p)-1)]
 return .5*(2*b+(-a+c)*u+(2*a-5*b+4*c-d)*u*u+(-a+3*b-3*c+d)*u*u*u)
def interp(values,t):
 u=max(0,min(1,t))*(len(values)-1);j=min(int(u),len(values)-2);f=u-j;return values[j]*(1-f)+values[j+1]*f
def frame(points,t):
 p=at(points,t);d=(at(points,min(1,t+.002))-at(points,max(0,t-.002))).normalized();a=Vector((1,0,0));a=(a-d*a.dot(d)).normalized();return p,d,a,d.cross(a).normalized()
bodypts=[(0,.53,1.12),(0,.33,1.40),(0,.12,1.76),(0,-.12,2.11),(0,-.23,2.38)];bodyw=[.26,.45,.52,.49,.30];bodyd=[.26,.36,.40,.37,.27]
paths=json.loads(rig['anatomy_paths']);neckpts=paths['neck'];neckrad=[.31,.275,.245,.23,.225,.235,.245]
for ob in list(character.objects):
 if ob.name.startswith(('V4 CHEST / sculpted chevron','V4 NECK / overlapping ventral')):bpy.data.objects.remove(ob,do_unlink=True)
# Tighter overlapping shell sections replace swollen toroidal-looking ridges.
def armor_band(name,points,widths,depths,t0,t1,bn,ma,arc):
 vs=[];fs=[];K=48;R=6
 for row in range(R+1):
  u=row/R;t=t0+(t1-t0)*u;p,d,a,b=frame(points,t);w=interp(widths,t);h=interp(depths,t)
  for k in range(K+1):
   ang=-arc+2*arc*k/K;front=max(0,cos(ang));edge=abs(sin(ang));zoff=-.078*front**4
   lift=.006+.012*sin(u*pi)**.65
   vs.append(p+d*zoff+a*sin(ang)*(w+lift)-b*cos(ang)*(h+lift))
  if row:
   for k in range(K):fs.append(((row-1)*(K+1)+k,(row-1)*(K+1)+k+1,row*(K+1)+k+1,row*(K+1)+k))
 ob=mesh(name,vs,fs,ma,bn);sol=ob.modifiers.new('Thin shell rim','SOLIDIFY');sol.thickness=.012;sol.offset=-.1;bpy.context.view_layer.objects.active=ob;bpy.ops.object.modifier_apply(modifier=sol.name)
 bevel=ob.modifiers.new('Armor edge chamfer','BEVEL');bevel.width=.006;bevel.segments=2;bevel.limit_method='ANGLE';bevel.angle_limit=.65;bpy.ops.object.modifier_apply(modifier=bevel.name)
 return ob
for i in range(7):
 armor_band('V7 CHEST / fitted plated cuirass %02d'%i,bodypts,bodyw,bodyd,.085+i*.127,.085+i*.127+.145,'chest','silver',pi*.84)
for i in range(12):
 armor_band('V7 NECK / narrow overlapping scale %02d'%i,neckpts,neckrad,[x*.94 for x in neckrad],.02+i*.077,.02+i*.077+.085,'neck.01','belly',pi*.55)
# Fine raised tendons follow the actual stretched wing surfaces.
for ob in list(character.objects):
 if not ob.name.startswith('V4 WING / membrane'):continue
 N=24;K=18;verts=ob.data.vertices;sign=-1 if ob.name.endswith('L') else 1;tag='L' if sign<0 else 'R'
 for j,col in enumerate([5,12]):
  pts=[]
  for row in range(6,24):
   p=ob.matrix_world@verts[row*(K+1)+col].co;pts.append(p+Vector((0,-.006,0)))
  tube('V7 WING / membrane tendon %s %d %s'%(ob.name.split('/')[1].strip().split()[1],j,tag),pts,[.003,.005,.004,.001],'wing','wing.'+tag,6,1)
# A lower center of mass, longer trunk, smaller head and expanded wings.
def warp(p,role=''):
 x,y,z=p
 if role.startswith(('V6 HEAD /','V6 EYE /','V6 JAW /','V6 TEETH /','V6 MOUTH /')):
  x*=.94;y=-1.50+(y+1.50)*.94;z=3.29+(z-3.29)*.94
 if role.startswith(('V4 WING /','V7 WING /')):x*=1.12
 elif role.startswith(('V4 LEG /',)):x*=1.07
 # Entire sculpture shares a smooth deformation, also applied to rig joints.
 z2=z-.16*math.exp(-((z-1.65)/.85)**2)
 y2=y*1.14-.10*max(0,min(1,(z-2.25)/.8))
 return Vector((x,y2,z2))
for ob in character.objects:
 if ob.type!='MESH':continue
 inv=ob.matrix_world.inverted()
 for v in ob.data.vertices:v.co=inv@warp(ob.matrix_world@v.co,ob.name)
 bm=bmesh.new();bm.from_mesh(ob.data);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(ob.data);bm.free()
for ob in parts:
 mod=ob.modifiers.new('Skeletal deformation','ARMATURE');mod.object=rig;ob.parent=rig
bpy.ops.object.select_all(action='DESELECT');rig.select_set(True);bpy.context.view_layer.objects.active=rig;bpy.ops.object.mode_set(mode='EDIT')
for b in rig.data.edit_bones:
 role='V4 WING /' if b.name.startswith(('wing.','wingtip.')) else 'V6 HEAD /' if b.name in ['head','jaw','breath_origin'] else ''
 b.head=warp(b.head,role);b.tail=warp(b.tail,role)
bpy.ops.object.mode_set(mode='OBJECT')
paths={k:[list(warp(Vector(p))) for p in ps] for k,ps in paths.items()};rig['anatomy_paths']=json.dumps(paths)
# Normal and roughness maps are explicit image textures, so GLB and Blender match.
W=512;u,v=np.meshgrid(np.arange(W)/W,np.arange(W)/W);rng=np.random.default_rng(13)
height=np.zeros((W,W))
for f,amp in [(4,.22),(8,.15),(16,.09),(32,.04),(64,.018)]:
 phase=rng.uniform(0,2*pi,3);height+=amp*np.sin(2*pi*(f*u)+phase[0])*np.sin(2*pi*(f*v)+phase[1])
height+=rng.normal(0,.014,(W,W));dx=np.roll(height,-1,1)-np.roll(height,1,1);dy=np.roll(height,-1,0)-np.roll(height,1,0)
normal=np.stack([-dx*.38,-dy*.38,np.ones_like(dx)],axis=-1);normal/=np.linalg.norm(normal,axis=-1)[...,None];normal=normal*.5+.5
rough=.40+.055*height+.015*rng.random((W,W));rough=np.clip(rough,.30,.51)
def image_texture(name,arr,colorspace='Non-Color'):
 rgba=np.ones((W,W,4),dtype=np.float32)
 if arr.ndim==2:rgba[:,:,:3]=arr[:,:,None]
 else:rgba[:,:,:3]=arr
 im=bpy.data.images.new(name,width=W,height=W,alpha=False);im.colorspace_settings.name=colorspace;im.pixels.foreach_set(rgba.ravel());im.filepath_raw=os.path.join(OUT,'textures',name+'.png');im.file_format='PNG';im.save();im.pack();return im
nm=image_texture('armor_micro_normal',normal);rm=image_texture('armor_roughness',rough)
# Cavity occlusion is evaluated against the actual full sculpture, then stored per vertex.
meshes=[o for o in character.objects if o.type=='MESH'];v_all=[];f_all=[]
for ob in meshes:
 offset=len(v_all);v_all.extend([ob.matrix_world@v.co for v in ob.data.vertices]);f_all.extend([tuple(offset+i for i in p.vertices) for p in ob.data.polygons])
bvh=BVHTree.FromPolygons(v_all,f_all,all_triangles=False,epsilon=.00002)
colors={'01':(.67,.76,.82),'02':(.82,.88,.92),'03':(.045,.075,.095),'04':(.29,.41,.49),'05':(.13,.25,.34),'06':(.022,.003,.008),'07':(.68,.75,.77),'08':(.003,.16,.65),'10':(.66,.71,.72),'11':(.075,.009,.014),'12':(.03,.004,.009)}
settings={'01':(.22,.40),'02':(.38,.31),'03':(.08,.57),'04':(.17,.46),'05':(.04,.62),'06':(0,.71),'07':(.2,.33),'08':(.12,.19),'10':(.04,.34),'11':(0,.6),'12':(0,.66)}
for m in bpy.data.materials:
 key=m.name[:2]
 if key not in settings or not m.use_nodes:continue
 nt=m.node_tree;p=nt.nodes.get('Principled BSDF');metal,roughness=settings[key];p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=roughness;p.inputs['Coat Weight'].default_value=.035 if key not in ['05','06'] else 0
 for link in list(nt.links):
  if link.to_socket==p.inputs['Base Color']:nt.links.remove(link)
 vc=nt.nodes.new('ShaderNodeVertexColor');vc.layer_name='Col';nt.links.new(vc.outputs['Color'],p.inputs['Base Color']);p.inputs['Base Color'].default_value=(1,1,1,1)
 if key in ['01','02','04','07']:
  tx=nt.nodes.new('ShaderNodeTexImage');tx.image=nm;normalnode=nt.nodes.new('ShaderNodeNormalMap');normalnode.inputs['Strength'].default_value=.32;nt.links.new(tx.outputs['Color'],normalnode.inputs['Color']);nt.links.new(normalnode.outputs['Normal'],p.inputs['Normal'])
  if key=='01':
   tx=nt.nodes.new('ShaderNodeTexImage');tx.image=rm;nt.links.new(tx.outputs['Color'],p.inputs['Roughness'])
 if key=='08':p.inputs['Emission Color'].default_value=(.003,.15,.8,1);p.inputs['Emission Strength'].default_value=.5
raycache={};rays=[Vector((.42,.0,.907)),Vector((-.31,.33,.891)),Vector((-.30,-.43,.852)),Vector((.19,-.58,.792)),Vector((.68,.51,.525))]
for oi,ob in enumerate(meshes):
 me=ob.data;me.update();uv=me.uv_layers.get('DetailUV') or me.uv_layers.new(name='DetailUV');ca=me.color_attributes.get('Col') or me.color_attributes.new(name='Col',type='FLOAT_COLOR',domain='CORNER');me.color_attributes.active_color=ca
 per=[];normalmatrix=ob.matrix_world.to_3x3().inverted().transposed()
 for vert in me.vertices:
  p=ob.matrix_world@vert.co;n=(normalmatrix@vert.normal).normalized();cachekey=tuple(round(x,4) for x in (*p,*n))
  if cachekey not in raycache:
   a=n.cross(Vector((0,0,1)))
   if a.length<.1:a=n.cross(Vector((0,1,0)))
   a.normalize();b=n.cross(a);occ=0
   for r in rays:
    direction=(a*r.x+b*r.y+n*r.z).normalized();hit=bvh.ray_cast(p+n*.006,direction,.38)
    if hit[0] is not None:occ+=(1-hit[3]/.38)
   raycache[cachekey]=max(.46,1-.55*occ/len(rays))
  per.append((p,n,raycache[cachekey]))
 vals=[]
 for loop in me.loops:
  p,n,ao=per[loop.vertex_index];poly=me.polygons[loop.polygon_index] if hasattr(loop,'polygon_index') else None
  # Loop material lookup is assigned below for multi-material mouths.
  vals.extend((ao,ao,ao,1))
 # Set per-face colors to preserve every material including the inner mandible.
 for poly in me.polygons:
  material=ob.data.materials[min(poly.material_index,len(ob.data.materials)-1)];key=material.name[:2];base=colors.get(key,(.5,.6,.7))
  for li in poly.loop_indices:
   p,n,ao=per[me.loops[li].vertex_index];warm=max(0,n.z)*.025;shade=.93+.07*max(-1,min(1,n.z))
   if key=='05':
    t=max(0,min(1,(abs(p.x)-.5)/3.3));base2=(.075+.10*t,.16+.16*t,.235+.20*t);shade*=.94+.05*sin(p.z*9+p.x*4)
   else:base2=base
   ca.data[li].color=(base2[0]*ao*shade+warm,base2[1]*ao*shade+warm*.80,base2[2]*ao*shade+warm*.35,1)
   # Local triplanar projection with meter-scale density; no UV unwrap dependency.
   axis=max(range(3),key=lambda i:abs(n[i]))
   q=(p.y,p.z) if axis==0 else (p.x,p.z) if axis==1 else (p.x,p.y);uv.data[li].uv=(q[0]*2,q[1]*2)
 if oi%25==0:print('SURFACE',oi,len(meshes),flush=True)
# Continuous new neck scales and new veins need smooth skin blending too.
from mathutils.kdtree import KDTree
kd=KDTree(201)
for i in range(201):kd.insert(at(paths['neck'],i/200),i)
kd.balance()
for ob in meshes:
 if ob.name.startswith('V7 NECK /'):
  for g in list(ob.vertex_groups):ob.vertex_groups.remove(g)
  groups=[ob.vertex_groups.new(name='neck.%02d'%(i+1)) for i in range(3)]
  for v in ob.data.vertices:
   _,i,_=kd.find(ob.matrix_world@v.co);u=i/200*2;j=min(int(u),1);t=u-j;groups[j].add([v.index],1-t,'REPLACE');groups[j+1].add([v.index],t,'REPLACE')
 if ob.name.startswith('V7 WING /'):
  tag='L' if ob.name.endswith('L') else 'R'
  for g in list(ob.vertex_groups):ob.vertex_groups.remove(g)
  a=ob.vertex_groups.new(name='wing.'+tag);b=ob.vertex_groups.new(name='wingtip.'+tag)
  for v in ob.data.vertices:
   x=abs((ob.matrix_world@v.co).x);t=max(0,min(1,(x-1.06)/.90));t=t*t*(3-2*t);a.add([v.index],1-t,'REPLACE');b.add([v.index],t,'REPLACE')
rig['revision']='v007 / sculpture and portable PBR surface';rig['surface_notes']='Cavity color / UV micro-normal / spatial roughness / tightened armor / lower stance'
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'source','base-v007.blend'))
# Studio preview: broad light, subdued fill, stronger contact shadow.
for o in bpy.data.objects:
 if o.type=='LIGHT':o.data.energy*=.72
s.view_settings.exposure=-.05;s.cycles.samples=24;s.render.resolution_x=1400;s.render.resolution_y=1050
s.camera.location=(8.7,-13,5.3);s.camera.rotation_euler=(Vector((0,-.1,1.92))-s.camera.location).to_track_quat('-Z','Y').to_euler();s.camera.data.ortho_scale=8.0
s.render.filepath=os.path.join(OUT,'renders','study-surface.png');bpy.ops.render.render(write_still=True)
print('SCULPTURE_REFINED',len(meshes),flush=True)
