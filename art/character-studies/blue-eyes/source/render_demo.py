import bpy,os,math
from mathutils import Vector
OUT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
bpy.ops.wm.open_mainfile(filepath=os.path.join(OUT,'source','blue-eyes-v006.blend'))
s=bpy.context.scene;rig=bpy.data.objects['BlueEyes_Rig'];s.cycles.samples=6;s.render.resolution_x=640;s.render.resolution_y=480;s.render.fps=12
os.makedirs(os.path.join(OUT,'renders','demo-frames'),exist_ok=True)
def emissive(name,color,strength):
 m=bpy.data.materials.new(name);m.use_nodes=True;p=m.node_tree.nodes['Principled BSDF'];p.inputs['Base Color'].default_value=(*color,1);p.inputs['Emission Color'].default_value=(*color,1);p.inputs['Emission Strength'].default_value=strength;return m
blue=emissive('FX / azure',(.015,.22,1),4);white=emissive('FX / white cyan',(.3,.8,1),5)
bpy.ops.mesh.primitive_uv_sphere_add(segments=24,ring_count=12,radius=.18);orb=bpy.context.object;orb.data.materials.append(white)
bpy.ops.mesh.primitive_cylinder_add(vertices=24,radius=1,depth=1);beam=bpy.context.object;beam.data.materials.append(blue)
bpy.ops.mesh.primitive_cylinder_add(vertices=20,radius=1,depth=1);inner=bpy.context.object;inner.data.materials.append(white)
rings=[]
for radius in [1.3,1.65,2]:
 bpy.ops.mesh.primitive_torus_add(major_radius=radius,minor_radius=.014,major_segments=72,minor_segments=8,location=(0,.15,.08));o=bpy.context.object;o.data.materials.append(blue);rings.append(o)
def env(t,a,b,e=.15):return max(0,min(1,(t-a)/e))*max(0,min(1,(b-t)/e))
index=0
segments=[('idle',1.5),('summon',3.6),('attack',3.2),('guard',2.4),('hit',1.2),('defeat',3.6)]
for name,seconds in segments:
 action=bpy.data.actions[name];rig.animation_data.action=action;rig.animation_data.action_slot=action.slots[0];duration=action.frame_range[1]-1;count=round(seconds*12)
 for i in range(count):
  frame=1+duration*i/max(1,count-1);s.frame_set(int(frame),subframe=frame-int(frame));t=(frame-1)/30
  p=rig.pose.bones['breath_origin'];mat=rig.matrix_world@p.matrix;direction=(mat.to_3x3()@Vector((0,1,0))).normalized();pos=mat.translation+direction*.25
  for o in [orb,beam,inner,*rings]:o.hide_render=True
  if name=='attack':
   charge=env(t,.22,1.3,.22);blast=env(t,1.2,2.25,.12);orb.hide_render=charge+blast<=0;orb.location=pos;orb.scale=(.35+charge*.95+blast*.4,)*3
   for o,radius in [(beam,.09),(inner,.035)]:
    o.hide_render=blast<=0;length=3.4*max(0,min(1,(t-1.2)/.18));o.location=pos+direction*length*.5;o.rotation_euler=direction.to_track_quat('Z','Y').to_euler();o.scale=(radius*blast,radius*blast,length)
  if name in ['summon','defeat']:
   k=env(t,0,2.9,.35) if name=='summon' else env(t,2,3.6,.3)
   for o in rings:o.hide_render=k<=0;o.scale=(.65+min(t,2)*.4,)*2+(1,)
  s.render.filepath=os.path.join(OUT,'renders','demo-frames','%04d.png'%index);bpy.ops.render.render(write_still=True);index+=1
print('DEMO_FRAMES',index)
