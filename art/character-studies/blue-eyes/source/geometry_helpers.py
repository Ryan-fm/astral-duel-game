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
 previous_a=None
 for i,p in enumerate(pts):
  u=i/(len(pts)-1)*(len(radii)-1); j=min(int(u),len(radii)-2); t=u-j; rad=radii[j]*(1-t)+radii[j+1]*t
  tang=(pts[min(i+1,len(pts)-1)]-pts[max(i-1,0)]).normalized()
  # Parallel-transport the section frame. Switching reference axes mid-curve
  # used to twist adjacent rings and leave wrinkles on wrists and talons.
  if previous_a is None:
   ref=Vector((0,-1,0))
   if abs(tang.dot(ref))>.95:ref=Vector((1,0,0))
   a=tang.cross(ref).normalized()
  else:a=(previous_a-tang*previous_a.dot(tang)).normalized()
  b=tang.cross(a).normalized();previous_a=a.copy()
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

