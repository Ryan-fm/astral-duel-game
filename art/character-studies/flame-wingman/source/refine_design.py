import bpy, os, math, json
from mathutils import Vector
OUT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
bpy.ops.wm.open_mainfile(filepath=os.path.join(OUT,'source','flame-wingman-v001.blend'))
scene=bpy.context.scene
rig=bpy.data.objects['FlameWingman_Rig'];col=bpy.data.collections['01 • FLAME WINGMAN — editable components']
# Increase enamel depth and roughness; separate silhouette from specular highlights.
settings={
 '01 | Emerald enamel':((.028,.225,.115),.45,.42),
 '02 | Jade edge':((.13,.4,.20),.42,.36),
 '03 | Dragon crimson':((.32,.017,.027),.38,.42),
 '04 | Vermilion edges':((.50,.038,.044),.35,.39),
 '05 | Obsidian armor':((.018,.026,.031),.5,.39),
 '07 | Ivory feather blades':((.65,.72,.65),.27,.4),
 '08 | Feather undersides':((.22,.30,.28),.35,.43),
}
for name,(color,metal,rough) in settings.items():
 m=bpy.data.materials[name];m.diffuse_color=(*color,1);p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=rough;p.inputs['Coat Weight'].default_value=.12
for o in bpy.data.objects:
 if o.type=='LIGHT':o.data.energy*=.72
scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value=.27
# Narrow tail and move sweep behind the legs to free the lower silhouette.
tailpath=[Vector(v) for v in [(0,.27,2.02),(.2,.64,1.76),(.84,.79,1.33),(1.24,.64,.88),(1.13,.20,.53),(.61,-.15,.43),(-.05,-.12,.58),(-.58,.08,.99),(-.81,.16,1.38)]]
for o in col.objects:
 if o.name.startswith('TAIL /'):
  # controlled displacement, no change to tail root connection
  for v in o.data.vertices:
   p=v.co; fac=max(0,min(1,(1.7-p.z)/1.15));p.y+=.22*fac;p.x+=.10*fac
 if o.name.startswith('PECTORAL /') and 'bevel' not in o.name:
  # enlarge and lift top edge; reduce round protrusion slightly
  for v in o.data.vertices:
   s=-1 if v.co.x<0 else 1
   v.co.x=s*(.015+(abs(v.co.x)-.015)*1.07)
   v.co.z=2.74+(v.co.z-2.74)*1.16
   v.co.y=-.17+(v.co.y+.17)*.88
 if o.name.startswith('LEG / upper tendon'):
  # eliminate tube cut-off look at hip by tapering top section
  for v in o.data.vertices:
   if v.co.z>1.8:
    s=-1 if v.co.x<0 else 1;fac=(v.co.z-1.8)/.25
    v.co.x=s*.255+(v.co.x-s*.255)*(1-.25*min(1,fac))
 if o.name.startswith('WING / primary blade'):
  # Subtle feather asymmetry, avoid perfectly uniform comb appearance.
  idx=int(o.name[-2:]); fac=1+.025*math.sin(idx*1.7)
  for v in o.data.vertices:
   if v.co.z<3.25:v.co.x=.65+(v.co.x-.65)*fac

# Helpers for precise custom additions; reuse existing materials and skeleton.
def mesh(name,vs,fs,mat,bone):
 me=bpy.data.meshes.new(name);me.from_pydata(vs,[],fs);me.update();o=bpy.data.objects.new(name,me);col.objects.link(o);o.data.materials.append(bpy.data.materials[mat])
 for p in me.polygons:p.use_smooth=True
 o.vertex_groups.new(name=bone).add(list(range(len(vs))),1,'REPLACE');a=o.modifiers.new('Armature deformation','ARMATURE');a.object=rig;o.parent=rig;return o

def shell(name,poly,y,depth,mat,bone):
 # Four-ring low bevel: broad surfaces, deliberate edges, not spherical buttons.
 n=len(poly); cx=sum(v[0] for v in poly)/n;cz=sum(v[1] for v in poly)/n;vs=[];fs=[]
 for r,b in [(1,0),(.94,.35),(.75,.90),(.1,1)]:
  for x,z in poly:vs.append((cx+(x-cx)*r,y-depth*b,cz+(z-cz)*r))
 for j in range(3):
  for k in range(n):fs.append((j*n+k,j*n+(k+1)%n,(j+1)*n+(k+1)%n,(j+1)*n+k))
 fs.extend([tuple(range(n*3,n*4)),tuple(reversed(range(n)))])
 ob=mesh(name,vs,fs,mat,bone)
 # soften normals without changing pointed armor silhouette
 bevel=ob.modifiers.new('Edge highlights','BEVEL');bevel.width=.009;bevel.segments=2
 bpy.context.view_layer.objects.active=ob
 bpy.ops.object.modifier_move_up(modifier=bevel.name);bpy.ops.object.modifier_apply(modifier=bevel.name)
 return ob
