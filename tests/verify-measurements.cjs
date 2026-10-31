const fs=require('fs'),vm=require('vm'),assert=require('assert');
const path=require('path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
let labels=[],strokes=0;
const windowEvents=[];
const ctx=new Proxy({getImageData:(x,y,w,h)=>({data:new Uint8ClampedArray(w*h*4)}),measureText:t=>({width:t.length*7}),fillText:t=>labels.push(t),stroke:()=>strokes++},{get:(o,k)=>o[k]||(()=>{})});
const els=new Map();function el(id){if(!els.has(id))els.set(id,{style:{},classList:{add(){},remove(){},toggle(){},contains(){return false}},addEventListener(type,fn){(this.events??={})[type]=fn;},getContext:()=>ctx,getBoundingClientRect:()=>({x:0,y:0,left:0,top:0,width:1046,height:800}),querySelectorAll:()=>[],appendChild(){},setAttribute(){},focus(){},value:'',textContent:'',width:1046,height:800});return els.get(id);}
const sandbox={console,TextDecoder,TextEncoder,Uint8Array,ArrayBuffer,DataView,Map,Set,Math,Date,Number,Blob,URL,performance:{now:()=>0},requestAnimationFrame(){},setTimeout(){},clearTimeout(){},navigator:{userAgent:'Chrome'},localStorage:{getItem(){return null},setItem(){}},document:{getElementById:el,documentElement:{outerHTML:html},body:el('body'),querySelector:()=>null,querySelectorAll:()=>[],addEventListener(){},createElement:()=>el('new')},window:{devicePixelRatio:1,addEventListener(type,fn,capture){windowEvents.push({type,fn,capture});},matchMedia:()=>({matches:false})}};
for(const m of html.matchAll(/id="([^"]+)"/g))sandbox[m[1]]=el(m[1]);
vm.createContext(sandbox);
for(const script of scripts)vm.runInContext(script.replace(/^init\(\);$/m,''),sandbox);
function run(code){return vm.runInContext(code,sandbox);}
run("setupLearningControls();model=parseGri(createSampleGri());learningDimensionMode='both';");
assert.equal(run("learningFormat(30)"),'30');
assert.equal(run("learningLevels('x',learningBounds()).join(',')"),'0,40,80');
for(const mode of ['none','ortho','iso','both'])for(const view of ['front','right','top','iso']){
 labels=[];strokes=0;run(`learningDimensionMode='${mode}';drawLearningDimensions(viewBasis(views.${view}[1],views.${view}[2]),60,250,200,views.${view}[1],views.${view}[2],false)`);
 const expected=mode==='both'||mode==='ortho'&&view!=='iso'||mode==='iso'&&view==='iso';assert.equal(labels.length>0,expected,`${mode}/${view}`);
 if(expected)assert(labels.includes('80')||labels.includes('40'));
}
run("learningDimensionMode='both';draw();drawPngExport();runSelfTests();");
assert.equal(el('testStatus').textContent,'自己テスト：15/15件成功');
labels=[];strokes=0;run("learningGridEnabled=true;drawLearningGrid(viewBasis(0,0),80,250,200,false)");assert.equal(strokes,34,'5mm grid on 80 x 80 front face');
strokes=0;run("learningGridEnabled=false;drawLearningGrid(viewBasis(0,0),80,250,200,false)");assert.equal(strokes,0,'grid off');
run("learningGridEnabled=true;model=parseGri('4 0 0 0\\n0 0 0 50 0 0\\n50 0 0 50 20 0\\n50 20 0 30 20 0\\n30 20 0 30 30 0');learningDimensionMode='both';");
labels=[];run("drawLearningDimensions(viewBasis(0,0),80,250,200,0,0,false)");assert(labels.includes('30')&&labels.includes('20')&&labels.includes('50'),'30 + 20 = 50 mm step');
run("model.surfaceEdgeCache={solid:model.edges};model.edges=[];model.triangles=[{}];");
assert.equal(run("learningLevels('x',learningBounds()).join(',')"),'0,30,50','STL crease dimensions');
for(const zoomValue of [.5,1,3]){labels=[];run(`drawLearningDimensions(viewBasis(0,0),${100*zoomValue},250,200,0,0,false)`);assert(labels.includes('50'),'zoom must preserve mm values');}
run(`model=parseStlSurface(new TextEncoder().encode('solid test\\nfacet normal 0 0 1\\nouter loop\\nvertex 0 0 0\\nvertex 30 0 0\\nvertex 30 20 0\\nendloop\\nendfacet\\nendsolid test').buffer,'test.stl')`);
assert.equal(run("model.max.x-model.min.x"),30,'STL raw millimetres');
assert(run("learningLevels('x',learningBounds()).includes(30)"),'STL dimensions from parsed crease cache');
console.log('PASS: 16 dimension visibility combinations, raw mm levels, drawing, PNG rendering, existing self-tests.');
console.log('Existing self-tests:',el('testStatus').textContent);

// Classroom visibility must hold at the renderer, export, and input boundaries.
run("setupLessonControls();");
assert.equal(run('LESSON_LIBRARY.length'),10);
for(let i=0;i<8;i++){
 run(`selectLesson(LESSON_LIBRARY[${i}]);`);
 assert.equal(run('lessonIsRestricted()'),run("activeLesson.mode!=='open'"));
 assert.equal(run('model.actualEdgeCount'),run('Number(LESSON_LIBRARY['+i+'].text.split(/\\s+/)[0])'));
 assert.equal(el('saveGriButton').disabled,run("activeLesson.mode!=='open'"));
 const source=fs.readFileSync(path.join(__dirname,'..','lessons',run('activeLesson.name')+'.gri'),'utf8');
 const sourceLines=source.split(/\r?\n/).filter(line=>line.trim());
 const sourcePoints=sourceLines.slice(1).map(line=>line.trim().split(/\s+/).map(Number)).filter(row=>row.length===6&&row.every(Number.isFinite));
 assert.equal(run('model.actualEdgeCount'),sourcePoints.length,'preserve every source edge');
 for(let axis=0;axis<3;axis++){
   const coords=sourcePoints.flatMap(edge=>[edge[axis],edge[axis+3]]),key=['x','y','z'][axis];
   assert.equal(run(`model.min.${key}`),Math.min(...coords));assert.equal(run(`model.max.${key}`),Math.max(...coords));
 }
 assert.equal(run('canToggleHiddenLines()'),true,'every added GRI supports hidden lines');
 assert.equal(run('model.griSurface'),true);
 assert.equal(run('showStlSurface'),true,'each lesson starts with colored faces');
 assert(run('model.triangles.length>0'));
 assert.equal(el('hiddenLineToggleBottom').style.display,'block');
 run('toggleHiddenLines();');assert.equal(run('showHiddenLines'),true);run('toggleHiddenLines();');assert.equal(run('showHiddenLines'),false);
 const mode=run('activeLesson.mode');
 if(mode==='open'){
   assert.equal(run('four'),false,'start with isometric only');
   assert.equal(run('lon'),Math.PI/4);
   run('toggleViewMode();');assert.equal(run('four'),true,'allow four views');
   assert.equal(run('canToggleHiddenLines()'),true);
   assert.equal(el('hiddenLineToggleBottom').style.display,'block');
   run('toggleHiddenLines();');assert.equal(run('showHiddenLines'),true);
   assert.equal(el('hiddenLineToggleBottom').textContent,'かくれ線を表示しない');
   run('toggleHiddenLines();');assert.equal(run('showHiddenLines'),false);
   run('draw();drawPngExport();');
   const visibility=run(`(()=>{
     const basis=viewBasis(Math.PI/4,ISO_LAT),zState=renderSurfaceTrianglesWithZBuffer(basis,60,200,200,true);
     let hidden=0,visible=0;
     for(const edge of model.edges){
       const pa=proj(edge.a,basis,60,200,200),pb=proj(edge.b,basis,60,200,200);
       const runs=getSurfaceEdgeVisibilityRuns(edge.a,edge.b,pa,pb,basis,zState,true);
       hidden+=runs.hidden.length;visible+=runs.visible.length;
       if(getSurfaceEdgeVisibilityRuns(edge.a,edge.b,pa,pb,basis,zState,false).hidden.length)throw Error('hidden runs leaked');
     }
     return {hidden,visible};
   })()`);
   assert(visibility.hidden>0&&visibility.visible>0,'classify actual cube/ramp hidden and visible edges');
   const sizes=run('activeLesson.id')==='lesson-cube-20mm'?[20,20,20]:run('activeLesson.id')==='lesson-6'?[30,20,10]:run('activeLesson.id')==='lesson-5'?[20,20,20]:[30,20,20];
   for(const [i,axis] of ['x','y','z'].entries())assert.equal(run(`model.max.${axis}-model.min.${axis}`),sizes[i]);
   run('selectLesson(activeLesson);');assert.equal(run('four'),false);
   continue;
 }

 for(const view of ['front','top','right','iso'])assert.equal(run(`lessonViewAllowed(views.${view}[1],views.${view}[2])`),mode==='ortho'?view!=='iso':view==='iso');
 labels=[];run('draw();');assert.equal(labels.includes('等角図'),mode==='iso');assert.equal(labels.includes('正面図'),mode==='ortho');
 // Direct calls cannot render the answer view either.
 strokes=0;run(`drawView(views.${mode==='ortho'?'iso':'front'}[1],views.${mode==='ortho'?'iso':'front'}[2],{x:0,y:0,w:100,h:100},null,false);`);assert.equal(strokes,0);
 strokes=0;run(`drawPngExportView(views.${mode==='ortho'?'iso':'front'}[1],views.${mode==='ortho'?'iso':'front'}[2],{x:0,y:0,w:100,h:100});`);assert.equal(strokes,0,'direct PNG rendering must also reject the answer view');
 const before=run('currentGriText');run("loadGri(createSampleGri(),'bypass.gri');toggleViewMode();moveTo(views.front);requestEnterDrawingMode();");assert.equal(run('currentGriText'),before);assert.equal(run('inverted'),true);
 const originalExport=run('drawPngExportView');let exported=[];
 sandbox.recordExport=(lo,la)=>exported.push([lo,la]);run('drawPngExportView=recordExport;drawPngExport();');
 assert.equal(exported.length,mode==='ortho'?3:1);for(const [lo,la] of exported)assert(run(`lessonViewAllowed(${lo},${la})`));sandbox.restoreExport=originalExport;run('drawPngExportView=restoreExport;');
 run('toggleLessonTeacher();');assert.equal(run('lessonIsRestricted()'),false);assert.equal(run('four'),true);
 run('selectLesson(activeLesson);');assert.equal(run('lessonTeacherUnlocked'),false);
}
run("selectLesson(LESSON_LIBRARY.find(item=>item.id==='lesson-1'));");
const capture=windowEvents.find(e=>e.type==='keydown'&&e.capture===true).fn;
let prevented=0;const event={ctrlKey:true,altKey:false,shiftKey:false,code:'KeyT',key:'T',preventDefault(){prevented++;},stopImmediatePropagation(){},target:{tagName:'SELECT'}};
capture({...event,altKey:true,shiftKey:true});assert.equal(run('lessonTeacherUnlocked'),false,'retire the old shortcut');
capture(event);assert.equal(run('lessonTeacherUnlocked'),true);capture({...event,repeat:true});assert.equal(run('lessonTeacherUnlocked'),true);capture(event);assert.equal(run('lessonIsRestricted()'),true);assert.equal(prevented,2);
el('lessonHeading').events.dblclick({preventDefault(){}});assert.equal(run('lessonTeacherUnlocked'),true,'teacher heading double click fallback');el('lessonHeading').events.dblclick({preventDefault(){}});assert.equal(run('lessonIsRestricted()'),true);
run("toggleLessonTeacher();loadGri(createSampleGri(),'teacher-change.gri',{preserveView:true});toggleLessonTeacher();");assert.equal(run('currentGriFileName'),run("activeLesson.name+'.gri'"),'re-lock restores the selected problem');
run('selectLesson(null);');assert.equal(run('lessonIsRestricted()'),false);assert.equal(run('currentGriFileName'),'自由練習.gri');
console.log('PASS: all 8 lessons, restricted render/export, view/edit bypass guards, teacher shortcut, repeat suppression, automatic re-lock, separate free-practice model.');

run("selectLesson(LESSON_LIBRARY.find(item=>item.id==='lesson-cube-20mm'));");
assert.equal(run('model.actualEdgeCount'),12);
for(const axis of ['x','y','z'])assert.equal(run(`model.max.${axis}-model.min.${axis}`),20);
assert(run('model.edges.every(edge=>Math.abs(len(sub(edge.a,edge.b))/model.scale-20)<1e-9)'),'all 12 cube edges must measure 20mm');
console.log('PASS: cube spans and all 12 edges are 20mm.');

function meshContains(faces,p){
 const sub=(a,b)=>a.map((x,i)=>x-b[i]),dot=(a,b)=>a.reduce((sum,x,i)=>sum+x*b[i],0),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],dir=[1,.173,.319],hits=[];
 for(const [a,b,c] of faces){
   const e1=sub(b,a),e2=sub(c,a),h=cross(dir,e2),det=dot(e1,h);if(Math.abs(det)<1e-8)continue;
   const inv=1/det,s=sub(p,a),u=inv*dot(s,h);if(u<0||u>1)continue;
   const q=cross(s,e1),v=inv*dot(dir,q);if(v<0||u+v>1)continue;
   const t=inv*dot(e2,q);if(t>1e-8&&!hits.some(old=>Math.abs(old-t)<1e-7))hits.push(t);
 }
 return hits.length%2===1;
}
const base=run("LESSON_LIBRARY.find(item=>item.id==='lesson-5').faces"),notch=run("LESSON_LIBRARY.find(item=>item.id==='lesson-6').faces");
assert(meshContains(base,[15,5,15]),'20mm base, 10mm high');assert(meshContains(base,[5,15,5]),'10mm cube above base');
assert(!meshContains(base,[15,15,5])&&!meshContains(base,[5,15,15]),'upper cube must be only 10 x 10mm');
assert(meshContains(notch,[5,15,5])&&meshContains(notch,[25,15,5])&&meshContains(notch,[15,5,5]),'U sides and bottom remain solid');
assert(!meshContains(notch,[15,15,5]),'10 x 10mm notch remains open through 10mm depth');
run('selectLesson(null);loadGri(LESSON_LIBRARY[0].text,"standalone.gri",{preserveView:true});');assert.equal(run('canToggleHiddenLines()'),true,'standalone copy of added GRI also retains hidden-line support');
console.log('PASS: 20mm base + 10mm cube, 30 x 20 x 10mm concave model with a 10mm open notch, standalone GRI surface matching.');

