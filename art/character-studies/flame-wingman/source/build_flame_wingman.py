"""Editable Flame Wingman design maquette. Blender 5.1 / no external assets.
All visible character geometry is modeled; references are not used as billboards.
"""
import bpy, math, os, json, random
from mathutils import Vector
from math import sin, cos, pi
OUT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
random.seed(17)
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
for dat in list(bpy.data.materials): bpy.data.materials.remove(dat)
scene=bpy.context.scene
scene.render.engine='CYCLES'; scene.cycles.samples=48
scene.cycles.use_denoising=True
scene.render.resolution_x=1400; scene.render.resolution_y=1400; scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'
scene.render.film_transparent=False
scene.render.fps=30
scene.view_settings.view_transform='AgX'
scene.world.color=(.12,.12,.12)
wn=scene.world.node_tree if scene.world.use_nodes else None
scene.world.use_nodes=True
scene.world.node_tree.nodes['Background'].inputs['Color'].default_value=(.16,.19,.23,1)
scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value=.33
character=bpy.data.collections.new('01 • FLAME WINGMAN — editable components'); scene.collection.children.link(character)
setcol=bpy.data.collections.new('02 • STUDIO — preview only'); scene.collection.children.link(setcol)
rigcol=bpy.data.collections.new('03 • SKELETON'); scene.collection.children.link(rigcol)
parts=[]

def mat(name,color,metal=.0,rough=.4,emission=None):
 m=bpy.data.materials.new(name); m.diffuse_color=(*color,1); m.use_nodes=True
 p=m.node_tree.nodes.get('Principled BSDF'); p.inputs['Base Color'].default_value=(*color,1); p.inputs['Metallic'].default_value=metal; p.inputs['Roughness'].default_value=rough
 p.inputs['Coat Weight'].default_value=.22; p.inputs['Coat Roughness'].default_value=.28
 if emission: p.inputs['Emission Color'].default_value=(*color,1); p.inputs['Emission Strength'].default_value=emission
 return m
M={
 'green':mat('01 | Emerald enamel',(.065,.34,.20),.38,.34),
 'greenlight':mat('02 | Jade edge',(.18,.53,.31),.32,.32),
 'red':mat('03 | Dragon crimson',(.43,.028,.045),.30,.34),
 'rededge':mat('04 | Vermilion edges',(.66,.065,.075),.28,.33),
 'black':mat('05 | Obsidian armor',(.027,.038,.047),.5,.32),
 'rubber':mat('06 | Graphite joint weave',(.015,.025,.027),.12,.56),
 'white':mat('07 | Ivory feather blades',(.74,.80,.73),.30,.33),
 'gray':mat('08 | Feather undersides',(.26,.35,.35),.4,.37),
 'bone':mat('09 | Porcelain teeth & claws',(.84,.81,.65),.15,.32),
 'eye':mat('10 | Crimson optics',(.9,.025,.015),.15,.3,1.8),
 'd_eye':mat('11 | Jade dragon eyes',(.23,.9,.32),.25,.28,1.3),
 'mouth':mat('12 | Inner mouth',(.029,.006,.008),.0,.55),
 'ember':mat('13 | Ember core',(.9,.15,.012),.2,.3,2.2),
 'silver':mat('14 | Steel inlay',(.40,.52,.5),.7,.28),
}

def move_col(o,c):
 for cc in list(o.users_collection): cc.objects.unlink(o)
 c.objects.link(o)

def finish(o,material,bone='chest',smooth=True,bevel=0):
 move_col(o,character)
 if material: o.data.materials.append(M[material] if isinstance(material,str) else material)
 if smooth:
  for p in o.data.polygons:p.use_smooth=True
 if bevel:
  mod=o.modifiers.new('Machined soft edge','BEVEL'); mod.width=bevel; mod.segments=2
  bpy.context.view_layer.objects.active=o; bpy.ops.object.modifier_apply(modifier=mod.name)
 if bone:
  g=o.vertex_groups.new(name=bone); g.add(list(range(len(o.data.vertices))),1,'REPLACE')
 o['part_role']=o.name; parts.append(o); return o

def mesh(name,verts,faces,material,bone='chest',bevel=0):
 me=bpy.data.meshes.new(name); me.from_pydata(verts,[],faces); me.update()
 ob=bpy.data.objects.new(name,me); character.objects.link(ob)
 return finish(ob,material,bone,True,bevel)

def ellipsoid(name,pos,scale,material,bone='chest',seg=32,rings=16):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=seg,ring_count=rings,location=pos)
 ob=bpy.context.object; ob.name=name; ob.scale=scale
 bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 return finish(ob,material,bone)

def catmull(points,steps=5):
 p=[Vector(v) for v in points]; res=[]
 for i in range(len(p)-1):
  a=p[max(i-1,0)]; b=p[i]; c=p[i+1]; d=p[min(i+2,len(p)-1)]
  for k in range(steps):
   t=k/steps
   res.append(.5*((2*b)+(-a+c)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t*t*t))
 res.append(p[-1]); return res

