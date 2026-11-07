/** 立体グリグリ GAS許可設定。コード.gsへ全文貼り付け。外部API・課金設定不要。 */
const LESSONS_ = [
  ['lesson-cube-20mm','立方体（1辺20mm）'],
  ['lesson-7','点つなぎプリント2個目 立方体＋滑り台'],
  ['lesson-5','等角図プリント③ 台の上に小さな立方体'],
  ['lesson-6','等角図プリント④ 凹'],
  ['lesson-3','等角図を見て正投影図に①'],
  ['lesson-4','等角図を見て正投影図に②'],
  ['lesson-1','正投影図から等角図へ①'],
  ['lesson-2','正投影図から等角図へ②'],
  ['lesson-dengon-1','立体伝言ゲーム①'],
  ['__free__','自由練習']
];
const STATE_KEY_ = 'GURIGURI_TRIAL_STATE_V1';
const OWNER_KEY_ = 'GURIGURI_TRIAL_OWNER_V1';

/** 最初にエディタの関数一覧からこの関数を1回実行します。 */
function setupTeacher() {
  const active = Session.getActiveUser().getEmail();
  const effective = Session.getEffectiveUser().getEmail();
  if (!active || active !== effective) throw new Error('GASの編集画面で、作成したアカウントから実行してください。');
  const lock = LockService.getScriptLock(); lock.waitLock(5000);
  try {
    const props = PropertiesService.getScriptProperties();
    const owner = props.getProperty(OWNER_KEY_);
    if (owner && owner !== active) throw new Error('別の作成者が登録されています。');
    if (!owner) props.setProperty(OWNER_KEY_, active);
    if (!props.getProperty(STATE_KEY_)) props.setProperty(STATE_KEY_, JSON.stringify(initialState_()));
    CacheService.getScriptCache().remove(STATE_KEY_);
    console.log('先生の登録と試験設定の準備が完了しました。メールアドレスは公開しません。');
  } finally { lock.releaseLock(); }
}

function initialState_() { return {allowedIds:['lesson-cube-20mm'],revision:0,updatedAt:null}; }

/** 読み取りだけの公開関数。個人情報・秘密情報は返しません。 */
function getPermissions() {
  const cache = CacheService.getScriptCache();
  const cached = cache.get(STATE_KEY_);
  if (cached) return JSON.parse(cached);
  const lock = LockService.getScriptLock(); lock.waitLock(5000);
  try {
    const again = cache.get(STATE_KEY_);
    if (again) return JSON.parse(again);
    const raw = PropertiesService.getScriptProperties().getProperty(STATE_KEY_);
    const state = raw ? JSON.parse(raw) : initialState_();
    cache.put(STATE_KEY_, JSON.stringify(state), 30);
    return state;
  } finally { lock.releaseLock(); }
}

function requireTeacher_() {
  const active = Session.getActiveUser().getEmail();
  const owner = PropertiesService.getScriptProperties().getProperty(OWNER_KEY_);
  // getEffectiveUser()だけでは実行者=所有者となるため、訪問者の判定に使いません。
  if (!active || !owner || active !== owner) throw new Error('先生のGoogleアカウントで開いてください。');
}

