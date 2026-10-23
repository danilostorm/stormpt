/**
 * Asset registry for ORIGINAL converted StormPT client models.
 * Never construct URLs from untrusted server, username, or URL query.
 *
 * A character model is not evidence of login. Rendering a character in
 * the game world requires a separately authenticated and server-authorized
 * character record + an authoritative position from the actual game server.
 */
const models = Object.freeze({
  mmba01: '/assets/MmbA01.textured.glb',
});

function modelID(name) {
  if(typeof name!=='string' || name.length>160 || name.includes('\0'))return null;
  const clean=name.replaceAll('\\','/');
  if(clean.startsWith('/') || clean.includes(':') || clean.split('/').includes('..'))return null;
  const parts=clean.split('/');
  if(parts.length>3 || parts.some(p=>!p || p==='.' ))return null;
  // StormPT smCHAR_INFO refers to filename strings; original 3D models can
  // be supplied with .smd, .ase and .inf extensions depending on client data.
  let file=parts.at(-1);
  if(!/^[A-Za-z0-9_-]+(?:\.(?:smd|ase|inf))?$/i.test(file))return null;
  return file.replace(/\.(?:smd|ase|inf)$/i,'').toLowerCase();
}
export function resolveCharacterBodyGLB(identity) {
  if(!identity || typeof identity!=='object' || typeof identity.bodyModel!=='string')
    return null;
  const id=modelID(identity.bodyModel);
  return id ? models[id]||null : null;
}
export function requireAuthorizedCharacterAsset({identity,authenticatedRecord,serverPosition}) {
  if(authenticatedRecord!==true) throw new Error('GameServer authenticated record required');
  if(!identity || typeof identity.name!=='string' || !identity.name)
    throw new Error('No real game character identity');
  if(!Array.isArray(serverPosition) || serverPosition.length!==3 ||
     serverPosition.some(v=>!Number.isSafeInteger(v) || Math.abs(v)>1e9))
    throw new Error('Server-authenticated position is required');
  const asset=resolveCharacterBodyGLB(identity);
  if(!asset) throw new Error('Model has not yet been converted from real StormPT assets');
  return {asset,position:serverPosition.map(v=>v/256)};
}
