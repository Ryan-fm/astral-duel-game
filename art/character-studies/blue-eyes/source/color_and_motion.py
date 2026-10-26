"""Blue-Eyes v006: portable vertex-painted color and authored skeletal motion."""
import bpy,os,math,json
from mathutils import Vector,Matrix,Euler
from mathutils.kdtree import KDTree
from math import sin,cos,pi
OUT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
bpy.ops.wm.open_mainfile(filepath=os.path.join(OUT,'source','base-v006.blend'))
s=bpy.context.scene;rig=bpy.data.objects['BlueEyes_Rig'];col=bpy.data.collections['01 • BLUE-EYES — editable sculpture']
settings={
 '01 | Moon silver enamel':((.36,.51,.64),.58,.28),
 '02 | Platinum bevel':((.68,.84,.91),.62,.23),
 '03 | Blue graphite joints':((.014,.04,.075),.25,.42),
 '04 | Pearl ventral armor':((.20,.34,.46),.5,.32),
 '05 | Blue wing membrane':((1,1,1),.08,.47),
 '06 | Inner mouth blue':((.012,.002,.004),.0,.70),
 '07 | Ivory silver claws':((.62,.73,.78),.58,.24),
 '08 | Azure eyes':((.002,.09,.62),.20,.20)}
for name,(color,metal,rough) in settings.items():
 m=bpy.data.materials[name];p=m.node_tree.nodes['Principled BSDF'];m.diffuse_color=(*color,1);p.inputs['Base Color'].default_value=(*color,1);p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=rough;p.inputs['Coat Weight'].default_value=.15
p=bpy.data.materials['08 | Azure eyes'].node_tree.nodes['Principled BSDF'];p.inputs['Emission Color'].default_value=(.005,.30,1,1);p.inputs['Emission Strength'].default_value=.65
wingmat=bpy.data.materials['05 | Blue wing membrane'];vc=wingmat.node_tree.nodes.new('ShaderNodeVertexColor');vc.layer_name='Col';wingmat.node_tree.links.new(vc.outputs['Color'],wingmat.node_tree.nodes['Principled BSDF'].inputs['Base Color'])
# Every component has a white color layer; only membranes receive gradient pigment.
# This keeps the joined GLB's other materials unchanged while exporting COLOR_0.
for ob in col.objects:
 if ob.type!='MESH':continue
 ca=ob.data.color_attributes.get('Col') or ob.data.color_attributes.new(name='Col',type='FLOAT_COLOR',domain='CORNER');ob.data.color_attributes.active_color=ca
 colors=[];membrane=ob.name.startswith('V4 WING / membrane')
 for loop in ob.data.loops:
  p=ob.matrix_world@ob.data.vertices[loop.vertex_index].co
  if membrane:
   tip=max(0,min(1,(abs(p.x)-.55)/2.85));height=max(0,min(1,(p.z-1.9)/2.3))
   t=.6*tip+.4*(1-height);r=.045+.10*t;g=.10+.17*t;b=.19+.22*t
   # Fine color variation follows the stretched wing surface, without fake geometry.
   shade=1+.055*sin(p.x*22+p.z*12);colors.extend((r*shade,g*shade,b*shade,1))
  else:colors.extend((1,1,1,1))
 ca.data.foreach_set('color',colors)
# Blue inset plates and white raised edges define a readable two-tone sculpture.
for ob in col.objects:
 if ob.name.startswith(('V2 CHEST / wrapped V armor','V2 TAIL / fine articulation','V2 NECK / inner ventral')):
  ob.data.materials.clear();ob.data.materials.append(bpy.data.materials['04 | Pearl ventral armor'])
 if ob.name.startswith(('V2 HEAD / swept temple','V2 HEAD / lower cheek')):
  ob.data.materials.clear();ob.data.materials.append(bpy.data.materials['04 | Pearl ventral armor'])
# Reset old actions before rebinding continuous anatomical surfaces.
rig.animation_data_clear()
for a in list(bpy.data.actions):bpy.data.actions.remove(a)
for b in rig.pose.bones:b.rotation_mode='QUATERNION';b.rotation_quaternion=(1,0,0,0);b.location=(0,0,0);b.scale=(1,1,1)
paths=json.loads(rig['anatomy_paths']);neckpts=paths['neck'];tailpts=paths['tail']
def at(points,t):
 p=[Vector(v) for v in points];u=t*(len(p)-1);j=min(int(u),len(p)-2);u-=j;a=p[max(0,j-1)];b=p[j];c=p[j+1];d=p[min(j+2,len(p)-1)]
 return .5*(2*b+(-a+c)*u+(2*a-5*b+4*c-d)*u*u+(-a+3*b-3*c+d)*u*u*u)
