import bpy,os,math
from mathutils import Vector
OUT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
bpy.ops.wm.open_mainfile(filepath=os.path.join(OUT,'source','blue-eyes-v006.blend'))
s=bpy.context.scene;c=s.camera;rig=bpy.data.objects['BlueEyes_Rig']
s.cycles.samples=10;s.render.resolution_x=800;s.render.resolution_y=600
os.makedirs(os.path.join(OUT,'renders','poses'),exist_ok=True)
for name,frame in [('idle',31),('summon',47),('attack',45),('guard',45),('hit',8),('defeat',76)]:
 rig.animation_data.action=bpy.data.actions[name];rig.animation_data.action_slot=bpy.data.actions[name].slots[0];s.frame_set(frame);c.location=(7,-12,5.7);c.rotation_euler=(Vector((0,.15,2.26))-c.location).to_track_quat('-Z','Y').to_euler();c.data.ortho_scale=8.2
 s.render.filepath=os.path.join(OUT,'renders','poses',name+'.png');bpy.ops.render.render(write_still=True)
rig.animation_data.action=None
for b in rig.pose.bones:b.location=(0,0,0);b.rotation_quaternion=(1,0,0,0);b.scale=(1,1,1)
s.frame_set(1);s.cycles.samples=8;s.render.resolution_x=720;s.render.resolution_y=540
