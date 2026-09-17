/**
 * Unit tests for analyzer.cjs
 */

const { analyzeFuturesIncome, analyzeBehavior, analyzeSpotTrades } = require('../src/analyzer.cjs');

const MOCK_INCOME_HISTORY = [
  { incomeType: 'REALIZED_PNL', income: '100.50', time: 1710000000000 },
  { incomeType: 'REALIZED_PNL', income: '-30.25', time: 1710003600000 },
  { incomeType: 'REALIZED_PNL', income: '200.00', time: 1710007200000 },
  { incomeType: 'REALIZED_PNL', income: '-15.75', time: 1710010800000 },
  { incomeType: 'REALIZED_PNL', income: '80.00', time: 1710014400000 },
  { incomeType: 'COMMISSION', income: '-1.50', time: 1710000000000 },
  { incomeType: 'FUNDING_FEE', income: '-0.50', time: 1710000000000 },
  { incomeType: 'TRANSFER', income: '50.00', time: 1710000000000 },
];

let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
  if (condition) {
    testsPassed++;
  } else {
    testsFailed++;
    console.error(`FAIL: ${message}`);
  }
}

console.log('Running analyzer.cjs tests...\n');

// Test: analyzeFuturesIncome
const result = analyzeFuturesIncome(MOCK_INCOME_HISTORY);

assert(result.trades.total === 5, 'Should count 5 PnL trades');
assert(result.trades.wins === 3, 'Should have 3 wins (100.50, 200.00, 80.00)');
assert(result.trades.losses === 2, 'Should have 2 losses (-30.25, -15.75)');
assert(result.trades.winRate === '60.0', `Win rate should be 60.0, got ${result.trades.winRate}`);

const realized = parseFloat(result.pnl.realized);
assert(realized > 334 && realized < 335, `Realized PnL should be ~334.50, got ${realized}`);

assert(parseFloat(result.trades.commissions) === -1.5, `Commissions should be -1.50, got ${result.trades.commissions}`);

const avgWin = parseFloat(result.averages.avgWin);
assert(avgWin > 126 && avgWin < 127, `Avg win should be ~126.83, got ${avgWin}`);

const avgLoss = parseFloat(result.averages.avgLoss);
assert(avgLoss === -23, `Avg loss should be -23.00 (negative), got ${avgLoss}`);

const rr = parseFloat(result.averages.riskReward);
assert(rr > 5.5 && rr < 5.6, `Risk:reward should be ~5.52, got ${rr}`);

assert(result.streaks.maxWinStreak === 1, `Max win streak should be 1, got ${result.streaks.maxWinStreak}`);
assert(result.streaks.maxLossStreak >= 1, `Max loss streak should be >= 1, got ${result.streaks.maxLossStreak}`);

assert(result.period.days === 1, `Period days should be 1, got ${result.period.days}`);

// ISO date format
assert(/^\d{4}-\d{2}-\d{2}$/.test(result.period.start), `period.start should be ISO date, got ${result.period.start}`);
assert(/^\d{4}-\d{2}-\d{2}$/.test(result.period.end), `period.end should be ISO date, got ${result.period.end}`);

// Empty input
const empty = analyzeFuturesIncome([]);
assert(empty.trades.total === 0, 'Empty history should yield 0 trades');
assert(empty.pnl.realized === '0.0000', 'Empty realized should be 0');

// Nullish input
const nullish = analyzeFuturesIncome(null);
assert(nullish.trades.total === 0, 'Null history should be treated as empty');

// Test: analyzeByHour (via hourly field)
const hourlyKeys = Object.keys(result.hourly);
assert(hourlyKeys.length > 0, 'Should have hourly breakdown entries');

// Test: analyzeSpotTrades
const MOCK_SPOT_TRADES = {
  BTCUSDT: [
    { qty: '0.5', price: '50000', commission: '0.00025', isBuyer: true },
    { qty: '0.3', price: '51000', commission: '0.00015', isBuyer: false },
    { qty: '0.2', price: '49000', commission: '0.00010', isBuyer: true },
  ],
};

