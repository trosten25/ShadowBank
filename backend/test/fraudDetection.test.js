import test from 'node:test';
import assert from 'node:assert/strict';
import { scoreTransactionBehavior } from '../src/fraudDetection.js';

const history = [100, 120, 80, 90, 110].map((amount, index) => ({
  amount,
  receiver_account_id: index === 0 ? 'known-recipient' : `recipient-${index}`,
}));

test('flags an unusually large transfer to a new recipient against the sender baseline', () => {
  const result = scoreTransactionBehavior({
    amount: 2000,
    availableBalance: 5000,
    recentOutgoingCount: 0,
    priorTransfers: history,
    recipientAccountId: 'new-recipient',
  });

  assert.equal(result.flagged, true);
  assert.equal(result.score, 90);
  assert.match(result.reason, /3x the sender median/);
  assert.match(result.reason, /Recipient is new/);
});

test('holds a large transfer and caps combined signals at 100', () => {
  const result = scoreTransactionBehavior({
    amount: 5000,
    availableBalance: 6000,
    recentOutgoingCount: 4,
    priorTransfers: history,
    recipientAccountId: 'new-recipient',
  });

  assert.equal(result.flagged, true);
  assert.equal(result.score, 100);
});

test('does not apply personalized signals before enough history exists', () => {
  const result = scoreTransactionBehavior({
    amount: 300,
    availableBalance: 10000,
    recentOutgoingCount: 0,
    priorTransfers: history.slice(0, 4),
    recipientAccountId: 'new-recipient',
  });

  assert.equal(result.flagged, false);
  assert.equal(result.score, 0);
  assert.match(result.summary, /4 recent completed transfers; 5 required/);
});