/** 書き込みは登録した作成者だけ。古い画面からの上書きも防ぎます。 */
function savePermissions(allowedIds, expectedRevision) {
  requireTeacher_();
  const ids = LESSONS_.map(function(item) { return item[0]; });
  if (!Array.isArray(allowedIds) || allowedIds.length > ids.length ||
      allowedIds.some(function(id) { return ids.indexOf(id) < 0; }) ||
      !Number.isSafeInteger(expectedRevision) || expectedRevision < 0) throw new Error('設定の指定を確認してください。');
  const lock = LockService.getScriptLock(); lock.waitLock(5000);
  try {
    const props = PropertiesService.getScriptProperties();
    const raw = props.getProperty(STATE_KEY_);
    const previous = raw ? JSON.parse(raw) : initialState_();
    if (previous.revision !== expectedRevision) throw new Error('別の画面で更新されました。「読み直す」を押してください。');
    const state = {
      allowedIds: ids.filter(function(id) { return id === 'lesson-cube-20mm' || allowedIds.indexOf(id) >= 0; }),
      revision: previous.revision + 1,
      updatedAt: new Date().toISOString()
    };
    const json = JSON.stringify(state);
    props.setProperty(STATE_KEY_, json);
    // 保存と同時に共有キャッシュも更新し、30秒間古い設定が残るのを防ぎます。
    CacheService.getScriptCache().put(STATE_KEY_, json, 30);
    return state;
  } finally { lock.releaseLock(); }
}

