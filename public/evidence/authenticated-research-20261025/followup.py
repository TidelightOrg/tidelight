import os,sys,json,time
sys.path.insert(0,'sdk/python/src')
from tidelight import Client,ApiError
out=[]
for client,jid in [('python','5ca30ee9-61c6-4df2-921b-506d8c86e196'),('javascript','7b6601b2-7cd3-4cc0-93d2-dceb60ff18c8')]:
 try:
  j=Client(os.environ['TIDELIGHT_API_KEY']).get_research_job(jid)
  e={k:v for k,v in vars(j).items() if k not in ('result','error')};e['result_present']=j.result is not None
 except ApiError as e:e={'http_status':e.status,'code':e.code,'request_id':e.request_id}
 e={'at':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),'client':client,'operation':'get_research_job',**e};out.append(e);print(json.dumps(e))
open('work/authenticated-research/followup.json','w').write(json.dumps(out,indent=2)+'\n')
