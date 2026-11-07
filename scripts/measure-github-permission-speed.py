"""Dispatch isolated workflow; measure anonymous reads. No credentials are saved."""
import argparse, concurrent.futures, datetime, json, os, pathlib, subprocess, time, urllib.request, urllib.error, uuid

REPO='playa2021git/rittai-guriguri-custom'
WORKFLOW='classroom-speed-test.yml'
ROOT=pathlib.Path(__file__).resolve().parent.parent

def credential():
    result=subprocess.run(['git','credential','fill'],input='protocol=https\nhost=github.com\n\n',text=True,capture_output=True,timeout=20,env={**os.environ,'GIT_TERMINAL_PROMPT':'0','GCM_INTERACTIVE':'Never'})
    fields=dict(line.split('=',1) for line in result.stdout.splitlines() if '=' in line)
    if not fields.get('password'):raise RuntimeError('Existing GitHub sign-in is required')
    return fields['password']

def request(url,token=None,method='GET',body=None,timeout=8):
    headers={'User-Agent':'Mozilla/5.0 Guriguri-Speed-Test','Accept':'application/vnd.github+json','Content-Type':'application/json'}
    if token:headers['Authorization']='Bearer '+token
    req=urllib.request.Request(url,headers=headers,method=method,data=json.dumps(body).encode() if body is not None else None)
    with urllib.request.urlopen(req,timeout=timeout) as response:
        raw=response.read()
        return json.loads(raw) if raw else None

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--trials',type=int,default=3);parser.add_argument('--timeout',type=int,default=240)
    args=parser.parse_args();token=credential();results=[]
    api='https://api.github.com/repos/'+REPO
    for trial in range(args.trials):
        nonce='speed-'+uuid.uuid4().hex[:16]
        endpoints={
            'raw_cache_busted':'https://raw.githubusercontent.com/'+REPO+'/main/teacher-benchmark/state.json',
            'raw_plain':'https://raw.githubusercontent.com/'+REPO+'/main/teacher-benchmark/state.json',
            'pages_cache_busted':'https://playa2021git.github.io/rittai-guriguri-custom/teacher-benchmark/state.json',
        }
        started=time.monotonic();at=datetime.datetime.now(datetime.timezone.utc).isoformat()
        request(api+'/actions/workflows/'+WORKFLOW+'/dispatches',token,'POST',{'ref':'main','inputs':{'probe_token':nonce}})
        print('Trial',trial+1,'dispatched',nonce,flush=True)
        elapsed={};errors={};sample=0;run=None
        with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
            while len(elapsed)<len(endpoints) and time.monotonic()-started<args.timeout:
                tick=time.monotonic();sample+=1
                pending={pool.submit(request,url+('' if name=='raw_plain' else '?probe='+nonce+'&sample='+str(sample)),timeout=4):name for name,url in endpoints.items() if name not in elapsed}
                for future in concurrent.futures.as_completed(pending):
                    name=pending[future]
                    try:
                        data=future.result()
                        if data.get('probeToken')==nonce:
                            elapsed[name]=round(time.monotonic()-started,2);print(' ',name,elapsed[name],'seconds',flush=True)
                    except Exception as error:errors[name]=str(error)[:140]
                if sample%5==0 or run is None:
                    listing=request(api+'/actions/workflows/'+WORKFLOW+'/runs?per_page=5',token)
                    run=next((x for x in listing['workflow_runs'] if nonce in x.get('display_title','')),run)
                    if run and run['status']=='completed' and run['conclusion']!='success':
                        print('Workflow failed:',run['html_url'],flush=True);break
                time.sleep(max(0,2-(time.monotonic()-tick)))
        if run:
            jobs=request(api+'/actions/runs/'+str(run['id'])+'/jobs',token)
            job=jobs.get('jobs',[None])[0]
        else:job=None
        record={'trial':trial+1,'probeToken':nonce,'dispatchedAt':at,'observedSeconds':elapsed,'timeoutSeconds':args.timeout,'errors':errors,'workflowUrl':run['html_url'] if run else None,'workflowCreatedAt':run['created_at'] if run else None,'jobStartedAt':job['started_at'] if job else None,'jobCompletedAt':job['completed_at'] if job else None}
        results.append(record)
        output=ROOT/'teacher-benchmark'/'results.json';output.write_text(json.dumps({'measuredAt':at,'pollIntervalSeconds':2,'results':results},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
        print('Trial',trial+1,'saved',flush=True)
    print(json.dumps(results,ensure_ascii=False,indent=2),flush=True)

if __name__=='__main__':main()