run("selectLesson(LESSON_LIBRARY.find(item=>item.id==='lesson-cube-20mm'));toggleDrawingMode();");assert.equal(run('inverted'),false);assert.equal(run('model.triangles.length'),0,'drawing mode keeps editable wireframe');
run('toggleDrawingMode();');assert.equal(run('model.griSurface'),true,'registered surfaces restored after editing view');

run("selectLesson(LESSON_LIBRARY.find(item=>item.id==='lesson-2'));");
for(const [axis,size] of [['x',60],['y',40],['z',40]])assert.equal(run(`model.max.${axis}-model.min.${axis}`),size);
assert.equal(run("learningLevels('x',learningBounds()).join(',')"),'0,20,40,60');
assert.equal(run("learningLevels('y',learningBounds()).join(',')"),'0,20,40');
assert.equal(run('lessonIsRestricted()'),true);
console.log('PASS: orthographic-to-isometric problem 2 is 60 x 40 x 40mm with 20mm steps.');

run("selectLesson(LESSON_LIBRARY.find(item=>item.id==='lesson-1'));");
for(const axis of ['x','y','z'])assert.equal(run(`model.max.${axis}-model.min.${axis}`),40);
run('toggleStlSurface();');assert.equal(run('showStlSurface'),false);
run('selectLesson(LESSON_LIBRARY[1]);');assert.equal(run('showStlSurface'),true,'new selection restores initial face colors');
console.log('PASS: problem 1 maximum is 40mm; problem 2 maximum is 60mm; all 8 lessons start with colored faces.');