for s in [-1,1]:
 suf='L' if s<0 else 'R';green='01 | Emerald enamel';black='05 | Obsidian armor'
 shell('REFINE / clavicle '+suf,[(s*.09,3.18),(s*.23,3.23),(s*.50,3.23),(s*.59,3.13),(s*.29,3.15),(s*.10,3.08)],-.11,.12,'03 | Dragon crimson' if s<0 else green,'chest')
 shell('REFINE / hip flared shell '+suf,[(s*.16,2.14),(s*.32,2.19),(s*.40,2.04),(s*.43,1.87),(s*.32,1.79),(s*.20,1.94)],-.09,.11,black,'hips')
 shell('REFINE / thigh extension '+suf,[(s*.26,1.94),(s*.33,2.02),(s*.43,1.91),(s*.48,1.7),(s*.37,1.62)],-.16,.055,green,'thigh.'+suf)
 shell('REFINE / shoulder undercut '+suf,[(s*.40,3.05),(s*.67,3.17),(s*.78,3.04),(s*.69,2.89),(s*.52,2.88)],.03,-.15,'03 | Dragon crimson' if s<0 else green,'upper_arm.'+suf)
 # A restrained gold-silver connector makes plates feel attached to the suit.
 shell('REFINE / knee keel '+suf,[(s*.365,1.19),(s*.39,1.24),(s*.415,1.19),(s*.4,1.02),(s*.38,1.02)],-.225,.015,'02 | Jade edge','shin.'+suf)
 # Pointed jaw details; dark open recess remains between green facial structures.
 shell('REFINE / face razor '+suf,[(s*.04,3.43),(s*.08,3.47),(s*.08,3.38),(s*.025,3.3)],-.16,.025,green,'head')
# Replace torso's blank collar strip with central breastbone / neck collar.
shell('REFINE / sternum',[(-.032,2.78),(-.045,3.08),(0,3.22),(.045,3.08),(.032,2.78)],-.22,.04,'05 | Obsidian armor','chest')
# Dragon roof scales and side grooves; additional physical detail holds up in a close shot.
for s in [-1,1]:
 for i in range(3):
  x=-1.1+s*(.27+i*.035);z=3.25-i*.14
  shell(f'REFINE / dragon lamella {s} {i}',[(x,z+.10),(x+s*.14,z+.15),(x+s*.17,z+.05),(x+s*.04,z-.06)],-.13,.08,'03 | Dragon crimson','forearm.L')
 shell('REFINE / dragon cheek tear '+str(s),[(-1.1+s*.285,3.22),(-1.1+s*.38,3.34),(-1.1+s*.39,3.24),(-1.1+s*.30,3.11)],-.53,.025,'05 | Obsidian armor','forearm.L')
# Technical source remains editable, source mesh and rig are fully inspectable.
scene.cycles.samples=64
scene.camera.data.ortho_scale=5.35
scene.camera.location=(3.4,-12,4.6);scene.camera.rotation_euler=(Vector((.10,0,2.08))-scene.camera.location).to_track_quat('-Z','Y').to_euler()
# Source opens in the neutral pose, with lights and floor excluded from export.
rig.animation_data.action=None
for t in rig.animation_data.nla_tracks:t.mute=True
for b in rig.pose.bones:b.location=(0,0,0);b.rotation_euler=(0,0,0);b.scale=(1,1,1)
scene.frame_set(1)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'source','flame-wingman-v001.blend'))
# Merge into one skinned runtime mesh: 14 material groups, not hundreds of draw calls.
bpy.ops.object.select_all(action='DESELECT')
for ob in col.objects:ob.select_set(True)
bpy.context.view_layer.objects.active=next(iter(col.objects));bpy.ops.object.join()
body=bpy.context.object;body.name='FlameWingman_Surface'
rig.select_set(True)
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,'models','flame-wingman-v001.glb'),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='NLA_TRACKS',export_anim_single_armature=True,export_def_bones=True,export_materials='EXPORT',export_extras=True)
# Correct actual metrics after refinement. Source mesh components are preserved in .blend.
report=json.load(open(os.path.join(OUT,'asset-report.json')))
report['triangles']=sum(len(p.vertices)-2 for p in body.data.polygons);report['runtime_meshes']=1;report['runtime_material_groups']=len(body.data.materials);report['mesh_components']+=19
report['runtime_bytes']=os.path.getsize(os.path.join(OUT,'models','flame-wingman-v001.glb'))
json.dump(report,open(os.path.join(OUT,'asset-report.json'),'w'),indent=2,ensure_ascii=False)
scene.render.filepath=os.path.join(OUT,'renders','01-three-quarter.png');bpy.ops.render.render(write_still=True)
print('REFINED',report)
