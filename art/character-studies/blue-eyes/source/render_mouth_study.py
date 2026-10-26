import bpy,os
from mathutils import Vector
OUT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
bpy.ops.wm.open_mainfile(filepath=os.path.join(OUT,'source','blue-eyes-v006.blend'))
s=bpy.context.scene;rig=bpy.data.objects['BlueEyes_Rig'];cam=s.camera
s.cycles.samples=28;s.render.resolution_x=1100;s.render.resolution_y=850
for name,action,frame,pos,scale in [
 ('09-mouth-rest','idle',1,(7,-12,4.8),2.55),
 ('10-mouth-profile','idle',1,(12,-1.5,4.1),2.40),
 ('11-mouth-roar','attack',45,(7,-12,4.8),2.65)]:
 a=bpy.data.actions[action];rig.animation_data.action=a;rig.animation_data.action_slot=a.slots[0];s.frame_set(frame)
 cam.location=pos;cam.rotation_euler=(Vector((0,-1.52,3.0 if action=='attack' else 3.25))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=scale
 s.render.filepath=os.path.join(OUT,'renders',name+'.png');bpy.ops.render.render(write_still=True)
