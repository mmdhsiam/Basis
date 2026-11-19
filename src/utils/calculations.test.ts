import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateRequiredApprovals,
  evaluateApprovalState,
  calculateFinancialTotals,
  calculateGrowthRate,
  toBengaliNumerals,
  formatCurrencyBengali,
  generateReceiptNumber,
  checkPermission,
  type SavingsTransaction,
} from './calculations.ts';

test('2/3rds ceiling approval threshold calculation matches spec requirements', () => {
  // As specified in Section 5:
  // 3 eligible -> 2
  // 4 eligible -> 3
  // 5 eligible -> 4
  // 6 eligible -> 4
  // 7 eligible -> 5
  assert.equal(calculateRequiredApprovals(1), 1);
  assert.equal(calculateRequiredApprovals(2), 2);
  assert.equal(calculateRequiredApprovals(3), 2);
  assert.equal(calculateRequiredApprovals(4), 3);
  assert.equal(calculateRequiredApprovals(5), 4);
  assert.equal(calculateRequiredApprovals(6), 4);
  assert.equal(calculateRequiredApprovals(7), 5);
  assert.equal(calculateRequiredApprovals(8), 6);
  assert.equal(calculateRequiredApprovals(9), 6);
});

test('evaluateApprovalState correctly transitions states and prevents premature finalization', () => {
  const eligibleCount = 5; // requires ceil(5*2/3) = 4
  const currentVotes: string[] = ['mod1', 'mod2'];
  const rejectedVotes: string[] = [];

  const state1 = evaluateApprovalState(eligibleCount, currentVotes, rejectedVotes);
  assert.equal(state1.isFinalized, false);
  assert.equal(state1.status, 'PENDING');
  assert.equal(state1.requiredVotes, 4);
  assert.equal(state1.remainingVotes, 2);

  // 4 approvals reached
  const state2 = evaluateApprovalState(eligibleCount, ['mod1', 'mod2', 'mod3', 'mod4'], []);
  assert.equal(state2.isFinalized, true);
  assert.equal(state2.status, 'APPROVED');
  assert.equal(state2.remainingVotes, 0);

  // 2 rejections out of 5 eligible (requires 4) stays PENDING until 4 rejections are cast
  const state3 = evaluateApprovalState(eligibleCount, ['mod1'], ['mod2', 'mod3']);
  assert.equal(state3.isFinalized, false);
  assert.equal(state3.status, 'PENDING');

  // 4 rejections out of 5 eligible reaches 2/3 threshold -> REJECTED
  const state4 = evaluateApprovalState(eligibleCount, ['mod1'], ['mod2', 'mod3', 'mod4', 'mod5']);
  assert.equal(state4.isFinalized, true);
  assert.equal(state4.status, 'REJECTED');
});

