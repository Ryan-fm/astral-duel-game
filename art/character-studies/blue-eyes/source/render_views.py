import bpy,os
from mathutils import Vector
OUT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
bpy.ops.wm.open_mainfile(filepath=os.path.join(OUT,'source','blue-eyes-v006.blend'))
s=bpy.context.scene;c=s.camera;s.cycles.samples=32
for name,pos,target,scale in [('02-front',(0,-14,3.8),(0,-.1,1.95),7.8),('03-back',(-8,13,5.0),(0,.1,1.95),7.8),('04-detail',(8,-12,4.8),(0,-1.55,3.22),2.3),('05-side',(14,0,4.6),(0,-.15,2.05),6.7)]:
 c.location=pos;c.rotation_euler=(Vector(target)-c.location).to_track_quat('-Z','Y').to_euler();c.data.ortho_scale=scale;s.render.filepath=os.path.join(OUT,'renders',name+'.png');bpy.ops.render.render(write_still=True)
