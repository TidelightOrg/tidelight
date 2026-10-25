import os,sys,json,time,uuid,urllib.request,urllib.error
sys.path.insert(0,'work/authenticated-research/python-published')
from tidelight import Client,ApiError
mode=sys.argv[1]; start=time.monotonic(); target='work/authenticated-research/published-poll'
cast=open(target+'.cast','w'); cast.write(json.dumps({'version':2,'width':120,'height':30,'timestamp':int(time.time()),'title':'Tidelight '+mode+' actual sanitized command/event trace'})+'\n'); trace=[]
def emit(event):
 event={'at':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),**event}; trace.append(event); line=json.dumps(event);print(line,flush=True);cast.write(json.dumps([round(time.monotonic()-start,3),'o',line+'\r\n'])+'\n');cast.flush()
def safe(d):return {k:d[k] for k in ('job_id','request_id','status','ticker','attempts','max_attempts','created_at','started_at','completed_at','retry_at','duplicate') if k in d}
emit({'command':'python work/authenticated-research/published-poll.py '+mode,'source':'actual invocation; allowlisted response metadata only'})
try:
 if mode=='python':
  c=Client(os.environ['TIDELIGHT_API_KEY']);a={'job_id':json.load(open('work/authenticated-research/published-start.json'))[-1]['job_id']};emit({'origin':'installed PyPI tidelight==0.1.2','operation':'poll_existing_npm_created_job','job_id':a['job_id']})
  for i in range(45):
   j=c.get_research_job(a['job_id']);emit({'operation':'get_research_job',**safe(vars(j))})
   if j.status in ('complete','failed','cancelled'):break
   time.sleep(10)
 else:
  seq=0
  def rpc(method,params):
   global seq
   seq+=1;body=json.dumps({'jsonrpc':'2.0','id':seq,'method':method,'params':params}).encode(); req=urllib.request.Request('https://mcp.tidelight.app/mcp',data=body,headers={'Authorization':'Bearer '+os.environ['TIDELIGHT_API_KEY'],'Content-Type':'application/json','Accept':'application/json, text/event-stream'})
   with urllib.request.urlopen(req,timeout=45) as r:
    raw=r.read().decode(); code=r.status
   data=json.loads(raw) if not raw.startswith('event:') else json.loads(next(x[6:] for x in raw.splitlines() if x.startswith('data: ')))
   if 'error' in data:raise RuntimeError('JSON-RPC error code '+str(data['error'].get('code')))
   return data['result'],code
  r,h=rpc('initialize',{'protocolVersion':'2025-03-26','capabilities':{},'clientInfo':{'name':'tidelight-sanitized-evidence','version':'1.0'}});emit({'operation':'initialize','http_status':h,'protocol_version':r.get('protocolVersion')})
  r,h=rpc('tools/list',{});names=[x['name'] for x in r['tools']];emit({'operation':'tools/list','http_status':h,'tools':names,'transport':'direct Streamable HTTP; not installed Codex bridge'})
  if 'tidelight_start_company_research' in names:
   r,h=rpc('tools/call',{'name':'tidelight_start_company_research','arguments':{'ticker':'MSFT','idempotency_key':str(uuid.uuid4())}});a=r.get('structuredContent',{});emit({'operation':'tidelight_start_company_research','http_status':h,'is_error':r.get('isError',False),**safe(a)})
   if a.get('job_id'):
    for i in range(45):
     r,h=rpc('tools/call',{'name':'tidelight_get_research_job','arguments':{'job_id':a['job_id']}});j=r.get('structuredContent',{});emit({'operation':'tidelight_get_research_job','http_status':h,'is_error':r.get('isError',False),**safe(j)})
     if j.get('status') in ('complete','failed','cancelled'):break
     time.sleep(10)
except ApiError as e:emit({'error_type':'ApiError','http_status':e.status,'code':e.code,'request_id':e.request_id})
except urllib.error.HTTPError as e:emit({'error_type':'HTTPError','http_status':e.code})
except Exception as e:emit({'error_type':type(e).__name__})
finally:
 emit({'process_state':'finished'});cast.close();open(target+'.json','w').write(json.dumps(trace,indent=2)+'\n')