def tube(name,points,radii,material,bone='chest',sides=12,steps=5,ellipse=1):
 pts=catmull(points,steps); verts=[]; faces=[]
 for i,p in enumerate(pts):
  u=i/(len(pts)-1)*(len(radii)-1); j=min(int(u),len(radii)-2); t=u-j; rad=radii[j]*(1-t)+radii[j+1]*t
  tang=(pts[min(i+1,len(pts)-1)]-pts[max(i-1,0)]).normalized()
  ref=Vector((0,-1,0))
  if abs(tang.dot(ref))>.95: ref=Vector((1,0,0))
  a=tang.cross(ref).normalized(); b=tang.cross(a).normalized()
  for k in range(sides):
   ang=2*pi*k/sides; verts.append(p+rad*(a*cos(ang)+b*sin(ang)*ellipse))
  if i:
   for k in range(sides): faces.append(((i-1)*sides+k,(i-1)*sides+(k+1)%sides,i*sides+(k+1)%sides,i*sides+k))
 faces.append(tuple(reversed(range(sides)))); faces.append(tuple((len(pts)-1)*sides+k for k in range(sides)))
 return mesh(name,verts,faces,material,bone)

def loft(name,sections,material,bone='chest',sides=40):
 # sections: z, center x, center y, width, depth; interpolate organically.
 ss=catmull([s[:3] for s in sections],4)
 dims=catmull([(s[3],s[4],0) for s in sections],4)
 verts=[]; faces=[]
 for i,(s,d) in enumerate(zip(ss,dims)):
  z,x,y=s
  for k in range(sides):
   a=2*pi*k/sides; verts.append((x+d.x*cos(a),y+d.y*sin(a),z))
  if i:
   for k in range(sides):faces.append(((i-1)*sides+k,(i-1)*sides+(k+1)%sides,i*sides+(k+1)%sides,i*sides+k))
 faces+=[tuple(reversed(range(sides))),tuple((len(ss)-1)*sides+k for k in range(sides))]
 return mesh(name,verts,faces,material,bone)

def plate(name,poly,y,depth,material,bone='chest',sub=2):
 # A closed convex anatomical armor shell. Control polygon lies in XZ.
 c=Vector((sum(p[0] for p in poly)/len(poly),sum(p[1] for p in poly)/len(poly)))
 # smooth contour with two corner cutting rounds
 ps=[Vector(p) for p in poly]
 for _ in range(sub):
  ps=[q for i,a in enumerate(ps) for q in (a*.78+ps[(i+1)%len(ps)]*.22,a*.22+ps[(i+1)%len(ps)]*.78)]
 n=len(ps); verts=[]; faces=[]
 for ratio,bulge in [(1,0),(.93,.20),(.72,.75),(.4,1.0),(.08,1.05)]:
  for p in ps:
   q=c+(p-c)*ratio; verts.append((q.x,y-depth*bulge,q.y))
 for r in range(4):
  for k in range(n):faces.append((r*n+k,r*n+(k+1)%n,(r+1)*n+(k+1)%n,(r+1)*n+k))
 faces.append(tuple(range(4*n,5*n)))
 # Back cap; ends sealed for side/back review.
 faces.append(tuple(reversed(range(n))))
 return mesh(name,verts,faces,material,bone)

def line(name,points,material,bone='chest',r=.012):return tube(name,points,[r]*len(points),material,bone,8,4)

def spike(name,points,radius,material,bone='chest'):
 return tube(name,points,[radius,.65*radius,.008],material,bone,10,5)

# Body foundation: a continuous anatomical dark core with separated rigid armor.
loft('TORSO / continuous carbon musculature',[(1.94,0,.025,.25,.19),(2.2,0,.025,.30,.20),(2.42,0,.025,.34,.20),(2.70,0,.045,.49,.245),(2.99,0,.04,.62,.255),(3.13,0,.06,.50,.22),(3.23,0,.055,.19,.16)],'rubber')
loft('PELVIS / pointed cuirass',[(1.77,0,.04,.10,.15),(1.95,0,.04,.33,.20),(2.18,0,.04,.31,.21),(2.26,0,.05,.22,.18)],'black','hips')
plate('PELVIS / central blade',[(-.12,1.90),(0,1.78),(.12,1.9),(.1,2.15),(0,2.38),(-.1,2.15)],-.15,.09,'black','hips')
for s,label in [(-1,'dragon'),(1,'wing')]:
 chest=[(.03,2.78),(.24,2.70),(.47,2.74),(.69,2.96),(.60,3.14),(.35,3.18),(.07,3.09)]
 plate('PECTORAL / '+label,[(s*x,z) for x,z in chest],-.17,.19,'red' if s<0 else 'green')
 line('PECTORAL / fine outer bevel '+label,[(s*.09,-.23,3.1),(s*.34,-.25,3.17),(s*.59,-.21,3.12),(s*.67,-.2,2.99)],'rededge' if s<0 else 'greenlight',r=.009)
 for i,z in enumerate([2.62,2.44,2.28]):
  w=[.215,.185,.145][i]
  plate(f'ABDOMINAL / {label} {i}',[(s*.025,z-.065),(s*(w-.025),z-.085),(s*(w+.018),z+.065),(s*.025,z+.07)],-.19,.075,'green','spine')
 for i in range(4):
  z=2.28+i*.12
  line(f'OBLIQUE / rib {label} {i}',[(s*.19,-.13,z),(s*(.28+i*.03),-.05,z+.03),(s*(.29+i*.035),.10,z+.08)],'green', 'spine',r=.023)
 # back blades deliberately sculpted, not empty flat backs
 plate('BACK / scapular armor '+label,[(s*.06,2.76),(s*.45,2.72),(s*.55,3.05),(s*.25,3.17),(s*.08,3.04)],.23,-.11,'green')
 for i in range(4):
  ellipsoid(f'BACK / vertebra {label} {i}',(s*.058,.255,2.38+i*.15),(.055,.07,.075),'black','spine',20,12)
 spike('HIP / swept fin '+label,[(s*.25,.04,2.03),(s*.38,.10,2.18),(s*.44,.16,2.42)],.095,'black','hips')

