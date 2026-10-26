import bpy,os,math
from mathutils import Vector
OUT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
bpy.ops.wm.open_mainfile(filepath=os.path.join(OUT,'source','flame-wingman-v001.blend'))
s=bpy.context.scene;c=s.camera;rig=bpy.data.objects['FlameWingman_Rig']
s.render.engine='CYCLES';s.cycles.samples=16;s.render.resolution_x=s.render.resolution_y=640
os.makedirs(os.path.join(OUT,'renders','poses'),exist_ok=True)
for name,frame in [('idle',31),('summon',40),('attack',24),('guard',28),('hit',7),('defeat',76)]:
 rig.animation_data.action=bpy.data.actions[name];s.frame_set(frame);c.location=(3.4,-12,4.6);c.rotation_euler=(Vector((.1,0,2.08))-c.location).to_track_quat('-Z','Y').to_euler();c.data.ortho_scale=5.5
 s.render.filepath=os.path.join(OUT,'renders','poses',name+'.png');bpy.ops.render.render(write_still=True)
rig.animation_data.action=None
for b in rig.pose.bones:b.location=(0,0,0);b.rotation_euler=(0,0,0);b.scale=(1,1,1)
s.frame_set(1)
s.render.engine='CYCLES';s.cycles.samples=8;s.render.resolution_x=s.render.resolution_y=720
os.makedirs(os.path.join(OUT,'renders','turntable-frames'),exist_ok=True)
for i in range(96):
 a=2*math.pi*i/96;c.location=(math.sin(a)*12,-math.cos(a)*12,4.6);c.rotation_euler=(Vector((.1,0,2.08))-c.location).to_track_quat('-Z','Y').to_euler();c.data.ortho_scale=5.6
 s.render.filepath=os.path.join(OUT,'renders','turntable-frames','%04d.png'%i);bpy.ops.render.render(write_still=True)
