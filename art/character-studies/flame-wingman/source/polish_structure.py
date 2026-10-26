import bpy,os,math,json
from mathutils import Vector
from math import pi,sin,cos
OUT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
bpy.ops.wm.open_mainfile(filepath=os.path.join(OUT,'source','flame-wingman-v001.blend'))
col=bpy.data.collections['01 • FLAME WINGMAN — editable components'];rig=bpy.data.objects['FlameWingman_Rig'];s=bpy.context.scene
# Remove the design's early temporary scutes and bead-like back vertebrae.
for ob in list(col.objects):
 if ob.name.startswith(('TAIL / ventral','BACK / vertebra')):bpy.data.objects.remove(ob,do_unlink=True)
def mesh(name,vs,fs,mat,bone):
 me=bpy.data.meshes.new(name);me.from_pydata(vs,[],fs);me.update();o=bpy.data.objects.new(name,me);col.objects.link(o);me.materials.append(bpy.data.materials[mat])
 for p in me.polygons:p.use_smooth=True
 o.vertex_groups.new(name=bone).add(list(range(len(vs))),1,'REPLACE');a=o.modifiers.new('Armature deformation','ARMATURE');a.object=rig;o.parent=rig;return o
def shell(name,poly,y,depth,mat,bone):
 n=len(poly);cx=sum(x for x,z in poly)/n;cz=sum(z for x,z in poly)/n;vs=[];fs=[]
 for r,b in [(1,0),(.94,.35),(.76,.85),(.12,1)]:
  for x,z in poly:vs.append((cx+(x-cx)*r,y-depth*b,cz+(z-cz)*r))
 for j in range(3):
  for k in range(n):fs.append((j*n+k,j*n+(k+1)%n,(j+1)*n+(k+1)%n,(j+1)*n+k))
 fs.extend([tuple(range(n*3,n*4)),tuple(reversed(range(n)))])
 return mesh(name,vs,fs,mat,bone)
for side in [-1,1]:
 poly=[(.08,2.73),(.08,3.03),(.30,3.16),(.50,3.05),(.49,2.81),(.30,2.46),(.23,2.40),(.21,2.65)]
 shell('POLISH / scapula continuous armor '+str(side),[(side*x,z) for x,z in poly],.22,-.085,'01 | Emerald enamel','chest')
 shell('POLISH / waist dorsal armor '+str(side),[(side*.11,2.22),(side*.27,2.22),(side*.34,2.42),(side*.24,2.52),(side*.10,2.4)],.205,-.055,'05 | Obsidian armor','spine')
for i in range(7):
 z=2.18+i*.115;w=.072+.02*sin(i*pi/6)
 shell('POLISH / spine interlocking plate %02d'%i,[(-w,z+.05),(0,z+.09),(w,z+.05),(w*.68,z-.035),(0,z-.065),(-w*.68,z-.035)],.25,-.047,'05 | Obsidian armor','spine' if i<4 else 'chest')
# A sculpted cover closes the rear dragon collar with a taper into the crown.
shell('POLISH / dragon nape shell',[(-1.32,2.96),(-1.33,3.30),(-1.21,3.51),(-1.1,3.60),(-.97,3.45),(-.89,3.15),(-.92,2.96),(-1.09,2.86)],.21,-.13,'03 | Dragon crimson','forearm.L')
shell('POLISH / dragon dorsal keel',[(-1.15,3.05),(-1.2,3.32),(-1.1,3.6),(-1.0,3.32),(-1.05,3.05)],.32,-.07,'05 | Obsidian armor','forearm.L')
# Correct tail scutes: radius matches the skin at every station; facing the belly.
points=[(0,.27,2.02),(.2,.64,1.76),(.84,.79,1.33),(1.24,.64,.88),(1.13,.20,.53),(.61,-.15,.43),(-.05,-.12,.58),(-.58,.08,.99),(-.81,.16,1.38)]
rads=[.19,.21,.21,.19,.15,.12,.085,.05,.004]
def sample(t):
 u=t*(len(points)-1);i=min(int(u),len(points)-2);u-=i
 a=Vector(points[max(0,i-1)]);b=Vector(points[i]);c=Vector(points[i+1]);d=Vector(points[min(i+2,len(points)-1)])
 return .5*(2*b+(-a+c)*u+(2*a-5*b+4*c-d)*u*u+(-a+3*b-3*c+d)*u*u*u)