for prefix,points,count in [('neck',neckpts,3),('tail',tailpts,6)]:
 kd=KDTree(201)
 for i in range(201):kd.insert(at(points,i/200),i)
 kd.balance()
 for ob in col.objects:
  if not ob.name.startswith('V4 '+prefix.upper()+' /'):continue
  for g in list(ob.vertex_groups):ob.vertex_groups.remove(g)
  groups=[ob.vertex_groups.new(name=f'{prefix}.{i+1:02d}') for i in range(count)]
  for v in ob.data.vertices:
   _,idx,_=kd.find(ob.matrix_world@v.co);u=idx/200*(count-1);j=min(int(u),count-2);f=u-j
   groups[j].add([v.index],1-f,'REPLACE');groups[j+1].add([v.index],f,'REPLACE')
# Scapular roots blend into the torso; all other wing pieces share the same bend rule.
for ob in col.objects:
 if not ob.name.startswith(('V4 WING /',)):continue
 tag='L' if ob.name.endswith('L') or ' L ' in ob.name else 'R'
 for g in list(ob.vertex_groups):ob.vertex_groups.remove(g)
 gs={n:ob.vertex_groups.new(name=n) for n in ['chest','wing.'+tag,'wingtip.'+tag]}
 for v in ob.data.vertices:
  p=ob.matrix_world@v.co;x=abs(p.x);root=max(0,min(1,(x-.30)/.38));tip=max(0,min(1,(x-.95)/.8));tip=tip*tip*(3-2*tip)
  for n,w in [('chest',1-root),('wing.'+tag,root*(1-tip)),('wingtip.'+tag,root*tip)]:
   if w>0:gs[n].add([v.index],w,'REPLACE')
# Pose deltas use world axes, then convert into each bone's rest basis.
clips={};events={}
def pose(frame,rot={},loc={},scale={}):
 for b in rig.pose.bones:
  basis=b.bone.matrix_local.to_3x3();R=Euler(tuple(math.radians(a) for a in rot.get(b.name,(0,0,0))),'XYZ').to_matrix();b.rotation_quaternion=(basis.inverted()@R@basis).to_quaternion();b.location=basis.inverted()@Vector(loc.get(b.name,(0,0,0)));b.scale=scale.get(b.name,(1,1,1))
  for prop in ['rotation_quaternion','location','scale']:b.keyframe_insert(prop,frame=frame)
def wings(fold=0,lift=0,tip=0):
 return {'wing.L':(0,lift,fold),'wing.R':(0,-lift,-fold),'wingtip.L':(0,tip,tip*.4),'wingtip.R':(0,-tip,-tip*.4)}
def action(name,length,keys):
 rig.animation_data_create();a=bpy.data.actions.new(name);a.use_fake_user=True;rig.animation_data.action=a
 for f,r,l,sc in keys:pose(f,r,l,sc)
 # Explicitly attach the Blender 5 action slot to its NLA strip.
 t=rig.animation_data.nla_tracks.new();t.name=name;st=t.strips.new(name,1,a)
 if a.slots:st.action_slot=a.slots[0]
 st.action_frame_start=1;st.action_frame_end=length;t.mute=True
 for layer in a.layers:
  for strip in layer.strips:
   for bag in strip.channelbags:
    for fc in bag.fcurves:
     for kp in fc.keyframe_points:kp.interpolation='BEZIER';kp.handle_left_type='AUTO_CLAMPED';kp.handle_right_type='AUTO_CLAMPED'
 clips[name]={'frames':length,'duration':(length-1)/30};rig.animation_data.action=None