# Legs: boots, tendons, armor pads and swept knee fins.
for s in [-1,1]:
 suf='L' if s<0 else 'R'; hip=(s*.245,.04,1.99); knee=(s*.39,-.025,1.10); ankle=(s*.43,.035,.30)
 tube('LEG / upper tendon '+suf,[hip,(s*.33,.055,1.65),knee],[.23,.22,.135],'black','thigh.'+suf,20,7,1.03)
 tube('LEG / shin tendon '+suf,[knee,(s*.42,.10,.76),ankle],[.13,.16,.105],'rubber','shin.'+suf,20,7)
 plate('LEG / long thigh enamel '+suf,[(s*.19,1.94),(s*.34,1.97),(s*.51,1.60),(s*.42,1.23),(s*.28,1.35),(s*.20,1.68)],-.10,.14,'green','thigh.'+suf)
 line('LEG / thigh edge '+suf,[(s*.27,-.16,1.89),(s*.40,-.22,1.62),(s*.40,-.17,1.35)],'greenlight','thigh.'+suf,r=.008)
 ellipsoid('KNEE / bearing '+suf,knee,(.15,.14,.15),'black','shin.'+suf,24,12)
 plate('KNEE / jade shield '+suf,[(s*.29,1.10),(s*.33,1.22),(s*.45,1.22),(s*.49,1.08),(s*.39,.96)],-.15,.08,'greenlight','shin.'+suf)
 plate('SHIN / split blade '+suf,[(s*.32,.97),(s*.49,.98),(s*.53,.66),(s*.48,.25),(s*.41,.18),(s*.34,.46)],-.065,.13,'green','shin.'+suf)
 spike('SHIN / lateral fin '+suf,[(s*.48,.09,.76),(s*.61,.12,.95),(s*.57,.14,1.17)],.085,'black','shin.'+suf)
 # heel and tapered broad toe with soles
 loft('BOOT / shell '+suf,[(.095,s*.43,-.15,.16,.34),(.16,s*.43,-.15,.16,.35),(.26,s*.43,-.09,.13,.26),(.37,s*.43,.025,.10,.13)],'black','foot.'+suf,32)
 plate('BOOT / green instep '+suf,[(s*.32,.25),(s*.4,.36),(s*.52,.29),(s*.57,.13),(s*.30,.13)],-.28,.09,'green','foot.'+suf)
 for i in [-1,0,1]:
  tube('BOOT / toe claw '+suf+str(i),[(s*.43+i*.07,-.35,.17),(s*.43+i*.075,-.48,.14),(s*.43+i*.075,-.53,.11)],[.038,.032,.006],'bone','foot.'+suf,8,4)
 line('BOOT / sole seam '+suf,[(s*.56,-.38,.125),(s*.43,-.49,.115),(s*.30,-.38,.125)],'silver','foot.'+suf,r=.008)
 # back calf ridges
 for k in range(4):line(f'CALF / cable {suf} {k}',[(s*.34,.17,.46+k*.1),(s*.43,.23,.47+k*.1),(s*.5,.17,.48+k*.1)],'black','shin.'+suf,r=.019)

# Neck and helmet. Head remains small and pointed like the original.
for i in range(4):
 ellipsoid('NECK / armor collar %02d'%i,(0,.04,3.18+i*.054),(.16-i*.012,.14-i*.008,.043),'black','neck',24,12)
loft('HEAD / obsidian helmet',[(3.32,0,-.035,.075,.075),(3.42,0,-.01,.155,.13),(3.60,0,.025,.164,.14),(3.73,0,.045,.10,.10),(3.79,0,.065,.02,.03)],'black','head',32)
for s in [-1,1]:
 plate('HEAD / cheek blade '+str(s),[(s*.015,3.32),(s*.095,3.36),(s*.165,3.54),(s*.116,3.59),(s*.045,3.45)],-.12,.035,'green','head',1)
 plate('HEAD / brow '+str(s),[(s*.025,3.56),(s*.155,3.60),(s*.147,3.56),(s*.045,3.52)],-.155,.022,'greenlight','head',1)
 plate('HEAD / red eye '+str(s),[(s*.037,3.545),(s*.133,3.565),(s*.112,3.528),(s*.05,3.523)],-.171,.006,'eye','head',0)
 spike('HEAD / swept temple horn '+str(s),[(s*.145,.06,3.58),(s*.22,.09,3.76),(s*.27,.12,3.93)],.063,'black','head')
 line('HEAD / temple seam '+str(s),[(s*.155,-.01,3.60),(s*.208,.035,3.74),(s*.244,.08,3.86)],'greenlight','head',r=.008)
plate('HEAD / pointed respirator',[(-.027,3.47),(-.034,3.35),(0,3.30),(.034,3.35),(.027,3.47)],-.17,.025,'green','head',1)
spike('HEAD / central flame crown',[(0,.04,3.69),(0,.10,3.94),(.045,.12,4.20)],.11,'black','head')
for s in [-1,1]:
 line('CROWN / flame inlay '+str(s),[(s*.025,-.065,3.70),(s*.057,-.025,3.77),(s*.033,.005,3.86),(s*.036,.035,3.94)],'rededge','head',r=.012)
 line('CROWN / thin flame '+str(s),[(s*.06,-.035,3.71),(s*.078,.0,3.77),(s*.068,.03,3.85)],'red','head',r=.009)