assert.equal(run('LESSON_LIBRARY.map(item=>item.id).join(",")'),'lesson-cube-20mm,lesson-7,lesson-5,lesson-6,lesson-3,lesson-4,lesson-1,lesson-2,lesson-cone-hemisphere,lesson-nested-frames');
run('selectLesson(LESSON_LIBRARY[0]);');assert.equal(run('activeLesson.id'),'lesson-cube-20mm');assert.equal(run('four'),false);assert.equal(run('showStlSurface'),true);assert.equal(el('lessonSelect').value,'lesson-cube-20mm');
console.log('PASS: teaching order and initial 20mm cube selection.');

run("selectLesson(LESSON_LIBRARY.find(item=>item.id==='lesson-4'));");
for(const [axis,size] of [['x',35],['y',20],['z',20]])assert.equal(run(`model.max.${axis}-model.min.${axis}`),size);
assert.equal(run("learningLevels('x',learningBounds()).join(',')"),'0,10,15,35');
assert.equal(run("learningLevels('y',learningBounds()).join(',')"),'0,10,20');
assert.equal(run("learningLevels('z',learningBounds()).join(',')"),'0,10,20');
assert(run("model.triangles.length>0 && model.griSurface"));
console.log('PASS: isometric-to-orthographic problem 2 is 35 x 20 x 20mm with a 10mm front cube.');