function doGet(e) {
  const params = e && e.parameter ? e.parameter : {};
  const mode = params.mode || 'teacher';
  if (mode === 'api') {
    const json = JSON.stringify(getPermissions());
    if (params.callback) {
      // GitHub側から読み取る試験用。公開してよい立体IDのみを返します。
      if (!/^[A-Za-z_$][A-Za-z0-9_$]{0,63}$/.test(params.callback)) return ContentService.createTextOutput('Invalid callback');
      return ContentService.createTextOutput(params.callback + '(' + json + ');').setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
    return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
  }
  if (mode !== 'student' && mode !== 'teacher') return HtmlService.createHtmlOutput('画面の指定を確認してください。');
  if (mode === 'teacher') {
    try { requireTeacher_(); }
    catch (_) { return HtmlService.createHtmlOutput('<h2>先生のGoogleアカウントで開いてください</h2><p>初回は編集画面で setupTeacher を実行します。複数アカウントでログインしている場合は、作成したアカウントだけで開いてください。</p>'); }
  }
  const url = ScriptApp.getService().getUrl() || '';
  const html = TEST_PAGE_
    .replace('__LESSONS_JSON__', JSON.stringify(LESSONS_).replace(/</g, '\\u003c'))
    .replace('__MODE_JSON__', JSON.stringify(mode))
    .replace('__URL_JSON__', JSON.stringify(url));
  return HtmlService.createHtmlOutput(html).setTitle('立体グリグリ 許可設定').addMetaTag('viewport','width=device-width,initial-scale=1');
}

const TEST_PAGE_ = String.raw`<!doctype html><html lang="ja"><head><meta charset="utf-8"><base target="_top">
<style>*{box-sizing:border-box}body{margin:0;background:#edf3f8;color:#173148;font:16px/1.7 system-ui,sans-serif}main{max-width:800px;margin:24px auto;padding:24px;background:white;border-radius:16px}h1{font-size:25px}label{display:flex;gap:12px;align-items:center;padding:12px;border-bottom:1px solid #d9e2eb}input[type=checkbox]{width:24px;height:24px;accent-color:#1366a6}button,a.button{padding:11px 16px;min-height:46px;border:1px solid #9fb3c7;border-radius:9px;background:#1366a6;color:white;font:inherit;cursor:pointer;text-decoration:none;display:inline-block}button:disabled{opacity:.5;cursor:wait}.actions{display:flex;gap:8px;flex-wrap:wrap;margin:20px 0}.note{padding:12px;background:#fff3d5;border-radius:8px}#message{font-weight:bold;min-height:2em}select{width:100%;padding:12px;font:inherit}#teacher,#student{display:none}small{color:#53697b}</style></head>
<body><main><h1 id="title">立体グリグリ 許可設定</h1><p class="note">このGASに保存した許可設定は、接続先の立体グリグリに反映されます。先生用画面から変更してください。</p>
<section id="teacher"><p>生徒側に表示する立体にチェックし、「許可を反映」を押してください。</p><div id="choices"></div><div class="actions"><button id="apply" disabled>許可を反映</button><button id="reset" disabled>立方体だけに戻す</button><button id="reload">読み直す</button></div><a id="studentLink" class="button" target="_blank" rel="noopener noreferrer">生徒側の確認画面を別タブで開く</a></section>
<section id="student"><p>先生が許可した立体だけが、下の一覧に表示されます。約5秒ごとに確認します。</p><select id="lessonSelect" aria-label="許可された立体"></select><p id="lag">先生側で設定を変えると、ここに受信状況が出ます。</p><p>別の端末・別のGoogleアカウントでも、このURLを開いて試せます。</p></section>
<p id="message" role="status" aria-live="polite">読み込んでいます…</p><small>GASの実行時間や通信時間があるため、5秒以内の受信を保証するものではありません。</small>
<script>
const lessons=__LESSONS_JSON__,mode=__MODE_JSON__,baseUrl=__URL_JSON__;
const $=id=>document.getElementById(id);let revision=null,busy=false;
function requestState(ok,fail){google.script.run.withSuccessHandler(ok).withFailureHandler(fail).getPermissions();}
function errorText(error){return error&&error.message?error.message:'通信を確認してください。';}
function lock(value){busy=value;['apply','reset','reload'].forEach(id=>$(id).disabled=value);document.querySelectorAll('#choices input').forEach(box=>box.disabled=value||box.value==='lesson-cube-20mm');}
function teacherState(state){revision=state.revision;document.querySelectorAll('#choices input').forEach(box=>box.checked=state.allowedIds.includes(box.value));}
function loadTeacher(){lock(true);requestState(state=>{teacherState(state);$('message').textContent='許可設定を読み込みました。版番号 '+state.revision;lock(false);},error=>{$('message').textContent=errorText(error);$('reload').disabled=false;});}
function save(reset){if(busy)return;const ids=reset?['lesson-cube-20mm']:Array.from(document.querySelectorAll('#choices input:checked')).map(box=>box.value);lock(true);$('message').textContent='保存しています…';const started=performance.now();google.script.run.withSuccessHandler(state=>{teacherState(state);$('message').textContent='保存しました（保存往復 '+((performance.now()-started)/1000).toFixed(1)+'秒）。生徒側の画面を確認してください。';lock(false);}).withFailureHandler(error=>{$('message').textContent=errorText(error);lock(false);}).savePermissions(ids,revision);}
function pollStudent(){requestState(state=>{const changed=revision!==null&&state.revision!==revision;const selected=$('lessonSelect').value;$('lessonSelect').innerHTML='';lessons.forEach(([id,name])=>{if(state.allowedIds.includes(id)){const option=document.createElement('option');option.value=id;option.textContent=name;$('lessonSelect').append(option);}});if(state.allowedIds.includes(selected))$('lessonSelect').value=selected;if(changed){const seconds=(Date.now()-Date.parse(state.updatedAt))/1000;$('lag').textContent='更新を受信しました。保存時刻との差は約'+seconds.toFixed(1)+'秒（端末の時計差を含みます）。';}revision=state.revision;$('message').textContent='接続中：版番号 '+state.revision+' ／ 選べる数 '+state.allowedIds.length;setTimeout(pollStudent,5000);},error=>{$('message').textContent=errorText(error)+' 5秒後に再確認します。';setTimeout(pollStudent,5000);});}
if(mode==='teacher'){$('title').textContent='先生用：立体の許可設定';$('teacher').style.display='block';lessons.forEach(([id,name])=>{const label=document.createElement('label'),box=document.createElement('input');box.type='checkbox';box.value=id;box.disabled=true;label.append(box,document.createTextNode(name));$('choices').append(label);});$('studentLink').href=baseUrl+'?mode=student';$('apply').onclick=()=>save(false);$('reset').onclick=()=>save(true);$('reload').onclick=loadTeacher;loadTeacher();}else{$('title').textContent='生徒側：許可設定の確認';$('student').style.display='block';pollStudent();}
</script></main></body></html>`;