test('calculateFinancialTotals isolates pending transactions from approved totals', () => {
  const txs: SavingsTransaction[] = [
    {
      id: 'tx-1',
      memberId: 'M-001',
      memberName: 'মাহমুদুল ইসলাম',
      amount: 1500,
      savingsMonth: '2026-10',
      savingsYear: 2026,
      transactionDate: '2026-10-01T10:00:00Z',
      paymentMethod: 'BKASH',
      entryCreatorId: 'mod-1',
      entryCreatorName: 'মডারেটর ১',
      status: 'APPROVED',
      approvingModerators: ['mod-1', 'mod-2'],
    },
    {
      id: 'tx-2',
      memberId: 'M-002',
      memberName: 'আসিফ আহমেদ',
      amount: 2000,
      savingsMonth: '2026-10',
      savingsYear: 2026,
      transactionDate: '2026-10-02T11:00:00Z',
      paymentMethod: 'CASH',
      entryCreatorId: 'mod-1',
      entryCreatorName: 'মডারেটর ১',
      status: 'PENDING', // MUST NOT contribute to approved total!
      approvingModerators: ['mod-1'],
    },
    {
      id: 'tx-3',
      memberId: 'M-003',
      memberName: 'রফিকুল ইসলাম',
      amount: 500,
      savingsMonth: '2026-09',
      savingsYear: 2026,
      transactionDate: '2026-09-15T09:00:00Z',
      paymentMethod: 'ROCKET',
      entryCreatorId: 'mod-2',
      entryCreatorName: 'মডারেটর ২',
      status: 'APPROVED',
      approvingModerators: ['mod-1', 'mod-2'],
    },
    {
      id: 'tx-4',
      memberId: 'M-004',
      memberName: 'শাকিল হোসেন',
      amount: 1000,
      savingsMonth: '2026-10',
      savingsYear: 2026,
      transactionDate: '2026-10-03T12:00:00Z',
      paymentMethod: 'NAGAD',
      entryCreatorId: 'mod-2',
      entryCreatorName: 'মডারেটর ২',
      status: 'REJECTED',
      approvingModerators: [],
    },
  ];

  const totals = calculateFinancialTotals(txs);
  assert.equal(totals.totalApproved, 2000); // 1500 + 500
  assert.equal(totals.totalPending, 2000); // exactly 2000
  assert.equal(totals.approvedCount, 2);
  assert.equal(totals.pendingCount, 1);
  assert.equal(totals.rejectedCount, 1);
});

test('growth rate calculations handle positive, negative, and zero previous totals', () => {
  const g1 = calculateGrowthRate(15000, 10000);
  assert.equal(g1.percentage, 50);
  assert.equal(g1.isPositive, true);
  assert.equal(g1.formatted, '+50%');

  const g2 = calculateGrowthRate(8000, 10000);
  assert.equal(g2.percentage, -20);
  assert.equal(g2.isPositive, false);
  assert.equal(g2.formatted, '-20%');

  const g3 = calculateGrowthRate(5000, 0);
  assert.equal(g3.percentage, 100);
  assert.equal(g3.formatted, '+100%');
});

test('toBengaliNumerals and formatCurrencyBengali convert numbers properly', () => {
  assert.equal(toBengaliNumerals(1234567890), '১২৩৪৫৬৭৮৯০');
  assert.equal(toBengaliNumerals('2026-10-15'), '২০২৬-১০-১৫');
  assert.equal(formatCurrencyBengali(5000), '৳৫,০০০');
});

test('generateReceiptNumber produces uniform identifiable strings', () => {
  const rec = generateReceiptNumber('2026-10', 'MEM-104', 1);
  assert.equal(rec.startsWith('BF-REC-202610-MEM104-0001'), true);
});

test('checkPermission enforces least-privilege role boundaries', () => {
  // App Moderator only actions
  assert.equal(checkPermission('APP_MODERATOR', 'ACCESS_APP_MODERATOR_PANEL'), true);
  assert.equal(checkPermission('MODERATOR', 'ACCESS_APP_MODERATOR_PANEL'), false);
  assert.equal(checkPermission('MEMBER', 'ACCESS_APP_MODERATOR_PANEL'), false);

  assert.equal(checkPermission('APP_MODERATOR', 'PUBLISH_APK'), true);
  assert.equal(checkPermission('MODERATOR', 'PUBLISH_APK'), false);

  // Moderator actions
  assert.equal(checkPermission('MODERATOR', 'CREATE_SAVINGS'), true);
  assert.equal(checkPermission('MEMBER', 'CREATE_SAVINGS'), false);
  assert.equal(checkPermission('MODERATOR', 'VIEW_MODERATOR_CHAT'), true);
  assert.equal(checkPermission('MEMBER', 'VIEW_MODERATOR_CHAT'), false);

  // Member actions
  assert.equal(checkPermission('MEMBER', 'DOWNLOAD_OWN_RECEIPT'), true);
  assert.equal(checkPermission('MEMBER', 'VIEW_PUBLIC_DASHBOARD'), true);
});