idleA={**wings(2,5,1),'chest':(-1.5,0,0),'neck.01':(-1.5,0,1),'neck.03':(1,0,-2),'head':(0,0,3),'jaw':(1.5,0,0),'tail.02':(0,0,3),'tail.04':(0,0,-4),'tail.06':(0,0,6),'forearm.L':(0,3,-3),'forearm.R':(0,-3,3)}
idleB={**wings(-2,-3,-1),'head':(1,0,-3),'jaw':(.5,0,0),'tail.02':(0,0,-3),'tail.04':(0,0,4),'tail.06':(0,0,-6)}
action('idle',121,[(1,{}, {},{}),(31,idleA,{}, {'chest':(1.02,1.018,1.018)}),(76,idleB,{},{}),(121,{}, {},{})])
action('summon',109,[(1,{**wings(45,-14,8),'neck.01':(9,0,0),'jaw':(0,0,0)}, {},{'root':(.18,.18,.18)}),(24,{**wings(35,-9,5),'neck.01':(5,0,0)}, {},{'root':(.9,.9,.9)}),(47,{**wings(-8,13,-4),'neck.01':(-7,0,0),'head':(-9,0,0),'jaw':(29,0,0)}, {},{}),(70,{**wings(0,-6,2),'jaw':(8,0,0),'tail.03':(0,0,8)}, {},{}),(109,{}, {},{})])
action('attack',97,[(1,{}, {},{}),(22,{**wings(12,4,3),'chest':(-4,0,0),'neck.01':(-7,0,0),'neck.02':(-4,0,0),'head':(-7,0,0),'jaw':(0,0,0),'forearm.L':(-6,0,0),'forearm.R':(-6,0,0)}, {},{}),(39,{**wings(-6,4,0),'chest':(5,0,0),'neck.01':(7,0,0),'neck.02':(3,0,0),'head':(-8,0,0),'jaw':(29,0,0)}, {},{}),(64,{**wings(-4,0,0),'chest':(4,0,0),'neck.01':(5,0,0),'head':(-6,0,0),'jaw':(25,0,0)}, {},{}),(97,{}, {},{})])
action('guard',97,[(1,{}, {},{}),(26,{**wings(26,-8,14),'chest':(3,0,0),'neck.01':(7,0,0),'head':(-5,0,0),'jaw':(1,0,0),'upper_arm.L':(-12,4,3),'upper_arm.R':(-12,-4,-3),'forearm.L':(-15,0,0),'forearm.R':(-15,0,0)}, {},{}),(65,{**wings(26,-8,14),'chest':(3,0,0),'neck.01':(7,0,0),'head':(-5,0,0),'jaw':(1,0,0),'upper_arm.L':(-12,4,3),'upper_arm.R':(-12,-4,-3),'forearm.L':(-15,0,0),'forearm.R':(-15,0,0)}, {},{}),(97,{}, {},{})])
action('hit',37,[(1,{}, {},{}),(8,{**wings(-12,8,0),'chest':(-7,0,-4),'neck.01':(-8,0,0),'head':(-6,0,7),'jaw':(9,0,0),'upper_arm.L':(0,0,10),'upper_arm.R':(0,0,-8)}, {},{}),(18,{'chest':(3,0,2),'neck.01':(3,0,0),'head':(2,0,-2)}, {},{}),(37,{}, {},{})])
action('defeat',109,[(1,{}, {},{}),(38,{**wings(20,-13,6),'chest':(6,0,0),'neck.01':(10,0,0),'neck.02':(8,0,0),'head':(6,0,0),'jaw':(0,0,0)}, {},{}),(76,{**wings(32,-20,10),'chest':(8,0,0),'neck.01':(13,0,0),'neck.02':(10,0,0),'head':(8,0,0),'jaw':(0,0,0)}, {},{}),(109,{**wings(32,-20,10),'neck.01':(10,0,0),'jaw':(0,0,0)}, {},{'root':(.03,.03,.03)})])
events={'summon':{'ring':[0,2.3],'roar':[1.1,2.4]},'attack':{'charge':[.25,1.2],'breath':[1.2,2.2]},'hit':{'flash':[.08,.28]},'defeat':{'dissolve':[2.4,3.6]}}
rig.animation_data.action=None
for b in rig.pose.bones:b.rotation_quaternion=(1,0,0,0);b.location=(0,0,0);b.scale=(1,1,1)
s.frame_set(1);rig['stage']='visual_design_sample_v006';rig['revision']='v006 / rebuilt head, cheek planes and deep mandible';rig['clips']=json.dumps(clips);rig['events']=json.dumps(events)
s.render.resolution_x=1400;s.render.resolution_y=1050;s.cycles.samples=32
# Neutral lights retain color separation rather than flattening all parts to white.
for ob in bpy.data.objects:
 if ob.type=='LIGHT':ob.data.energy*=1.0
s.view_settings.exposure=-.15
source=os.path.join(OUT,'source','blue-eyes-v006.blend');bpy.ops.wm.save_as_mainfile(filepath=source)
report={'asset_id':'blue_eyes','revision':'v006','stage':'craniofacial reconstruction with articulated deep mandible','triangles':sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in col.objects),'mesh_components':len(col.objects),'bones':len(rig.data.bones),'materials':len({m.name for o in col.objects for m in o.data.materials if m}),'animations':clips,'animation_events':events,'source':'source/blue-eyes-v006.blend','runtime':'models/blue-eyes-v006.glb','color':'Portable vertex-painted blue wing gradient; silver-blue body; steel-blue ventral armor; silver claws; azure eyes.'}
bpy.ops.object.select_all(action='DESELECT')
for ob in col.objects:ob.select_set(True)
bpy.context.view_layer.objects.active=next(iter(col.objects));bpy.ops.object.join();bpy.context.object.name='BlueEyes_Colored_Surface';rig.select_set(True)
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,'models','blue-eyes-v006.glb'),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='NLA_TRACKS',export_anim_single_armature=True,export_def_bones=True,export_materials='EXPORT',export_extras=True,export_vertex_color='NAME',export_vertex_color_name='Col')
report['runtime_bytes']=os.path.getsize(os.path.join(OUT,'models','blue-eyes-v006.glb'));json.dump(report,open(os.path.join(OUT,'asset-report.json'),'w'),ensure_ascii=False,indent=2)
bpy.ops.wm.open_mainfile(filepath=source);s=bpy.context.scene;s.render.filepath=os.path.join(OUT,'renders','01-three-quarter.png');bpy.ops.render.render(write_still=True)