run("selectLesson(LESSON_LIBRARY.find(item=>item.id==='lesson-3'));");
for(const [axis,size] of [['x',30],['y',20],['z',15]])assert.equal(run(`model.max.${axis}-model.min.${axis}`),size);
assert.equal(run("learningLevels('x',learningBounds()).join(',')"),'0,5,15,25,30');
assert.equal(run("learningLevels('y',learningBounds()).join(',')"),'0,10,20');
console.log('PASS: isometric-to-orthographic problem 1 is 30 x 20 x 15mm, 5mm rails and 10mm valley drop.');


run("selectLesson(LESSON_LIBRARY.find(item=>item.id==='lesson-cone-hemisphere'));");
for(const [axis,size] of [['x',140],['y',170],['z',140]])assert.equal(run(`model.max.${axis}-model.min.${axis}`),size);
assert.equal(run('lessonIsRestricted()'),false);
assert(run('model.surfaceEdgeCache.smooth.length>0'),'curved silhouettes enabled');
assert(run('model.surfaceEdgeCache.solid.length>0'),'circular rims retained');
assert(run('model.triangles.length===4992'));
run('draw();drawPngExport();toggleViewMode();draw();');
assert.equal(run('four'),true);
console.log('PASS: cone and hemisphere dimensions, curved silhouettes, rendering/export and four views.');

run("selectLesson(LESSON_LIBRARY.find(item=>item.id==='lesson-nested-frames'));");
assert.equal(run('model.max.x-model.min.x'),100);
assert.equal(run('model.max.z-model.min.z'),50);
assert(run('model.triangles.length>0 && model.griSurface'));
run('draw();drawPngExport();toggleViewMode();draw();');
assert.equal(run('four'),true);
console.log('PASS: nested frames lesson, 100mm base, rendering/export and four views.');