# Human arm / layered muscular armor, blade fins, skeletal claws.
tube('ARM.R / shoulder substrate',[(.59,.035,3.02),(.82,.015,2.89),(1.0,.02,2.61)],[.22,.21,.13],'rubber','upper_arm.R',20,7)
ellipsoid('ARM.R / deltoid',(.7,.025,3.015),(.265,.23,.22),'green','upper_arm.R')
plate('ARM.R / deltoid crest',[(.52,3.10),(.75,3.22),(.96,3.04),(.91,2.89),(.68,2.92)],-.09,.15,'green','upper_arm.R')
for i in range(5):
 z=2.63+i*.065; x=1.00-i*.035
 line('ARM.R / bicep articulation %02d'%i,[(x-.11,-.08,z+.015),(x,-.17,z),(x+.10,-.06,z+.02)],'green','upper_arm.R',r=.032)
ellipsoid('ARM.R / elbow bearing',(1.03,.02,2.58),(.135,.13,.13),'black','forearm.R')
tube('ARM.R / forearm',[(1.04,.02,2.6),(1.12,-.03,2.34),(1.14,-.09,2.12)],[.13,.17,.105],'black','forearm.R',20,6)
for i in range(5):
 z=2.19+i*.068; x=1.15-i*.012
 line('ARM.R / forearm jade scales %02d'%i,[(x-.10,-.08,z+.02),(x,-.20,z),(x+.11,-.06,z+.02)],'green','forearm.R',r=.036)
spike('ARM.R / elbow blade',[(1.13,.09,2.45),(1.31,.15,2.63),(1.39,.20,2.96)],.12,'black','forearm.R')
spike('ARM.R / wrist blade',[(1.21,.02,2.19),(1.40,.10,2.35),(1.45,.12,2.54)],.08,'black','forearm.R')
loft('HAND.R / armored palm',[(1.88,1.16,-.1,.12,.07),(2.03,1.16,-.10,.15,.10),(2.13,1.14,-.09,.10,.08)],'black','hand.R',24)
plate('HAND.R / dorsal shell',[(1.03,2.04),(1.14,2.14),(1.28,2.04),(1.26,1.89),(1.13,1.85)],-.16,.035,'bone','hand.R')
for k in range(4):
 x=1.05+k*.074; z=1.91-abs(k-1.5)*.025
 tube('HAND.R / finger %d'%k,[(x,-.10,z),(x+.012,-.17,z-.14),(x+.025,-.25,z-.22)],[.032,.027,.019],'black','hand.R',10,5)
 tube('HAND.R / porcelain talon %d'%k,[(x+.018,-.20,z-.17),(x+.025,-.30,z-.25),(x+.018,-.34,z-.18)],[.027,.022,.002],'bone','hand.R',10,5)
 ellipsoid('HAND.R / knuckle %d'%k,(x,-.17,z),(.038,.034,.045),'bone','hand.R',16,10)
tube('HAND.R / thumb',[(1.04,-.09,2.04),(.94,-.14,1.95),(.97,-.27,1.86)],[.055,.042,.012],'bone','hand.R',12,6)

# Dragon arm: open mouth volume, separate roof / cheeks / lower jaw, teeth.
tube('ARM.L / red upper arm',[(-.61,.025,3.03),(-.84,.07,2.91),(-.99,.05,2.77)],[.23,.22,.16],'red','upper_arm.L',24,6)
# Shoulder spiral relief familiar from the reference.
spiral=[]
for k in range(45):
 t=k/44; a=t*pi*4; r=.012+.12*t; spiral.append((-.69+r*cos(a),-.187,2.98+r*sin(a)))
line('ARM.L / shoulder spiral',spiral,'rededge','upper_arm.L',r=.018)
tube('DRAGON / neck collar',[(-.99,.07,2.73),(-1.06,.045,2.97),(-1.10,.05,3.22)],[.18,.25,.25],'red','forearm.L',24,6)
# Deep, open mouth cone with non-planar bowl, silhouette broad at the upper jaw.
center=(-1.10,-.40,3.10)
ellipsoid('DRAGON / recessed mouth cavity',center,(.315,.235,.48),'mouth','forearm.L',40,24)
# custom outer mouth ring; drawn in xz and bulged for genuine depth
outline=[(-1.12,3.68),(-.92,3.60),(-.78,3.39),(-.81,3.13),(-.90,2.82),(-1.08,2.65),(-1.25,2.79),(-1.40,3.10),(-1.42,3.41),(-1.30,3.59)]
# cheek shells frame open cavity and sweep into horns
for s in [-1,1]:
 x=-1.10+s*.28
 poly=[(x-s*.085,2.75),(x+s*.06,2.95),(x+s*.13,3.24),(x+s*.075,3.49),(x-s*.045,3.61),(x-s*.09,3.42),(x-s*.04,3.18),(x-s*.10,2.94)]
 plate('DRAGON / cheek armor '+str(s),poly,-.42,.15,'red','forearm.L',2)
 line('DRAGON / cheek rim '+str(s),[(x-s*.07,-.51,2.85),(x-s*.025,-.57,3.14),(x-s*.07,-.53,3.43)],'rededge','forearm.L',r=.022)
 # side green eyes on angled face, visible in 3/4 views
 plate('DRAGON / eye socket '+str(s),[(x+s*.005,3.38),(x+s*.14,3.48),(x+s*.12,3.30),(x+s*.045,3.28)],-.45,.075,'black','forearm.L',1)
 plate('DRAGON / triangular jade eye '+str(s),[(x+s*.03,3.377),(x+s*.112,3.438),(x+s*.095,3.327),(x+s*.055,3.32)],-.53,.011,'d_eye','forearm.L',0)
 line('DRAGON / eye slit '+str(s),[(x+s*.075,-.55,3.345),(x+s*.08,-.55,3.405)],'black','forearm.L',r=.009)
 spike('DRAGON / top swept horn '+str(s),[(x,.03,3.43),(x+s*.17,.18,3.66),(x+s*.26,.30,3.98)],.13,'black','forearm.L')
 line('DRAGON / horn red keel '+str(s),[(x,-.08,3.48),(x+s*.13,.06,3.68),(x+s*.23,.23,3.91)],'rededge','forearm.L',r=.025)
 spike('DRAGON / middle fin '+str(s),[(x,.03,3.20),(x+s*.25,.19,3.31),(x+s*.45,.31,3.39)],.12,'red','forearm.L')
 spike('DRAGON / lower fin '+str(s),[(x,.04,2.93),(x+s*.23,.13,2.88),(x+s*.31,.24,2.65)],.1,'black','forearm.L')
