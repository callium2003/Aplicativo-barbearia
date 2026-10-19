import assert from 'node:assert/strict';
import test from 'node:test';
import { invitationEmailMismatch } from '../utils/invitation-email.ts';

test('gateway masked address does not claim an authenticated recipient mismatch', () => {
  assert.equal(invitationEmailMismatch(true, { email_normalized: 'i******@example.test', email_matches_authenticated_user: null }, 'invited@example.test'), false);
});

test('explicit recipient mismatch remains blocking', () => {
  assert.equal(invitationEmailMismatch(true, { email_normalized: 'i******@example.test', email_matches_authenticated_user: false }, 'outsider@example.test'), true);
});

test('legacy unmasked response compares real addresses case insensitively', () => {
  assert.equal(invitationEmailMismatch(true, { email_normalized: 'invited@example.test' }, 'INVITED@example.test'), false);
  assert.equal(invitationEmailMismatch(true, { email_normalized: 'invited@example.test' }, 'outsider@example.test'), true);
});

test('missing authentication or invitation does not assert a mismatch', () => {
  assert.equal(invitationEmailMismatch(false, { email_matches_authenticated_user: false }, null), false);
  assert.equal(invitationEmailMismatch(true, null, 'invited@example.test'), false);
});
