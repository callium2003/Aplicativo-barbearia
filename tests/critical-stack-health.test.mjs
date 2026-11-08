import test from 'node:test';
import assert from 'node:assert/strict';
import { waitForCriticalStackHealth } from '../scripts/critical-stack-health.mjs';
test('waits for slow Storage and does not accept an unhealthy or missing stack', async () => {
 let calls=0;
 await waitForCriticalStackHealth({ readHealth:async()=>['healthy','healthy','healthy','healthy',++calls<3?'unhealthy':'healthy'],pause:async()=>{},attempts:3 });
 assert.equal(calls,3);
 await assert.rejects(waitForCriticalStackHealth({readHealth:async()=>Array(5).fill('unhealthy'),pause:async()=>{},attempts:2}),/timed out/);
 await assert.rejects(waitForCriticalStackHealth({readHealth:async()=>['missing'],pause:async()=>{}}),/stopped/);
});
