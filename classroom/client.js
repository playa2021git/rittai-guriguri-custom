// Shared classroom permissions. Read-only endpoint; no write credential is shipped.
var classroomAllowedIds=['lesson-cube-20mm'],classroomRevision=-1,classroomPollTimer=null,classroomJsonpSequence=0;
const CLASSROOM_STATE_URL='https://script.google.com/macros/s/AKfycbypD7kOXb_9Tjyz2IdFuuVJZ9Eh9_Kyx3Hfg2548gNg-D0a7ZfWE-ueRlO2RW-kyngWbg/exec?mode=api';
const CLASSROOM_TEACHER_URL='https://script.google.com/macros/s/AKfycbypD7kOXb_9Tjyz2IdFuuVJZ9Eh9_Kyx3Hfg2548gNg-D0a7ZfWE-ueRlO2RW-kyngWbg/exec?mode=teacher';
function classroomCanChoose(id){return classroomAllowedIds.includes(id);}
function classroomCanUseFreePractice(){return classroomCanChoose('__free__');}
function refreshClassroomChoices(){
 const select=$('lessonSelect');select.innerHTML='';
 for(const item of LESSON_LIBRARY){
  if(!classroomCanChoose(item.id))continue;
  const option=document.createElement('option');option.value=item.id;
  option.textContent=item.name.replace(/^2022/,'')+(item.mode==='ortho'?'【三面図のみ】':item.mode==='open'?'【等角図で開始・4面切替可】':'【等角図のみ】');select.appendChild(option);
 }
 if(classroomCanUseFreePractice()){const option=document.createElement('option');option.value='';option.textContent='自由練習（別の立体に切り替え）';select.appendChild(option);}
 select.value=activeLesson?activeLesson.id:'';
}
function updateClassroomTeacherLink(){
 const link=$('classroomTeacherLink');if(link)link.style.display=lessonTeacherUnlocked?'block':'none';
}
function applyClassroomState(data){
 const validIds=LESSON_LIBRARY.map(item=>item.id).concat('__free__');
 if(!data||!Array.isArray(data.allowedIds)||data.allowedIds.some(id=>!validIds.includes(id))||!Number.isSafeInteger(data.revision)||data.revision<0)throw Error('invalid classroom state');
 const next=validIds.filter(id=>id==='lesson-cube-20mm'||data.allowedIds.includes(id));
 const changed=next.join(',')!==classroomAllowedIds.join(',');classroomAllowedIds=next;classroomRevision=data.revision;
 if(changed){
  refreshClassroomChoices();
  if(!classroomCanChoose(activeLesson?activeLesson.id:'__free__'))selectLesson(LESSON_LIBRARY.find(item=>item.id==='lesson-cube-20mm'));
  else updateLessonControls();
 }
 updateLessonControls();
 $('classroomStatus').textContent='先生が許可した立体：'+classroomAllowedIds.filter(id=>id!=='__free__').length+'個'+(classroomCanUseFreePractice()?' ／ 自由練習も使えます':'');
}
function readClassroomPermissions(){
 return new Promise((resolve,reject)=>{
  const callback='guriguriPermissions_'+Date.now().toString(36)+'_'+(++classroomJsonpSequence).toString(36);
  const script=document.createElement('script');let finished=false,timer;
  function finish(error,data){
   if(finished)return;finished=true;clearTimeout(timer);script.remove();
   // A slow response must not call a deleted callback after a timeout.
   window[callback]=()=>{};setTimeout(()=>{delete window[callback];},60000);
   if(error)reject(error);else resolve(data);
  }
  window[callback]=data=>finish(null,data);
  script.onerror=()=>finish(new Error('GAS permission read failed'));
  script.onload=()=>{if(!finished)finish(new Error('GAS returned no permission data'));};
  script.referrerPolicy='no-referrer';
  const url=new URL(CLASSROOM_STATE_URL);url.searchParams.set('callback',callback);url.searchParams.set('_',Date.now());script.src=url.href;
  timer=setTimeout(()=>finish(new Error('GAS permission read timed out')),15000);
  document.head.appendChild(script);
 });
}
async function syncClassroomPermissions(){
 clearTimeout(classroomPollTimer);
 try{
  applyClassroomState(await readClassroomPermissions());
 }catch{
  applyClassroomState({allowedIds:['lesson-cube-20mm'],revision:0});
  $('classroomStatus').textContent='許可設定を確認できません。立方体で練習できます。接続を再確認しています。';
 }finally{classroomPollTimer=setTimeout(syncClassroomPermissions,5000);}
}
function setupClassroomAccess(){syncClassroomPermissions();}
