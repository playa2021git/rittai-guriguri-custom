const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../classroom/client.js'),'utf8'),html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
assert(html.includes(source.trim()),'standalone HTML must contain the current permission client');
let scripts=[],timers=new Map(),nextTimer=0;
const sandbox={URL,Date,Promise,Error,window:{},document:{createElement(tag){assert.equal(tag,'script');return {remove(){this.removed=true;}};},head:{appendChild(script){scripts.push(script);}}},setTimeout(fn,ms){timers.set(++nextTimer,{fn,ms});return nextTimer;},clearTimeout(id){timers.delete(id);}};
vm.createContext(sandbox);vm.runInContext(source,sandbox);
const read=()=>vm.runInContext('readClassroomPermissions()',sandbox);
(async()=>{
 const result=read(),first=scripts.at(-1),url=new URL(first.src),callback=url.searchParams.get('callback');
 assert.equal(url.hostname,'script.google.com');assert.equal(url.searchParams.get('mode'),'api');assert(/^[A-Za-z_$][A-Za-z0-9_$]{0,63}$/.test(callback));assert.equal(first.referrerPolicy,'no-referrer');
 const data={allowedIds:['lesson-cube-20mm','lesson-1'],revision:1,updatedAt:'2026-11-07T00:00:00Z'};
 sandbox.window[callback](data);assert.equal(await result,data);assert(first.removed);first.onload();
 const failure=read();scripts.at(-1).onerror();await assert.rejects(failure,/failed/);
 const noCallback=read();scripts.at(-1).onload();await assert.rejects(noCallback,/no permission/);
 const timeout=read(),last=scripts.at(-1),lateCallback=new URL(last.src).searchParams.get('callback');
 [...timers.values()].find(timer=>timer.ms===15000).fn();await assert.rejects(timeout,/timed out/);assert(last.removed);sandbox.window[lateCallback](data);
 assert.notEqual(new URL(first.src).searchParams.get('callback'),lateCallback,'each poll gets a distinct callback');
 console.log('PASS: GitHub-to-GAS JSONP client, state delivery, callback uniqueness, network error, malformed response, timeout, late-response cleanup, inline HTML consistency.');
})().catch(error=>{console.error(error);process.exitCode=1;});
