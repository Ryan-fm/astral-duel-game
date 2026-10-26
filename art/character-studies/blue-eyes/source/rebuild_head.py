"""Blue Eyes head study 06: sculpted maxilla, inset eyes, cheek and deep articulated jaw.
Hand-authored solid geometry; reference https://tamashiiweb.com/item/14516/
"""
import bpy,os,math,json,bmesh
from mathutils import Vector
from math import pi,sin,cos,sqrt
OUT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
bpy.ops.wm.open_mainfile(filepath=os.path.join(OUT,'source','base-v004.blend'))
scene=bpy.context.scene;character=bpy.data.collections['01 • BLUE-EYES — editable sculpture'];rig=bpy.data.objects['BlueEyes_Rig'];parts=[]
rig.animation_data_clear()
for b in rig.pose.bones:b.rotation_mode='QUATERNION';b.rotation_quaternion=(1,0,0,0);b.scale=(1,1,1);b.location=(0,0,0)
for ob in list(character.objects):
 if ob.name.startswith(('V4 HEAD /','V4 EYE /','V4 JAW /','V4 MOUTH /','V4 TEETH /')):bpy.data.objects.remove(ob,do_unlink=True)
M={key:bpy.data.materials[name] for key,name in {'silver':'01 | Moon silver enamel','edge':'02 | Platinum bevel','dark':'03 | Blue graphite joints','mouth':'06 | Inner mouth blue','eye':'08 | Azure eyes','belly':'04 | Pearl ventral armor'}.items()}
exec(open(os.path.join(OUT,'source','geometry_helpers.py')).read())
def mat(name,color,metal,rough):
 m=bpy.data.materials.get(name) or bpy.data.materials.new(name);m.use_nodes=True;p=m.node_tree.nodes['Principled BSDF'];m.diffuse_color=(*color,1);p.inputs['Base Color'].default_value=(*color,1);p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=rough;p.inputs['Coat Weight'].default_value=.10;return m
M['tooth']=mat('10 | Natural fang enamel',(.58,.64,.69),.06,.33)
M['tongue']=mat('11 | Recessed tongue',(.055,.004,.009),0,.5)
M['mouth']=mat('06 | Inner mouth blue',(.018,.002,.005),0,.68)
M['gum']=mat('12 | Interior gingiva',(.035,.003,.007),0,.62)
# Cross sections specify independent upper/lower profiles, not a pointed elliptical cone.
# y, half width, dorsal silhouette, ventral tooth seam.
sections=[(-.79,.025,3.82,3.76),(-.96,.15,3.87,3.51),(-1.17,.29,3.85,3.30),(-1.40,.347,3.79,3.255),(-1.64,.335,3.64,3.235),(-1.87,.292,3.50,3.21),(-2.07,.232,3.39,3.18),(-2.22,.155,3.285,3.155),(-2.28,.060,3.215,3.155),(-2.29,.004,3.185,3.17)]
def sample(rows,y):
 for a,b in zip(rows,rows[1:]):
  if a[0]>=y>=b[0]:
   t=(y-a[0])/(b[0]-a[0]);return [a[k]*(1-t)+b[k]*t for k in range(1,len(a))]
 return rows[0][1:] if y>rows[0][0] else rows[-1][1:]
# Closed sculpture with flattened palate and generous blunt muzzle.
ps=catmull([(r[0],r[2],r[3]) for r in sections],8);ds=catmull([(r[1],0,0) for r in sections],8)
vs=[];fs=[];K=64
for i,(q,dim) in enumerate(zip(ps,ds)):
 y,top,bottom=q;w=max(.002,dim.x)
 for k in range(K):
  a=k*2*pi/K;x=w*sin(a);c=cos(a)
  # upper side flattens into an armored facial plane; underside is a shallow vault.
  z=bottom+(top-bottom)*c**.72 if c>=0 else bottom+.035*c
  # long brow depression integrated in the skull surface
  dent=math.exp(-((y+1.51)/.22)**2)*math.exp(-((abs(sin(a))-.95)/.17)**2)*.025
  vs.append((x,y,z-dent))
 if i:
  for k in range(K):fs.append(((i-1)*K+k,(i-1)*K+(k+1)%K,i*K+(k+1)%K,i*K+k))