# Snout roof and lower jaw extend forward; nostril cavities and small crests.
plate('DRAGON / upper snout roof',[(-1.41,3.55),(-1.29,3.72),(-.94,3.72),(-.79,3.54),(-.95,3.44),(-1.28,3.44)],-.44,.26,'red','forearm.L')
plate('DRAGON / snout obsidian beak',[(-1.30,3.69),(-.94,3.69),(-.99,3.52),(-1.1,3.43),(-1.24,3.52)],-.68,.07,'black','forearm.L',1)
plate('DRAGON / lower mandible',[(-1.34,2.91),(-1.25,2.70),(-1.09,2.55),(-.93,2.72),(-.85,2.92),(-1.02,2.85),(-1.19,2.85)],-.44,.22,'red','forearm.L',1)
line('DRAGON / lower jaw ridge',[(-1.30,-.56,2.83),(-1.1,-.71,2.59),(-.9,-.56,2.83)],'rededge','forearm.L',r=.022)
for i in range(9):
 t=i/8; x=-1.36+.51*t
 z=3.40+.095*sin(pi*t); y=-.60+.045*sin(pi*t)
 length=.13+(.07 if i in (1,7) else .015*sin(i*2))
 tube('DRAGON / upper tooth %02d'%i,[(x,y,z),(x+.012,y-.035,z-length*.65),(x+.02,y-.025,z-length)],[.021,.014,.0015],'bone','forearm.L',8,3)
 z=2.83+.08*abs(2*t-1)
 tube('DRAGON / lower tooth %02d'%i,[(x,y,z),(x+.004,y-.025,z+.10),(x+.01,y-.02,z+.16)],[.02,.012,.0015],'bone','forearm.L',8,3)
# Small internal glowing furnace, inset rather than a large obscuring fireball.
ellipsoid('DRAGON / recessed ember throat',(-1.10,-.615,3.095),(.063,.025,.11),'ember','forearm.L',24,12)
for s in [-1,1]:
 line('DRAGON / throat filament '+str(s),[(-1.10+s*.03,-.62,3.02),(-1.10+s*.09,-.62,3.09),(-1.10+s*.06,-.62,3.19)],'rededge','forearm.L',r=.012)

# Single great wing. Each swept feather is a closed, thick, curved mesh.
def feather(name,controls,widths,bone='wing.tip',tone='white'):
 pts=catmull(controls,7); v=[]; f=[]; sides=8
 # octagonal convex section: strong center ridge, slim beveled edges
 profile=[(-1,0),(-.86,-.018),(0,-.043),(.86,-.018),(1,0),(.86,.018),(0,.026),(-.86,.018)]
 for i,p in enumerate(pts):
  u=i/(len(pts)-1)*(len(widths)-1); j=min(int(u),len(widths)-2); t=u-j; w=widths[j]*(1-t)+widths[j+1]*t
  tang=(pts[min(i+1,len(pts)-1)]-pts[max(i-1,0)]).normalized(); side=Vector((tang.z,0,-tang.x)).normalized()
  for sx,dy in profile:v.append(p+side*sx*w+Vector((0,dy*min(1,w/.08),0)))
  if i:
   for k in range(sides):f.append(((i-1)*sides+k,(i-1)*sides+(k+1)%sides,i*sides+(k+1)%sides,i*sides+k))
 f.append(tuple(reversed(range(sides)))); f.append(tuple((len(pts)-1)*sides+k for k in range(sides)))
 ob=mesh(name,v,f,tone,bone)
 # cool gray backs are actual material surfaces
 ob.data.materials.append(M['gray'])
 for p in ob.data.polygons:
  if p.index%8 in (4,5,6,7):p.material_index=1
 return ob
wingroot=(.43,.27,3.02)
tube('WING / muscular root',[wingroot,(.65,.37,3.37),(1.16,.42,3.70),(1.65,.43,3.76)],[.17,.19,.18,.075],'black','wing.base',18,6)
# Large contour feather with swept cutting edge, smaller overlapping inner lamellae.
for i in range(10):
 t=i/9
 controls=[(.55+.09*i,.32+.016*i,3.25+.042*i),(1.03+.102*i,.33+.013*i,3.45+.022*i),(1.13+.115*i,.29+.008*i,3.04-.06*i),(.91+.115*i,.17+.004*i,2.67-.105*i)]
 w=.115+.026*t
 feather('WING / primary blade %02d'%i,controls,[.045,w,w*.82,.002], 'wing.base' if i<3 else 'wing.tip')
 # Sculpted primary ridge, thin enough not to look like a wire cage.
 p0=Vector(controls[0]); p1=Vector(controls[1]); p2=Vector(controls[2]); p3=Vector(controls[3]);
 line('WING / primary ivory rib %02d'%i,[tuple(p0+Vector((0,-.045,0))),tuple(p1+Vector((0,-.045,0))),tuple(p2+Vector((0,-.045,0))),tuple(p3+Vector((0,-.005,.01)))],'white','wing.base' if i<3 else 'wing.tip',r=.009)
