import json,struct,math,sys,hashlib,pathlib

def validate(path):
 b=path.read_bytes();magic,version,total=struct.unpack_from('<4sII',b,0);assert magic==b'glTF' and version==2 and total==len(b)
 n,kind=struct.unpack_from('<II',b,12);j=json.loads(b[20:20+n]);off=20+n;nn,kk=struct.unpack_from('<II',b,off);binary=b[off+8:off+8+nn]
 assert kk==0x004e4942;assert len(j['meshes'])==1;assert len(j['skins'])==1
 assert not any(x.get('uri') for x in j.get('buffers',[]))
 ctypes={5120:('b',1),5121:('B',1),5122:('h',2),5123:('H',2),5125:('I',4),5126:('f',4)};width={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}
 def accessor(idx):
  a=j['accessors'][idx];v=j['bufferViews'][a['bufferView']];typ,size=ctypes[a['componentType']];count=width[a['type']];stride=v.get('byteStride',count*size);start=v.get('byteOffset',0)+a.get('byteOffset',0);fmt='<'+typ*count
  return [struct.unpack_from(fmt,binary,start+i*stride) for i in range(a['count'])]
 for i,a in enumerate(j['accessors']):
  if a['componentType']==5126:assert all(math.isfinite(v) for row in accessor(i) for v in row),(i,'non-finite')
 triangles=0;vertices=0;materials=[]
 for mesh in j['meshes']:
  for p in mesh['primitives']:
   pos=accessor(p['attributes']['POSITION']);ind=accessor(p['indices']);assert max(x[0] for x in ind)<len(pos)
   assert 'JOINTS_0' in p['attributes'] and 'WEIGHTS_0' in p['attributes']
   ws=accessor(p['attributes']['WEIGHTS_0']);assert all(abs(sum(w)-1)<.002 for w in ws)
   triangles+=len(ind)//3;vertices+=len(pos);materials.append(p.get('material'))
 expected={'summon','idle','attack','guard','hit','defeat'};assert {a['name'] for a in j['animations']}==expected
 animations={}
 for a in j['animations']:
  times=[x[0] for s in a['samplers'] for x in accessor(s['input'])];animations[a['name']]=round(max(times)-min(times),3)
  assert len(a['channels'])>0 and animations[a['name']]>0
 return {'file':path.name,'passed':True,'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest(),'runtime_meshes':len(j['meshes']),'material_groups':len(materials),'triangles':triangles,'exported_vertices':vertices,'skin_joints':len(j['skins'][0]['joints']),'clips_seconds':animations,'checks':['self-contained GLB 2.0','finite geometry and animation accessors','triangle indices in bounds','normalized vertex skin weights','six named non-empty animation clips','one shared skinned mesh']}
for raw in sys.argv[1:]:
 path=pathlib.Path(raw);r=validate(path);(path.parent.parent/'validation.json').write_text(json.dumps(r,ensure_ascii=False,indent=2));print(json.dumps(r,ensure_ascii=False))