fs.extend([tuple(reversed(range(K))),tuple((len(ps)-1)*K+k for k in range(K))]);skull=mesh('V6 HEAD / broad continuous cranial shell',vs,fs,'silver','head')
# Surface patch with thickness in X; rounded convex center and independent angular silhouette.
def side_patch(name,sign,outline,xs,bulge,ma,bn):
 n=len(outline);cy=sum(p[0] for p in outline)/n;cz=sum(p[1] for p in outline)/n
 vs=[];fs=[]
 for ratio,depth in [(1,0),(.96,.22),(.75,.78),(.40,1),(.05,1.03)]:
  for j,(y,z) in enumerate(outline):vs.append((sign*(sum(xs)/n+(xs[j]-sum(xs)/n)*ratio+bulge*depth),cy+(y-cy)*ratio,cz+(z-cz)*ratio))
 for r in range(4):
  for j in range(n):fs.append((r*n+j,r*n+(j+1)%n,(r+1)*n+(j+1)%n,(r+1)*n+j))
 fs.append(tuple(range(4*n,5*n)));fs.append(tuple(reversed(range(n))))
 ob=mesh(name,vs,fs,ma,bn)
 sub=ob.modifiers.new('Sculpted continuity','SUBSURF');sub.levels=2;bpy.context.view_layer.objects.active=ob;bpy.ops.object.modifier_apply(modifier=sub.name)
 return ob
for sign in [-1,1]:
 # A carved orbit makes the eye sit inside the brow. No round exposed eyeballs.
 bpy.ops.mesh.primitive_uv_sphere_add(segments=40,ring_count=24,location=(sign*.30,-1.54,3.425));cut=bpy.context.object;cut.scale=(.16,.245,.092);cut.rotation_euler.x=.35;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 bo=skull.modifiers.new('Inset eye socket','BOOLEAN');bo.operation='DIFFERENCE';bo.solver='EXACT';bo.object=cut;bpy.context.view_layer.objects.active=skull;bpy.ops.object.modifier_apply(modifier=bo.name);bpy.data.objects.remove(cut,do_unlink=True)
 outline=[(-1.79,3.36),(-1.68,3.455),(-1.44,3.49),(-1.31,3.465),(-1.46,3.385),(-1.65,3.35)]
 side_patch('V6 EYE / carved dark orbit '+str(sign),sign,outline,[.20,.278,.285,.275,.28,.26],.012,'dark','head')
 outline=[(-1.75,3.374),(-1.66,3.424),(-1.455,3.474),(-1.495,3.415),(-1.615,3.373)]
 side_patch('V6 EYE / narrow azure eye '+str(sign),sign,outline,[.245,.292,.302,.31,.286],.005,'eye','head')
 # Upper brow and cheek are broad sculpted surfaces; grooves are genuine overlaps, not rods.
 side_patch('V6 HEAD / angular orbital brow '+str(sign),sign,[(-1.82,3.387),(-1.68,3.50),(-1.39,3.56),(-1.18,3.67),(-1.24,3.47),(-1.48,3.49),(-1.68,3.455)], [.22,.295,.31,.245,.30,.327,.29],.025,'silver','head')
 side_patch('V6 HEAD / maxillary cheek plane '+str(sign),sign,[(-1.91,3.245),(-1.76,3.337),(-1.58,3.32),(-1.40,3.40),(-1.22,3.40),(-1.02,3.45),(-1.17,3.23),(-1.39,3.23),(-1.55,3.265),(-1.73,3.25)], [.22,.27,.31,.32,.29,.22,.29,.34,.31,.27],.025,'silver','head')
 side_patch('V6 HEAD / swept upper temple '+str(sign),sign,[(-1.39,3.49),(-1.18,3.65),(-.95,3.83),(-.73,3.96),(-.87,3.65),(-1.06,3.45)],[.26,.31,.35,.39,.36,.28],.035,'silver','head')
 side_patch('V6 HEAD / mid temple blade '+str(sign),sign,[(-1.35,3.34),(-1.14,3.44),(-.95,3.49),(-.65,3.68),(-.81,3.41),(-1.01,3.32)],[.30,.36,.41,.47,.43,.34],.026,'silver','head')
 side_patch('V6 HEAD / lower swept cheek '+str(sign),sign,[(-1.32,3.24),(-1.16,3.30),(-.98,3.29),(-.66,3.40),(-.81,3.19),(-1.02,3.13)],[.27,.34,.38,.42,.37,.29],.023,'silver','head')
 # A single backwards cheek barb, tapered out of the jaw hinge.
 tube('V6 HEAD / cheek barb '+str(sign),[(sign*.30,-1.38,3.25),(sign*.37,-1.31,3.18),(sign*.41,-1.15,3.23)],[.063,.048,.001],'silver','head',20,9,ellipse=.8)
 # Recessed nostril; no contrasting floating pipes.
 nost=ellipsoid('V6 HEAD / nostril '+str(sign),(sign*.185,-2.12,3.245),(.008,.034,.012),'dark','head',24,12);nost.rotation_euler.x=.45
