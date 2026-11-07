// Read deployment-test credentials via hidden stdin only. Never write them to disk.
import assert from 'node:assert/strict';
if(process.stdin.isTTY)process.stdin.setRawMode(true);
console.log('Ready for live test JSON on stdin (input is hidden).');
let buffer='';const input=await new Promise(resolve=>{process.stdin.setEncoding('utf8');const read=chunk=>{buffer+=chunk;if(buffer.includes('\u0003'))process.exit(130);if(/[\r\n]/.test(buffer)){process.stdin.off('data',read);process.stdin.pause();resolve(JSON.parse(buffer.trim()));}};process.stdin.on('data',read);});
const state='https://guriguri-classroom-state.terakadobutyo.chatgpt.site/api/state';
async function call(url,method='GET',body,headers={}){const r=await fetch(url,{method,headers:{'User-Agent':'Mozilla/5.0','Content-Type':'application/json',...headers},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(15000)});const data=await r.json();return {status:r.status,data};}
let original,revision,changed=false;
try{
 const initial=await call(state);assert.equal(initial.status,200);original=initial.data.allowedIds;revision=initial.data.revision;
 const denied=await call(state,'PUT',{allowedIds:['lesson-cube-20mm'],revision});assert.equal(denied.status,401);
 const teacherUrl='https://guriguri-teacher-control.terakadobutyo.chatgpt.site/api/state';
 const target=input.teacherToken?teacherUrl:state;
 const headers=input.teacherToken?{'OAI-Sites-Authorization':'Bearer '+input.teacherToken}:{Authorization:'Bearer '+input.writeSecret};
 const grant=await call(target,'PUT',{allowedIds:['lesson-cube-20mm','lesson-6'],revision},headers);
 assert.equal(grant.status,200);revision=grant.data.revision;changed=true;
 const student=await call(state);assert.deepEqual(student.data.allowedIds,['lesson-cube-20mm','lesson-6']);
 console.log('PASS: anonymous read, anonymous write rejected, teacher grant, independent student sees allowed model.');
 const reset=await call(target,'PUT',{allowedIds:original,revision},headers);assert.equal(reset.status,200);changed=false;
 const restored=await call(state);assert.deepEqual(restored.data.allowedIds,original);
 console.log('PASS: restored initial permissions after live test.');
}finally{
 if(changed){const reset=await call(state,'PUT',{allowedIds:original,revision},{Authorization:'Bearer '+input.writeSecret});if(reset.status!==200)console.error('Permission reset needs review.');}
 if(process.stdin.isTTY)process.stdin.setRawMode(false);
}