# upper wing sweep and extra long trailing feather, a reference signature
feather('WING / leading swept blade',[(.51,.36,3.36),(.92,.39,3.79),(1.77,.42,3.92),(2.20,.35,3.55)],[.07,.16,.16,.002],'wing.base')
feather('WING / long hooked trailing blade',[(1.92,.38,3.53),(2.32,.32,2.95),(1.85,.1,1.99),(.53,-.18,1.48)],[.07,.13,.10,.002],'wing.tip')
for k in range(5):
 x=.68+k*.25; z=3.55+sin(k/5*pi)*.28
 spike('WING / obsidian dorsal barb %02d'%k,[(x,.40,z),(x-.10,.42,z+.22),(x-.10,.45,z+.42-k*.025)],.085,'black','wing.base')
 line('WING / jade barb keel %02d'%k,[(x-.025,.31,z+.07),(x-.11,.36,z+.23),(x-.11,.42,z+.37-k*.023)],'greenlight','wing.base',r=.012)

# Articulated red tail with proper cross-sectional belly plates and dorsal spines.
tailpoints=[(0,.27,2.02),(.2,.64,1.76),(.84,.79,1.33),(1.24,.64,.88),(1.13,.20,.53),(.61,-.15,.43),(-.05,-.12,.58),(-.58,.08,.99),(-.81,.16,1.38)]
tail=tube('TAIL / red continuous skin',tailpoints,[.19,.21,.21,.19,.15,.12,.085,.05,.004],'red','tail.01',20,6)
# correct groups weighted along curve sample indices
for g in list(tail.vertex_groups):tail.vertex_groups.remove(g)
for n in range(5):tail.vertex_groups.new(name=f'tail.{n+1:02d}')
for v in tail.data.vertices:
 along=v.index//20/(len(catmull(tailpoints,6))-1)*4
 j=min(int(along),3); t=along-j
 tail.vertex_groups[f'tail.{j+1:02d}'].add([v.index],1-t,'REPLACE'); tail.vertex_groups[f'tail.{j+2:02d}'].add([v.index],t,'REPLACE')
pp=catmull(tailpoints,3)
for k in range(2,len(pp)-2):
 p=pp[k]; t=k/(len(pp)-1); r=.20*(1-t)+.025
 tang=(pp[k+1]-pp[k-1]).normalized(); a=tang.cross(Vector((0,-1,0))).normalized(); b=tang.cross(a).normalized()
 # pale belly strip on forward-facing half, convex segment with sealed back
 verts=[]; faces=[]
 for j,d in enumerate([-.038,.038]):
  for q in range(9):
   ang=pi*(.10+.80*q/8); v=p+tang*d+(a*cos(ang)+b*sin(ang))*(r+.012); verts.append(v)
 for q in range(8):faces.append((q,q+1,10+q,9+q))
 faces.extend([tuple(reversed(range(9))),tuple(range(9,18))])
 bone=f'tail.{min(5,1+int(t*4)):02d}'
 mesh('TAIL / ventral scute %02d'%k,verts,faces,'gray',bone)
 if k%2==0 and k<20:
  base=p+Vector((0,.06,r*.65)); spike('TAIL / dorsal thorn %02d'%k,[base,base+Vector((.02,.07,.13)),base+Vector((-.01,.10,.25*(1-t)))],.05*(1-t)+.015,'black',bone)

# Armature / animation. Hard plates bind rigidly; core deformation is distributed.
arm=bpy.data.armatures.new('FW_Skeleton'); rig=bpy.data.objects.new('FlameWingman_Rig',arm); rigcol.objects.link(rig)
bpy.context.view_layer.objects.active=rig; rig.select_set(True); bpy.ops.object.mode_set(mode='EDIT')
bones={}
def bone(name,head,tail,parent=None):
 b=arm.edit_bones.new(name); b.head=head; b.tail=tail
 if parent:b.parent=arm.edit_bones[parent]
 bones[name]=(head,tail); return b
bone('root',(0,0,0),(0,0,.4))
bone('hips',(0,.04,1.95),(0,.04,2.2),'root'); bone('spine',(0,.04,2.2),(0,.04,2.7),'hips');bone('chest',(0,.04,2.7),(0,.04,3.18),'spine')
bone('neck',(0,.04,3.18),(0,.04,3.39),'chest');bone('head',(0,.04,3.39),(0,.04,3.85),'neck')
for s in [-1,1]:
 suf='L' if s<0 else 'R'
 bone('thigh.'+suf,(s*.245,.04,1.99),(s*.39,-.025,1.1),'hips');bone('shin.'+suf,(s*.39,-.025,1.1),(s*.43,.035,.3),'thigh.'+suf);bone('foot.'+suf,(s*.43,.035,.3),(s*.43,-.38,.15),'shin.'+suf)
