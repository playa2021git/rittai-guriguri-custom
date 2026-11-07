// Shared classroom permissions. Read-only endpoint; no write credential is shipped.
var classroomAllowedIds=['lesson-cube-20mm'],classroomRevision=-1,classroomPollTimer=null;
const CLASSROOM_STATE_URL='https://guriguri-classroom-state.terakadobutyo.chatgpt.site/api/state';
const CLASSROOM_TEACHER_URL='https://guriguri-teacher-control.terakadobutyo.chatgpt.site/';
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
async function syncClassroomPermissions(){
 clearTimeout(classroomPollTimer);
 try{
  const response=await fetch(CLASSROOM_STATE_URL,{cache:'no-store',credentials:'omit',signal:AbortSignal.timeout(4000)});
  if(!response.ok)throw Error('classroom unavailable');applyClassroomState(await response.json());
 }catch{
  applyClassroomState({allowedIds:['lesson-cube-20mm'],revision:0});
  $('classroomStatus').textContent='許可設定を確認できません。立方体で練習できます。接続を再確認しています。';
 }finally{classroomPollTimer=setTimeout(syncClassroomPermissions,5000);}
}
function setupClassroomAccess(){syncClassroomPermissions();}
