"""Measure saved CUA screenshots without starting or controlling a browser.
Same 160x90 sampling / 4-bit RGB buckets / >12 luminance edges as
threejs-qa-release's computePixelMetrics. These are composited frames, including HUD.
"""
import json, math, subprocess
from collections import Counter
from pathlib import Path
BASE=Path(__file__).resolve().parent
BUDGETS={'desktop':{'calls':300,'triangles':750000,'geometries':300,'textures':60},'mobile':{'calls':150,'triangles':300000,'geometries':200,'textures':40}}
for mode in ['desktop','mobile']:
    source=BASE/(mode+'-active-play.jpg')
    size=json.loads(subprocess.check_output(['ffprobe','-v','error','-select_streams','v:0','-show_entries','stream=width,height','-of','json',str(source)]))['streams'][0]
    w,h=size['width'],size['height']; rgba=subprocess.check_output(['ffmpeg','-v','error','-i',str(source),'-f','rawvideo','-pix_fmt','rgba','-'])
    sx,sy=max(1,w//160),max(1,h//90);cols,rows=w//sx,h//sy;lums=[];buckets=Counter()
    for gy in range(rows):
        for gx in range(cols):
            at=(gy*sy*w+gx*sx)*4;r,g,b=rgba[at:at+3]
            lums.append(.2126*r+.7152*g+.0722*b);buckets[(r>>4,g>>4,b>>4)]+=1
    n=len(lums);ordered=sorted(lums);p5,p95=ordered[int(n*.05)],ordered[int(n*.95)];edges=0
    for gy in range(rows-1):
        for gx in range(cols-1):
            i=gy*cols+gx;edges+=max(abs(lums[i]-lums[i+1]),abs(lums[i]-lums[i+cols]))>12
    metrics={'colorBuckets':len(buckets),'colorEntropyBits':round(-sum((v/n)*math.log2(v/n) for v in buckets.values()),2),'edgeDensity':round(edges/((rows-1)*(cols-1)),3),'luminance':{'mean':round(sum(lums)/n,1),'p5':round(p5,1),'p95':round(p95,1),'contrast':round(p95-p5,1)},'dominantColorShare':round(max(buckets.values())/n,3),'nonBackgroundShare':round(1-max(buckets.values())/n,3)}
    renderer=json.loads((BASE/(mode+'-render-final-tactical.json')).read_text())
    report={'runId':'studio-pass-20261026','mode':mode,'captureMethod':'CUA real input; normal user page; manual DOM/visual observation','state':None,'appliedState':None,'observedState':'active-play','scenario':'T07 before playing Miracle Fusion','viewport':{'width':w,'height':h},'screenshot':source.name,'metrics':metrics,'metricScope':'Composited screenshot includes HUD; not raw WebGL canvas. Statistics do not establish visual quality alone.','renderBudget':{key:{'actual':renderer[key],'budget':limit,'overBudget':renderer[key]>limit} for key,limit in BUDGETS[mode].items()},'renderer':renderer,'limitations':['No named-state or seed hooks were invoked; state is an observed actual server game.','Frame times are from Apple M4 hardware on a local desktop, including the mobile viewport; not physical phone performance.','Representative pre-action view is not a full-field or effect-stress benchmark.','Budget excludes texture-byte memory, which was not measured.']}
    (BASE/(mode+'-active-play.json')).write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    print(mode,json.dumps(metrics,ensure_ascii=False))