bone('upper_arm.R',(.59,.035,3.02),(1.03,.02,2.58),'chest');bone('forearm.R',(1.03,.02,2.58),(1.14,-.09,2.12),'upper_arm.R');bone('hand.R',(1.14,-.09,2.12),(1.16,-.1,1.88),'forearm.R')
bone('upper_arm.L',(-.61,.025,3.03),(-.99,.05,2.77),'chest');bone('forearm.L',(-.99,.05,2.77),(-1.1,-.02,3.42),'upper_arm.L')
bone('wing.base',wingroot,(1.13,.4,3.63),'chest');bone('wing.tip',(1.13,.4,3.63),(1.93,.32,3.1),'wing.base')
for i in range(5):
 a=tailpoints[min(i*2,7)]; b=tailpoints[min(i*2+2,8)]
 if a==b:b=(b[0],b[1],b[2]+.1)
 bone(f'tail.{i+1:02d}',a,b,'hips' if i==0 else f'tail.{i:02d}')
bone('attack_origin',(-1.1,-.63,3.1),(-1.1,-.92,3.1),'forearm.L')
bpy.ops.object.mode_set(mode='OBJECT');rig.select_set(False)
for ob in parts:
 mod=ob.modifiers.new('Armature deformation','ARMATURE'); mod.object=rig; ob.parent=rig
# smooth core's waist/chest transitions
core=bpy.data.objects.get('TORSO / continuous carbon musculature')
for g in list(core.vertex_groups):core.vertex_groups.remove(g)
for n in ['hips','spine','chest']:core.vertex_groups.new(name=n)
for v in core.data.vertices:
 z=v.co.z
 if z<2.3:
  t=max(0,min(1,(z-2.02)/.28));w={'hips':1-t,'spine':t}
 else:
  t=max(0,min(1,(z-2.46)/.30));w={'spine':1-t,'chest':t}
 for n,wgt in w.items():
  if wgt>0:core.vertex_groups[n].add([v.index],wgt,'REPLACE')

# Each clip is a dedicated action and NLA track with a stable runtime name.
clips={}
def reset_pose():
 for b in rig.pose.bones:b.rotation_mode='XYZ';b.rotation_euler=(0,0,0);b.location=(0,0,0);b.scale=(1,1,1)
def pose_key(frame,rots={},locs={},scales={}):
 reset_pose()
 for n,v in rots.items():rig.pose.bones[n].rotation_euler=tuple(math.radians(x) for x in v)
 for n,v in locs.items():rig.pose.bones[n].location=v
 for n,v in scales.items():rig.pose.bones[n].scale=v
 for b in rig.pose.bones:
  b.keyframe_insert('rotation_euler',frame=frame);b.keyframe_insert('location',frame=frame);b.keyframe_insert('scale',frame=frame)
def action(name,length,keys):
 rig.animation_data_create();act=bpy.data.actions.new(name);rig.animation_data.action=act
 for frame,rs,ls,ss in keys:pose_key(frame,rs,ls,ss)
 track=rig.animation_data.nla_tracks.new();track.name=name
 strip=track.strips.new(name,1,act);strip.action_frame_start=1;strip.action_frame_end=length;track.mute=True
 clips[name]={'frames':length,'duration':(length-1)/30};rig.animation_data.action=None
idle=[(1,{}, {},{}),(31,{'chest':(1.1,0,0),'head':(-1,0,-2),'wing.base':(0,-2,2),'wing.tip':(0,2,1),'tail.02':(1,0,2),'tail.04':(0,0,-3)},{'chest':(0,.018,0)},{}),(61,{}, {},{})]
action('idle',61,idle)
action('summon',91,[(1,{'chest':(12,0,0),'head':(10,0,0),'wing.base':(0,-24,8)},{'root':(0,0,-.2)},{'root':(.02,.02,.02)}),(18,{'chest':(10,0,0),'wing.base':(0,-20,12)},{'root':(0,0,.10)},{'root':(.85,.85,.85)}),(40,{'chest':(-5,0,0),'head':(-4,0,0),'wing.base':(0,9,-8),'wing.tip':(0,5,2)},{'root':(0,0,.06)},{'root':(1.02,1.02,1.02)}),(70,{}, {},{}),(91,{}, {},{})])
action('attack',49,[(1,{}, {},{}),(15,{'chest':(0,-13,-8),'upper_arm.L':(-10,0,-14),'forearm.L':(-9,0,0),'wing.base':(0,-6,6)}, {},{}),(24,{'chest':(7,12,7),'upper_arm.L':(23,3,7),'forearm.L':(12,0,0),'head':(-4,0,0),'wing.base':(0,5,-4)},{'root':(0,0,.025)},{}),(32,{'chest':(5,8,5),'forearm.L':(7,0,0)}, {},{}),(49,{}, {},{})])
action('guard',61,[(1,{}, {},{}),(17,{'chest':(3,-8,0),'upper_arm.R':(-25,8,-18),'forearm.R':(-28,0,0),'wing.base':(0,-8,8),'head':(-4,4,0)}, {},{}),(45,{'chest':(3,-8,0),'upper_arm.R':(-25,8,-18),'forearm.R':(-28,0,0),'wing.base':(0,-8,8),'head':(-4,4,0)}, {},{}),(61,{}, {},{})])
action('hit',25,[(1,{}, {},{}),(7,{'chest':(-12,5,7),'head':(-7,0,3),'wing.base':(0,6,-5),'forearm.R':(15,0,0)}, {},{}),(15,{'chest':(4,0,-3),'head':(2,0,0)}, {},{}),(25,{}, {},{})])
action('defeat',76,[(1,{}, {},{}),(24,{'chest':(12,0,7),'head':(13,0,0),'wing.base':(0,-12,15),'upper_arm.R':(5,0,6)}, {},{}),(48,{'chest':(23,0,7),'head':(15,0,0),'thigh.L':(-25,0,0),'shin.L':(45,0,0),'thigh.R':(-10,0,0),'shin.R':(20,0,0),'wing.base':(0,-22,20)},{'root':(0,-.3,0)},{}),(76,{'chest':(23,0,7),'head':(15,0,0),'thigh.L':(-25,0,0),'shin.L':(45,0,0),'thigh.R':(-10,0,0),'shin.R':(20,0,0),'wing.base':(0,-22,20)},{'root':(0,-.3,0)}, {})])
reset_pose();scene.frame_set(1)
# Named anchor positions for later game FX attachment.
rig['asset_id']='hero_flame_wingman';rig['stage']='visual_design_sample_v001';rig['forward']='-Y';rig['up']='Z';rig['clips']=json.dumps(clips)

