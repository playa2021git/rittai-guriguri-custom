from pathlib import Path
import json,re,math,itertools,collections
p=Path(__file__).resolve().parent.parent/'index.html';html=p.read_text(encoding='utf-8');match=re.search(r'const LESSON_LIBRARY=(.*?);\n',html);items=json.loads(match[1])
def sub(a,b):return tuple(x-y for x,y in zip(a,b))
def dot(a,b):return sum(x*y for x,y in zip(a,b))
def cross(a,b):return (a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0])
def norm(a):
 d=math.sqrt(dot(a,a));return tuple(x/d for x in a) if d>1e-9 else None
def on_segment(p,a,b):
 ab=sub(b,a);ap=sub(p,a);return dot(cross(ab,ap),cross(ab,ap))<1e-9 and -1e-7<=dot(ap,ab)<=dot(ab,ab)+1e-7

def surface_from_edges(rows):
 points=sorted(set(tuple(row[:3]) for row in rows)|set(tuple(row[3:]) for row in rows));edges=set()
 for row in rows:
  a,b=tuple(row[:3]),tuple(row[3:]);ab=sub(b,a)
  indices=sorted([i for i,q in enumerate(points) if on_segment(q,a,b)],key=lambda i:dot(sub(points[i],a),ab))
  edges.update(tuple(sorted(pair)) for pair in zip(indices,indices[1:]))
 adj=collections.defaultdict(set)
 for a,b in edges:adj[a].add(b);adj[b].add(a)
 planes={}
 for a,neighbors in adj.items():
  for b,c in itertools.combinations(neighbors,2):
   n=norm(cross(sub(points[b],points[a]),sub(points[c],points[a])))
   if n is None:continue
   if next(x for x in n if abs(x)>1e-7)<0:n=tuple(-x for x in n)
   d=dot(n,points[a]);key=tuple(round(x,6) for x in (*n,d));planes[key]=(n,d)
 triangles=[]
 for n,d in planes.values():
  planar=[(a,b) for a,b in edges if abs(dot(n,points[a])-d)<1e-5 and abs(dot(n,points[b])-d)<1e-5]
  if len(planar)<3:continue
  u=norm(sub(points[planar[0][1]],points[planar[0][0]]));v=cross(n,u)
  xy={i:(dot(q,u),dot(q,v)) for i,q in enumerate(points)}
  neighbors=collections.defaultdict(list)
  for a,b in planar:neighbors[a].append(b);neighbors[b].append(a)
  for a,ns in neighbors.items():ns.sort(key=lambda b:math.atan2(xy[b][1]-xy[a][1],xy[b][0]-xy[a][0]))
  visited=set()
  for a,b in [(a,b) for a,b in planar]+[(b,a) for a,b in planar]:
   if (a,b) in visited:continue
   cycle=[];start=(a,b)
   while (a,b) not in visited:
    visited.add((a,b));cycle.append(a);ns=neighbors[b];a,b=b,ns[(ns.index(a)-1)%len(ns)]
   if (a,b)!=start or len(cycle)<3:continue
   area=sum(xy[a][0]*xy[b][1]-xy[b][0]*xy[a][1] for a,b in zip(cycle,cycle[1:]+cycle[:1]))/2
   if area<=1e-7:continue
   def turn(a,b,c):return (xy[b][0]-xy[a][0])*(xy[c][1]-xy[a][1])-(xy[b][1]-xy[a][1])*(xy[c][0]-xy[a][0])
   # Remove collinear points before ear clipping the concave boundary.
   changed=True
   while changed and len(cycle)>3:
    changed=False
    for i in range(len(cycle)):
     if abs(turn(cycle[i-1],cycle[i],cycle[(i+1)%len(cycle)]))<1e-7:cycle.pop(i);changed=True;break
   while len(cycle)>3:
    found=False
    for i,b in enumerate(cycle):
     a,c=cycle[i-1],cycle[(i+1)%len(cycle)]
     if turn(a,b,c)<=1e-7:continue
     if any(turn(a,b,q)>=-1e-7 and turn(b,c,q)>=-1e-7 and turn(c,a,q)>=-1e-7 for q in cycle if q not in [a,b,c]):continue
     triangles.append([points[a],points[b],points[c]]);cycle.pop(i);found=True;break
    if not found:raise ValueError('Cannot triangulate face')
   triangles.append([points[i] for i in cycle])
 # A closed outer mesh must have exactly two faces on each split triangle edge.
 counts=collections.Counter()
 meshpoints=set(q for t in triangles for q in t)
 for t in triangles:
  for a,b in zip(t,t[1:]+t[:1]):
   ab=sub(b,a);ps=sorted([q for q in meshpoints if on_segment(q,a,b)],key=lambda q:dot(sub(q,a),ab))
   counts.update(tuple(sorted(pair)) for pair in zip(ps,ps[1:]))
 bad={k:v for k,v in counts.items() if v!=2}
 return triangles,bad

for item in items:
 rows=[[float(n) for n in line.split()] for line in item['text'].splitlines()[1:] if line.strip()]
 triangles,bad=surface_from_edges(rows)
 print(item['id'],'triangles',len(triangles),'nonmanifold segments',len(bad))
 if bad:print('bad',list(bad.items())[:4])
 item['faces']=triangles
assert all(surface_from_edges([[float(n) for n in line.split()] for line in it['text'].splitlines()[1:] if line.strip()])[1]=={} for it in items),'Surface validation failed'
html=html[:match.start(1)]+json.dumps(items,ensure_ascii=False)+html[match.end(1):];p.write_bytes(html.encode())