# Deep mandible: rising rear ramus, strong underside, narrowed but rounded chin.
# y, width, inner-rim height, ventral height.
jawrows=[(-1.12,.10,3.24,3.10),(-1.28,.235,3.205,2.99),(-1.48,.262,3.125,2.91),(-1.71,.238,3.065,2.91),(-1.95,.177,3.035,2.915),(-2.14,.111,3.04,2.95),(-2.24,.045,3.055,2.99),(-2.25,.005,3.045,3.02)]
qs=catmull([(r[0],r[2],r[3]) for r in jawrows],9);ws=catmull([(r[1],0,0) for r in jawrows],9)
profile=[(-1,.74),(-.98,1),(-.81,1.04),(-.65,.78),(-.40,.56),(0,.49),(.40,.56),(.65,.78),(.81,1.04),(.98,1),(1,.74),(.92,.31),(.55,.035),(0,0),(-.55,.035),(-.92,.31)]
vs=[];fs=[];K=len(profile)
for i,(q,d) in enumerate(zip(qs,ws)):
 y,top,bot=q
 for x,z in profile:vs.append((x*max(.004,d.x),y,bot+max(.02,top-bot)*z))
 if i:
  for k in range(K):fs.append(((i-1)*K+k,(i-1)*K+(k+1)%K,i*K+(k+1)%K,i*K+k))
fs.extend([tuple(reversed(range(K))),tuple((len(qs)-1)*K+k for k in range(K))]);jaw=mesh('V6 JAW / deep sculpted U mandible',vs,fs,'silver','jaw');jaw.data.materials.append(M['mouth'])
for p in jaw.data.polygons:
 if p.index<(len(qs)-1)*K and 2<=p.index%K<=7:p.material_index=1
for sign in [-1,1]:
 side_patch('V6 JAW / flared posterior ramus '+str(sign),sign,[(-1.17,3.26),(-1.35,3.17),(-1.64,2.98),(-1.51,2.87),(-1.24,2.96),(-1.06,3.10)], [.15,.25,.22,.23,.21,.11],.015,'silver','jaw')
 # Small swept under-chin flange seen in classic design, integrated into rear jaw.
 side_patch('V6 JAW / angular rear spur '+str(sign),sign,[(-1.32,3.06),(-1.15,3.08),(-1.03,3.01),(-.93,2.87),(-1.20,2.94),(-1.38,2.93)],[.20,.20,.19,.18,.22,.22],.014,'silver','jaw')
ellipsoid('V6 JAW / closed chin tip',(0,-2.235,3.024),(.052,.027,.035),'silver','jaw',40,24)
# Teeth roots embedded in armor. Unequal compact fangs have curved convex sides.
def tooth(name,p,length,radius,sign,bone,up=False):
 d=1 if up else -1
 return tube(name,[p,p+Vector((-sign*.008,.008,length*d*.43)),p+Vector((-sign*.012,.026,length*d*.82)),p+Vector((-sign*.014,.039,length*d))],[radius,radius*.82,radius*.36,.001],'tooth',bone,16,7)
for sign in [-1,1]:
 for i,(y,length) in enumerate([(-1.40,.065),(-1.50,.078),(-1.60,.075),(-1.70,.071),(-1.80,.073),(-1.90,.065),(-2.00,.059),(-2.09,.053),(-2.17,.047)]):
  w,top,bot=sample(sections,y);tooth('V6 TEETH / upper %s %s'%(sign,i),Vector((sign*w*.87,y,bot+.009)),length,.026 if i<5 else .022,sign,'head')
 for i,(y,length) in enumerate([(-1.47,.047),(-1.58,.054),(-1.69,.052),(-1.80,.048),(-1.91,.045),(-2.02,.040),(-2.12,.035)]):
  w,top,bot=sample(jawrows,y);tooth('V6 TEETH / lower %s %s'%(sign,i),Vector((sign*w*.83,y,top-.009)),length,.022 if i<5 else .018,sign,'jaw',True)
# Palate fits inside upper dental arch, darker than the silhouette.
def oral_surface(name,lower=False):
 vs=[];fs=[];N=40;K=24
 for i in range(N+1):
  y=-1.19-i*(1.035 if lower else 1.075)/N;w,top,bot=sample(jawrows if lower else sections,y)
  for k in range(K+1):
   u=-1+2*k/K;x=u*w*.76
   z=bot+(top-bot)*(.50+.48*abs(u)**3)+.002 if lower else bot-.022+.018*u*u
   vs.append((x,y,z))
  if i:
   for k in range(K):fs.append(((i-1)*(K+1)+k,(i-1)*(K+1)+k+1,i*(K+1)+k+1,i*(K+1)+k))
 return mesh(name,vs,fs,'mouth','jaw' if lower else 'head')