# Studio stage and physical lights. Not exported with the character.
def studio_obj(ob,name,material):
 ob.name=name;move_col(ob,setcol);ob.data.materials.append(material)
 for f in ob.data.polygons:f.use_smooth=True
 return ob
pedestalmat=mat('STUDIO | Basalt',(.035,.05,.06),.5,.38)
edge=mat('STUDIO | Brass',(.33,.23,.105),.72,.34)
floor=mat('STUDIO | Backdrop',(.02,.031,.04),.1,.55)
bpy.ops.mesh.primitive_cylinder_add(vertices=128,radius=2.05,depth=.13,location=(0,0,-.025));ped=studio_obj(bpy.context.object,'STUDIO / basalt plinth',pedestalmat)
bev=ped.modifiers.new('Soft edges','BEVEL');bev.width=.035;bev.segments=3
for r in [1.91,2.01]:
 bpy.ops.mesh.primitive_torus_add(major_radius=r,minor_radius=.008,major_segments=128,minor_segments=8,location=(0,0,.045));studio_obj(bpy.context.object,'STUDIO / engraved brass ring',edge)
# Fine radial marks, no decorative UI text attached to model.
for i in range(48):
 a=i*2*pi/48; bpy.ops.mesh.primitive_cube_add(size=1,location=(1.94*cos(a),1.94*sin(a),.047))
 ob=bpy.context.object;ob.scale=(.035 if i%4 else .075,.006,.002);ob.rotation_euler[2]=a;studio_obj(ob,'STUDIO / index %02d'%i,edge)
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.1));studio_obj(bpy.context.object,'STUDIO / floor',floor)
def area(name,pos,power,color,size,target=(0,0,2)):
 d=bpy.data.lights.new(name,'AREA');d.energy=power;d.color=color;d.shape='DISK';d.size=size
 o=bpy.data.objects.new(name,d);setcol.objects.link(o);o.location=pos;o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler()
area('KEY / warm large softbox',(-4,-6,7),1050,(1,.86,.72),5)
area('FILL / cool softbox',(4,-2,5),850,(.65,.83,1),4)
area('RIM / ivory wing',(2,4,6),1500,(.70,.88,1),3)
area('RIM / dragon crimson',(-4,2,4.5),1000,(1,.40,.28),3)
area('TOP / armor highlights',(0,0,8),650,(1,.95,.85),3)
camd=bpy.data.cameras.new('Studio Camera');cam=bpy.data.objects.new('Studio Camera',camd);setcol.objects.link(cam);scene.camera=cam
camd.type='ORTHO';camd.ortho_scale=5.55

def set_camera(pos,target=(.12,0,2.08),scale=5.55):
 cam.location=pos;cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler();camd.ortho_scale=scale
set_camera((6,-12,5.3))
# Save with friendly viewport material preview and model centered.
for screen in bpy.data.screens:
 for a in screen.areas:
  if a.type=='VIEW_3D':
   a.spaces.active.shading.type='MATERIAL';a.spaces.active.region_3d.view_distance=7
   a.spaces.active.region_3d.view_location=(0,0,2)
bpy.ops.object.select_all(action='DESELECT');rig.select_set(True);bpy.context.view_layer.objects.active=rig
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'source','flame-wingman-v001.blend'))
# Runtime copy: join by shared material, keep bones and actions; source stays editable.
bpy.ops.object.select_all(action='DESELECT')
for ob in parts:ob.select_set(True)
rig.select_set(True)
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,'models','flame-wingman-v001.glb'),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='NLA_TRACKS',export_nla_strips=True,export_anim_single_armature=True,export_def_bones=True,export_materials='EXPORT',export_extras=True)
tri=sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in parts)
report={'asset_id':'hero_flame_wingman','stage':'visual design maquette — review before game integration','blender':bpy.app.version_string,'triangles':tri,'mesh_components':len(parts),'bones':len(arm.bones),'materials':len(M),'animations':clips,'source':'source/flame-wingman-v001.blend','runtime':'models/flame-wingman-v001.glb','note':'Geometry and PBR material sample, no baked production atlases or mobile optimization. No live game replacement.'}
open(os.path.join(OUT,'asset-report.json'),'w').write(json.dumps(report,ensure_ascii=False,indent=2))
scene.render.filepath=os.path.join(OUT,'renders','01-three-quarter.png');bpy.ops.render.render(write_still=True)
print('DESIGN_COMPLETE',json.dumps(report))
