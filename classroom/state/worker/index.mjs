export const ORDER=['lesson-cube-20mm','lesson-7','lesson-5','lesson-6','lesson-3','lesson-4','lesson-1','lesson-2','lesson-dengon-1','__free__'];
const CUBE=ORDER[0],ORIGIN='https://playa2021git.github.io';
export function normalize(ids){if(!Array.isArray(ids)||ids.some(id=>!ORDER.includes(id)))throw Error('invalid lessons');return ORDER.filter(id=>id===CUBE||ids.includes(id));}
export default {async fetch(request,env){
 const url=new URL(request.url);
 const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Access-Control-Allow-Origin':ORIGIN,'Vary':'Origin','Access-Control-Allow-Methods':'GET, PUT, OPTIONS','Access-Control-Allow-Headers':'Authorization, Content-Type','X-Content-Type-Options':'nosniff'};
 const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers});
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(url.pathname!=='/api/state')return json({service:'立体グリグリ 授業用共有設定'});
 if(!env.DB)return json({error:'共有設定を準備中です'},503);
 try{
  if(request.method==='GET'){
   const row=await env.DB.prepare('SELECT allowed_json, revision, updated_at FROM classroom_state WHERE id = ?').bind('global').first();
   return json(row?{allowedIds:normalize(JSON.parse(row.allowed_json)),revision:row.revision,updatedAt:row.updated_at}:{allowedIds:[CUBE],revision:0,updatedAt:null});
  }
  if(request.method!=='PUT')return json({error:'method not allowed'},405);
  if(!env.CLASSROOM_WRITE_SECRET||request.headers.get('Authorization')!=='Bearer '+env.CLASSROOM_WRITE_SECRET)return json({error:'権限がありません'},401);
  if(Number(request.headers.get('Content-Length')||0)>4096)return json({error:'入力が大きすぎます'},413);
  const text=await request.text();if(text.length>4096)return json({error:'入力が大きすぎます'},413);
  let input,allowedIds;try{input=JSON.parse(text);allowedIds=normalize(input.allowedIds);}catch{return json({error:'立体の指定を確認してください'},400);}
  if(!Number.isSafeInteger(input.revision)||input.revision<0)return json({error:'設定を再読み込みしてください'},400);
  const updatedAt=new Date().toISOString();
  const results=await env.DB.batch([
   env.DB.prepare('INSERT OR IGNORE INTO classroom_state (id, allowed_json, revision, updated_at) VALUES (?, ?, 0, ?)').bind('global',JSON.stringify([CUBE]),updatedAt),
   env.DB.prepare('UPDATE classroom_state SET allowed_json = ?, revision = revision + 1, updated_at = ? WHERE id = ? AND revision = ? RETURNING revision').bind(JSON.stringify(allowedIds),updatedAt,'global',input.revision)
  ]);
  const revision=results[1].results?.[0]?.revision;
  return revision==null?json({error:'別の画面で設定が更新されました。読み込み直してください'},409):json({allowedIds,revision,updatedAt});
 }catch{return json({error:'共有設定へ接続できませんでした'},503);}
}};
