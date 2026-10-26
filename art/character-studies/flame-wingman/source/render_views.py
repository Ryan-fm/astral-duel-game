import bpy, os, json
from mathutils import Vector
OUT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
bpy.ops.wm.open_mainfile(filepath=os.path.join(OUT,'source','flame-wingman-v001.blend'))
s=bpy.context.scene;c=s.camera;s.cycles.samples=40
for name,pos,target,scale in [('02-front',(0,-12,3.2),(.1,0,2.1),5.2),('03-back',(-4,11,4.8),(.1,0,2.1),5.35),('04-detail',(-3,-10,5),(-.35,0,3.2),3.2),('05-side',(11,-1,4),(.1,0,2.1),5.25)]:
 c.location=pos;c.rotation_euler=(Vector(target)-c.location).to_track_quat('-Z','Y').to_euler();c.data.ortho_scale=scale;s.render.filepath=os.path.join(OUT,'renders',name+'.png');bpy.ops.render.render(write_still=True)
