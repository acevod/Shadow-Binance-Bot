const { generateCoachReport } = require('../src/coach.cjs');

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
console.log('Coach regression tests passed');