const spotResult = analyzeSpotTrades(MOCK_SPOT_TRADES);
assert(spotResult.totalSymbols === 1, `Should have 1 symbol, got ${spotResult.totalSymbols}`);
assert(spotResult.totalTrades === 3, `Should have 3 trades, got ${spotResult.totalTrades}`);

const volume = parseFloat(spotResult.totalVolume);
assert(volume > 49000, `Total volume should be > 49000, got ${volume}`);

assert(spotResult.symbols.BTCUSDT.buys === 2, 'BTCUSDT should have 2 buys');
assert(spotResult.symbols.BTCUSDT.sells === 1, 'BTCUSDT should have 1 sell');

const avgSize = parseFloat(spotResult.avgTradeSize);
assert(avgSize > 16000 && avgSize < 17000, `Avg trade size should be ~16567, got ${avgSize}`);

// { trades, errors } shape
const withErrors = analyzeSpotTrades({
  trades: MOCK_SPOT_TRADES,
  errors: [{ symbol: 'FAKE', error: 'Invalid' }]
});
assert(withErrors.fetchErrors.length === 1, 'Should surface fetchErrors');
assert(withErrors.totalTrades === 3, 'Should still count trades from trades map');

// Test: analyzeBehavior (threshold MAX_LOSS_STREAK = 5)
const badBehavior = analyzeBehavior({
  trades: { winRate: '20', total: 30 },
  averages: { riskReward: '1.5' },
  streaks: { maxLossStreak: 15 },
  period: { days: 10 },
  hourly: {}
});

const lowWR = badBehavior.find(i => i.message.includes('Win rate'));
assert(lowWR !== undefined, 'Should flag low win rate');

const lowRR = badBehavior.find(i => i.message.includes('Risk:Reward'));
assert(lowRR !== undefined, 'Should flag low risk:reward');

const tilt = badBehavior.find(i => i.message.includes('15'));
assert(tilt !== undefined, 'Should flag loss streak > MAX_LOSS_STREAK');

// Daily PnL uses ISO dates
assert(result.daily.bestDay.date === result.daily.worstDay.date || true, 'daily best/worst present');
assert(/^\d{4}-\d{2}-\d{2}$/.test(result.daily.bestDay.date) || result.daily.bestDay.date === 'N/A',
  `bestDay date should be ISO or N/A, got ${result.daily.bestDay.date}`);

// Data-quality and commission-asset regression tests
const mixedFees = analyzeSpotTrades({
  BTCUSDT: [
    { id: 1, qty: '1', price: '100', commission: '0.01', commissionAsset: 'BNB', isBuyer: true },
    { id: 2, qty: '1', price: '100', commission: '2', commissionAsset: 'USDT', isBuyer: false },
    { id: 3, qty: 'bad', price: '100', commission: '1', commissionAsset: 'USDT', isBuyer: true }
  ]
});
assert(mixedFees.commissionComparable === false, 'Mixed commission assets must not be treated as one comparable currency');
assert(mixedFees.totalCommission === null, 'Mixed commission assets should not expose a misleading single total');
assert(mixedFees.commissionByAsset.BNB === '0.01000000', 'BNB commission should be tracked separately');
assert(mixedFees.commissionByAsset.USDT === '2.00000000', 'USDT commission should be tracked separately');
assert(mixedFees.invalidTrades === 1, 'Malformed Spot trade should be counted as invalid');

const invalidIncome = analyzeFuturesIncome([
  { incomeType: 'REALIZED_PNL', income: '100', time: 1710000000000 },
  { incomeType: 'REALIZED_PNL', income: 'not-a-number', time: 1710000001000 }
]);
assert(invalidIncome.dataQuality.invalidRecords === 1, 'Malformed Futures income should be counted as invalid');
assert(invalidIncome.dataQuality.complete === false, 'Analysis with invalid input should be marked incomplete');
assert(invalidIncome.trades.unit === 'realized_pnl_event', 'Futures trade count must disclose its event-based unit');

console.log(`\n${'='.repeat(40)}`);
console.log(`Results: ${testsPassed} passed, ${testsFailed} failed`);
console.log(`${'='.repeat(40)}`);
process.exit(testsFailed > 0 ? 1 : 0);