oral_surface('V6 MOUTH / curved upper palate');oral_surface('V6 MOUTH / recessed floor',True)
# Back of mouth is a continuous deforming throat, inset behind the visible teeth.
vs=[];fs=[];N=24;K=24
for i in range(N+1):
 t=i/N
 for k in range(K+1):
  u=-1+2*k/K;w=.20*(.78+.22*sin(pi*t))
  x=u*w;z=3.255*(1-t)+3.10*t
  y=-1.20+.13*(1-u*u)*sin(pi*t)
  vs.append((x,y,z))
 if i:
  for k in range(K):fs.append(((i-1)*(K+1)+k,(i-1)*(K+1)+k+1,i*(K+1)+k+1,i*(K+1)+k))
ob=mesh('V6 MOUTH / concave articulated throat',vs,fs,'mouth',None);hg=ob.vertex_groups.new(name='head');jg=ob.vertex_groups.new(name='jaw')
for v in ob.data.vertices:
 t=(v.index//(K+1))/N;hg.add([v.index],1-t,'REPLACE');jg.add([v.index],t,'REPLACE')
for sign in [-1,1]:
 vs=[];fs=[];N=20;K=12
 for i in range(N+1):
  y=-1.19-.34*i/N;w,_,top=sample(sections,y);wl,lo,bot=sample(jawrows,y)
  for k in range(K+1):
   u=k/K;x=sign*(w*.68*(1-u)+wl*.63*u)*(1-.22*sin(pi*u))
   vs.append((x,y,(top-.012)*(1-u)+(lo-.06)*u))
  if i:
   for k in range(K):fs.append(((i-1)*(K+1)+k,(i-1)*(K+1)+k+1,i*(K+1)+k+1,i*(K+1)+k))
 ob=mesh('V6 MOUTH / inset flexible cheek '+str(sign),vs,fs,'mouth',None);hg=ob.vertex_groups.new(name='head');jg=ob.vertex_groups.new(name='jaw')
 for v in ob.data.vertices:
  u=(v.index%(K+1))/K;hg.add([v.index],1-u,'REPLACE');jg.add([v.index],u,'REPLACE')
# Tongue stays below the teeth and ends well behind the chin.
vs=[];fs=[];N=32;K=24
for i in range(N+1):
 t=i/N;y=-1.28-.71*t;w,top,bot=sample(jawrows,y);width=.11*sin(pi*t)**.7+.002
 for k in range(K):
  a=2*pi*k/K;vs.append((sin(a)*width,y,bot+(top-bot)*.51+cos(a)*.018*sin(pi*t)))
 if i:
  for k in range(K):fs.append(((i-1)*K+k,(i-1)*K+(k+1)%K,i*K+(k+1)%K,i*K+k))
fs.extend([tuple(reversed(range(K))),tuple(N*K+k for k in range(K))]);mesh('V6 MOUTH / inset tongue',vs,fs,'tongue','jaw')
# Rig joints match the posterior ramus. The neutral opening is modeled, not forced by animation.
bpy.ops.object.select_all(action='DESELECT');rig.select_set(True);bpy.context.view_layer.objects.active=rig;bpy.ops.object.mode_set(mode='EDIT')
b=rig.data.edit_bones['jaw'];b.head=(0,-1.16,3.235);b.tail=(0,-2.05,3.02)
b=rig.data.edit_bones['breath_origin'];b.head=(0,-2.03,3.12);b.tail=(0,-2.49,3.12)
bpy.ops.object.mode_set(mode='OBJECT')
for ob in parts:
 bm=bmesh.new();bm.from_mesh(ob.data);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(ob.data);bm.free()
 if len(ob.vertex_groups)==1:ob.vertex_groups[0].add(list(range(len(ob.data.vertices))),1,'REPLACE')
 mod=ob.modifiers.new('Skeletal deformation','ARMATURE');mod.object=rig;ob.parent=rig
scene.frame_set(1);rig['revision']='v006 / craniofacial reconstruction';rig['mouth_note']='Broad curved maxilla; inset angular eyes; sculpted cheek planes; deep mandible; inset gingiva; posterior jaw articulation.'
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'source','base-v006.blend'))
# Cheap shape-first studies before full export/render.
cam=scene.camera;scene.cycles.samples=20;scene.render.resolution_x=1000;scene.render.resolution_y=800
for name,pos,target,scale in [('study-3q',(7,-12,4.5),(0,-1.5,3.36),2.30),('study-profile',(12,-1.5,3.8),(0,-1.5,3.36),2.30)]:
 cam.location=pos;cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=scale;scene.render.filepath=os.path.join(OUT,'renders',name+'.png');bpy.ops.render.render(write_still=True)
print('HEAD_REBUILT',len(parts))
