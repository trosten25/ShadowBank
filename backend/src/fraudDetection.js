export const FRAUD_REVIEW_THRESHOLD = 75;

function median(values) {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

export function scoreTransactionBehavior({
  amount,
  availableBalance,
  recentOutgoingCount,
  priorTransfers,
  recipientAccountId,
}) {
  const history = priorTransfers
    .map((transaction) => ({
      amount: Number(transaction.amount),
      recipientAccountId: transaction.receiver_account_id,
    }))
    .filter((transaction) => Number.isFinite(transaction.amount) && transaction.amount > 0);
  const historyMedian = history.length ? median(history.map((transaction) => transaction.amount)) : null;
  const signals = [];
  let score = 0;

  function addSignal(points, description) {
    score += points;
    signals.push(description);
  }

  if (amount >= 5000) {
    addSignal(75, 'Transfer amount is $5,000 or more');
  } else if (amount >= 2000) {
    addSignal(40, 'Transfer amount is $2,000 or more');
  }

  if (history.length >= 5) {
    if (historyMedian > 0 && amount >= Math.max(500, historyMedian * 3)) {
      addSignal(35, `Amount is at least 3x the sender median of $${historyMedian.toFixed(2)}`);
    }

    if (
      recipientAccountId
      && !history.some((transaction) => transaction.recipientAccountId === recipientAccountId)
    ) {
      addSignal(15, 'Recipient is new in the sender recent transfer history');
    }
  }

  if (recentOutgoingCount >= 4) {
    addSignal(38, 'At least 4 outgoing transfers in the last 5 minutes');
  } else if (recentOutgoingCount >= 2) {
    addSignal(18, 'At least 2 outgoing transfers in the last 5 minutes');
  }

  if (
    Number.isFinite(availableBalance)
    && availableBalance > 0
    && amount >= 500
    && amount / availableBalance >= 0.8
  ) {
    addSignal(25, 'Transfer uses at least 80% of the available balance');
  }

  score = Math.min(100, score);
  const flagged = score >= FRAUD_REVIEW_THRESHOLD;
  const reason = flagged ? signals.join('; ') : '';
  const baseline = history.length >= 5
    ? `Personal baseline: ${history.length} recent completed transfers; median $${historyMedian.toFixed(2)}.`
    : `Personal baseline not established (${history.length} recent completed transfers; 5 required).`;
  const summary = `Behavioral anomaly score ${score}/100. ${signals.length ? signals.join('; ') : 'No elevated risk signals.'} ${baseline}`;

  return { score, flagged, reason, summary };
}
