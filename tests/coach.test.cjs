const { generateCoachReport, identifyProblems } = require('../src/coach.cjs');

const analysis = {
  period: { start: '2026-01-01', end: '2026-01-10', days: 9 },
  trades: { total: 10, winRate: '40.0', commissions: '-2.0000' },
  pnl: { net: '-5.0000', realized: '-3.0000' },
  averages: { riskReward: '1.5' },
  streaks: { maxLossStreak: 2 },
  hourly: {},
  fetchErrors: [{ symbol: 'ETHUSDT', error: 'timeout' }],
  dataQuality: { complete: false, invalidRecords: 0 }
};

const shadow = {
  strategies: [
    { type: 'heuristic_scenario', strategy: 'Scenario A', improvementPnL: '100.0000', description: '[Illustrative] A' },
    { type: 'heuristic_scenario', strategy: 'Scenario B', improvementPnL: '1000.0000', description: '[Illustrative] B' }
  ],
  disclaimer: 'Illustrative only'
};

const report = generateCoachReport(analysis, shadow);
if (!report.fetchErrors || report.fetchErrors.length !== 1) throw new Error('Coach report must expose fetch errors');
if (!report.dataQuality || report.dataQuality.complete !== false) throw new Error('Coach report must expose data quality');
if (report.recommendations.length < 2) throw new Error('Expected both scenarios to remain visible');
if (report.recommendations[0].title === 'Consider: Scenario B') throw new Error('Coach must not rank the largest illustrative scenario as the best strategy');

// identifyProblems: win rate / risk:reward / loss streak
// (this coverage replaces the deleted analyzer.analyzeBehavior(), which was
// fully redundant with identifyProblems + generateRecommendations)
const badProblems = identifyProblems({
  trades: { winRate: '20', total: 30 },
  averages: { riskReward: '1.5' },
  streaks: { maxLossStreak: 15 },
  period: { days: 10 },
  hourly: {}
});
if (!badProblems.some(p => p.title === 'Low Win Rate')) throw new Error('Should flag low win rate');
if (!badProblems.some(p => p.title === 'Poor Risk:Reward')) throw new Error('Should flag poor risk:reward');
if (!badProblems.some(p => p.title === 'Loss Streak Problem')) throw new Error('Should flag loss streak > MAX_LOSS_STREAK');

// identifyProblems: overtrading (the one check analyzeBehavior had that
// nothing else covered — now wired into identifyProblems instead of lost)
const overtrading = identifyProblems({
  trades: { winRate: '80', total: 40 },
  averages: { riskReward: '5' },
  streaks: { maxLossStreak: 1 },
  period: { days: 10 }, // 4 trades/day > MAX_TRADES_PER_DAY (3)
  hourly: {}
});
if (!overtrading.some(p => p.title === 'Overtrading')) throw new Error('Should flag overtrading when trades/day exceeds threshold');

const notOvertrading = identifyProblems({
  trades: { winRate: '80', total: 20 },
  averages: { riskReward: '5' },
  streaks: { maxLossStreak: 1 },
  period: { days: 10 }, // 2 trades/day, under threshold
  hourly: {}
});
if (notOvertrading.some(p => p.title === 'Overtrading')) throw new Error('Should not flag overtrading when trades/day is under threshold');

console.log('Coach regression tests passed');