def deform(p):
 fac=max(0,min(1,(1.7-p.z)/1.15));return p+Vector((.10*fac,.22*fac,0))
for i in range(36):
 t=.035+i*.025
 p=sample(t);tang=(sample(min(.999,t+.005))-sample(max(0,t-.005))).normalized();a=tang.cross(Vector((0,-1,0))).normalized();b=tang.cross(a).normalized()
 u=t*8;j=min(int(u),7);u-=j;r=rads[j]*(1-u)+rads[j+1]*u+.004
 vs=[];fs=[]
 for v in [-1,1]:
  for k in range(13):
   angle=-.40*pi+k*.8*pi/12
   q=p+tang*v*.041+(a*sin(angle)-b*cos(angle))*r
   vs.append(deform(q))
 for k in range(12):fs.append((k,k+1,14+k,13+k))
 fs.extend([tuple(reversed(range(13))),tuple(range(13,26))])
 mesh('POLISH / articulated belly scute %02d'%i,vs,fs,'08 | Feather undersides',f'tail.{min(5,1+int(t*4)):02d}')
# Small gap for contact shadow; the model is grounded on the display plinth.
rig.location.z=-.025
# Stable model inspection state, independent of glTF export frame evaluations.
rig.animation_data.action=None
for track in rig.animation_data.nla_tracks:track.mute=True
for b in rig.pose.bones:b.location=(0,0,0);b.rotation_euler=(0,0,0);b.scale=(1,1,1)
s.frame_set(1)
# Correct saved Blender viewport orientation so opening the source is immediately useful.
from mathutils import Quaternion
for screen in bpy.data.screens:
 for a in screen.areas:
  if a.type=='VIEW_3D':
   a.spaces.active.region_3d.view_location=(.15,0,2.05);a.spaces.active.region_3d.view_distance=7.3
   a.spaces.active.region_3d.view_rotation=s.camera.rotation_euler.to_quaternion()
s.render.resolution_x=s.render.resolution_y=1400;s.cycles.samples=48
bpy.ops.object.select_all(action='DESELECT');rig.select_set(True);bpy.context.view_layer.objects.active=rig
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'source','flame-wingman-v001.blend'))
report=json.load(open(os.path.join(OUT,'asset-report.json')));report['mesh_components']=len(col.objects);report['triangles']=sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in col.objects)
# Runtime grouped mesh; source components stay untouched in the saved source file.
bpy.ops.object.select_all(action='DESELECT')
for o in col.objects:o.select_set(True)
bpy.context.view_layer.objects.active=next(iter(col.objects));bpy.ops.object.join();body=bpy.context.object;body.name='FlameWingman_Surface';rig.select_set(True)
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,'models','flame-wingman-v001.glb'),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='NLA_TRACKS',export_anim_single_armature=True,export_def_bones=True,export_materials='EXPORT',export_extras=True)
report['runtime_bytes']=os.path.getsize(os.path.join(OUT,'models','flame-wingman-v001.glb'));json.dump(report,open(os.path.join(OUT,'asset-report.json'),'w'),indent=2,ensure_ascii=False)
# Reopen saved source before all presentation renders: ensures the bind pose.
bpy.ops.wm.open_mainfile(filepath=os.path.join(OUT,'source','flame-wingman-v001.blend'))
s=bpy.context.scene;c=s.camera
for name,pos,target,scale in [('01-three-quarter',(3.4,-12,4.6),(.10,0,2.08),5.35),('02-front',(0,-12,3.2),(.1,0,2.1),5.2),('03-back',(-4,11,4.8),(.1,0,2.1),5.35),('04-detail',(-3,-10,5),(-.35,0,3.2),3.2),('05-side',(11,-1,4),(.1,0,2.1),5.25)]:
 c.location=pos;c.rotation_euler=(Vector(target)-c.location).to_track_quat('-Z','Y').to_euler();c.data.ortho_scale=scale;s.render.filepath=os.path.join(OUT,'renders',name+'.png');bpy.ops.render.render(write_still=True)
