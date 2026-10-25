/** Bounded frame timing; measurements are read locally by QA, never transmitted. */
export class FrameMetrics{
 constructor(capacity=7200){if(!Number.isInteger(capacity)||capacity<2||capacity>36000)throw Error('Invalid sample capacity');this.capacity=capacity;this.reset();}
 reset(){this.samples=new Float64Array(this.capacity);this.count=0;this.cursor=0;this.last=null;this.totalFrames=0;this.started=null;this.ended=null;}
 record(now){
  if(!Number.isFinite(now))throw Error('Invalid frame clock');
  if(this.last!==null&&now<=this.last)return;
  if(this.started===null)this.started=now;
  if(this.last!==null){this.samples[this.cursor]=now-this.last;this.cursor=(this.cursor+1)%this.capacity;this.count=Math.min(this.capacity,this.count+1);this.totalFrames++;}
  this.last=now;this.ended=now;
 }
 snapshot(){
  const sorted=Array.from(this.samples.subarray(0,this.count)).sort((a,b)=>a-b);
  const percentile=p=>sorted.length?sorted[Math.min(sorted.length-1,Math.ceil(p*sorted.length)-1)]:null;
  const duration=this.started===null?0:this.ended-this.started;
  const slow=sorted.filter(x=>x>33.34).length;
  return {frames:this.totalFrames,samples:this.count,durationMs:duration,fps:duration>0?this.totalFrames*1000/duration:null,
   medianMs:percentile(.5),p95Ms:percentile(.95),p99Ms:percentile(.99),worstMs:percentile(1),framesOver33Ms:slow};
 }
}
