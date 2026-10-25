/**
 * Presentation state for a REAL StormPT character position, supplied after
 * GameServer login. This is not a login implementation or authority.
 * Render interpolation never modifies the server/game state.
 */
export const PT_FIXED_POINT_SCALE = 256;
const validPosition = p => Array.isArray(p) && p.length===3 &&
  p.every(x=>Number.isSafeInteger(x) && Math.abs(x)<=1_000_000_000);
const validTick = n => Number.isSafeInteger(n) && n>=0;
export function serverToWorld(position){
  if(!validPosition(position))throw new RangeError('Invalid authoritative PT coordinates');
  return position.map(x=>x/PT_FIXED_POINT_SCALE);
}

export class ServerPositionStream {
  constructor({maxInterpolationMs=120,now=()=>performance.now()}={}) {
    if(!Number.isFinite(maxInterpolationMs) || maxInterpolationMs<0 || maxInterpolationMs>500)
      throw new RangeError('Interpolation limit invalid');
    this.now=now;
    this.maxInterpolationMs=maxInterpolationMs;
    this.reset();
  }
  reset(){
    this.sessionId=null;this.tick=-1;this.last=null;this.prev=null;
    this.updatedAt=null;
  }
  beginSession({serverSessionId}){
    if(typeof serverSessionId!=='string' || !/^[A-Za-z0-9_-]{16,128}$/.test(serverSessionId))
      throw new Error('Authenticated server session ID required');
    this.reset();
    this.sessionId=serverSessionId;
  }
  ingest({serverSessionId,serverTick,position}){
    if(!this.sessionId || serverSessionId!==this.sessionId)
      throw new Error('Server position not bound to authenticated session');
    if(!validTick(serverTick)||serverTick<=this.tick)
      throw new RangeError('Stale or invalid server tick');
    const world=serverToWorld(position);
    this.prev=this.last??world;
    this.last=world;
    this.tick=serverTick;
    this.updatedAt=this.now();
    return world;
  }
  sample(at=this.now()){
    if(!this.last)return null;
    if(!this.prev || this.maxInterpolationMs===0)return [...this.last];
    const t=Math.max(0,Math.min(1,(at-this.updatedAt)/this.maxInterpolationMs));
    return this.prev.map((x,i)=>x+(this.last[i]-x)*t);
  }
  get initialized(){return this.last!==null}
}
