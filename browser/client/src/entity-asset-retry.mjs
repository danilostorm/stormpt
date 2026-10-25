// Bounded exponential retry for original, authenticated NPC/monster model loads.
// Retry only on future authoritative entity snapshots: no background polling.
export function assetRetryDelayMs(failures) {
 if(!Number.isInteger(failures)||failures<1)throw new RangeError('Positive failure count required');
 return Math.min(30000,1000*2**Math.min(failures-1,5));
}
export function shouldAttemptAssetLoad(slot,now) {
 if(!slot||!Number.isFinite(now))throw new TypeError('Asset slot and clock required');
 return !slot.pending&&!slot.template&&now>=slot.nextAttemptAt;
}
