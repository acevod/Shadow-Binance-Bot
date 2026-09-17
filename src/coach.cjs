/**
 * Shadow Binance Bot - AI Trading Coach
 * Generates personalized coaching feedback based on analysis
 */

// Keep in sync with analyzer.cjs THRESHOLDS
const THRESHOLDS = {
  MIN_WIN_RATE: 40,
  LOW_WIN_RATE: 30,
  MIN_RISK_REWARD: 3,
  MAX_LOSS_STREAK: 5,
  MAX_TRADES_PER_DAY: 3,
  MIN_GOOD_HOUR_WIN_RATE: 60,
  MAX_BAD_HOUR_WIN_RATE: 30,
  MIN_BAD_HOUR_TRADES: 3
};

/**
 * Generate coaching report based on analysis
 * @param {object} analysis - Trading analysis results
 * @param {object} shadowComparison - Shadow strategy simulations
 * @returns {object} - Full coaching report
 */
function generateCoachReport(analysis, shadowComparison) {
  return {
    summary: generateSummary(analysis),
    problems: identifyProblems(analysis),
    recommendations: generateRecommendations(analysis, shadowComparison),
    actionPlan: generateActionPlan(analysis),
    motivation: getMotivation(analysis),
    fetchErrors: analysis.fetchErrors || [],
    dataQuality: analysis.dataQuality || null,
    disclaimer: (shadowComparison && shadowComparison.disclaimer) ||
      'Shadow results are illustrative heuristics, not guarantees of future performance.'
  };
}

/**
 * Generate summary of trading performance
 */
function generateSummary(analysis) {
  const netPnL = parseFloat(analysis.pnl.net);
  const winRate = parseFloat(analysis.trades.winRate);
  const totalTrades = analysis.trades.total;
  const period = analysis.period;

  let verdict;
  if (netPnL > 0) verdict = 'POSITIVE NET PnL';
  else if (netPnL > -5) verdict = 'NEAR BREAK-EVEN';
  else verdict = 'NEGATIVE NET PnL';

  return {
    period: `${period.start} to ${period.end} (${period.days} days)`,
    totalTrades,
    winRate: `${winRate}%`,
    netPnL: `${netPnL} USDT`,
    verdict,
    commission: `${analysis.trades.commissions} USDT in fees`
  };
}

/**
 * Identify key problems in trading behavior
 */
function identifyProblems(analysis) {
  const problems = [];
  const winRate = parseFloat(analysis.trades.winRate);
  const riskReward = parseFloat(analysis.averages.riskReward);
  const maxLossStreak = analysis.streaks.maxLossStreak;
  const hourly = analysis.hourly || {};

  if (winRate < THRESHOLDS.LOW_WIN_RATE) {
    problems.push({
      severity: 'high',
      title: 'Low Win Rate',
      description: `Your win rate is only ${winRate}%. Win rate is only one part of expectancy; average win/loss, fees, funding, and trade selection also matter.`
    });
  }

  if (riskReward < THRESHOLDS.MIN_RISK_REWARD) {
    problems.push({
      severity: 'high',
      title: 'Poor Risk:Reward',
      description: `You're using 1:${riskReward} risk:reward. You need at least 1:${THRESHOLDS.MIN_RISK_REWARD} to cover your losses.`
    });
  }

  if (maxLossStreak > THRESHOLDS.MAX_LOSS_STREAK) {
    problems.push({
      severity: 'high',
      title: 'Loss Streak Problem',
      description: `You had a streak of ${maxLossStreak} consecutive losses. This may indicate emotional trading or revenge trading.`
    });
  }

  const badHours = Object.entries(hourly)
    .filter(([, data]) => parseInt(data.winRate, 10) < THRESHOLDS.MAX_BAD_HOUR_WIN_RATE && data.total > THRESHOLDS.MIN_BAD_HOUR_TRADES)
    .map(([h]) => h);

  if (badHours.length > 0) {
    problems.push({
      severity: 'medium',
      title: 'Avoid These Trading Hours',
      description: `Your win rate is very low (under ${THRESHOLDS.MAX_BAD_HOUR_WIN_RATE}%) at: ${badHours.map(h => `${h}:00 UTC`).join(', ')}`
    });
  }

  return problems;
}

/**
 * Generate personalized recommendations
 */
function generateRecommendations(analysis, shadowComparison) {
  const recommendations = [];
  const strategies = (shadowComparison && shadowComparison.strategies) || [];

  // Shadow strategies are heuristic/hindsight scenarios, not validated backtests.
  // Do not rank them by the largest illustrative number.
  const scenarios = strategies.filter(s => !s.error).slice(0, 4);
  scenarios.forEach((scenario, index) => {
    const improvement = scenario.improvementPnL !== undefined
      ? scenario.improvementPnL
      : scenario.improvement;
    recommendations.push({
      priority: index + 1,
      title: `Scenario: ${scenario.strategy}`,
      description: scenario.description,
      potentialGain: typeof improvement === 'string' && /^[-+]?\d/.test(improvement)
        ? `${improvement} USDT (illustrative; not a forecast)`
        : undefined,
      evidenceType: scenario.type || 'heuristic_scenario'
    });
  });

  if (parseFloat(analysis.averages.riskReward) < THRESHOLDS.MIN_RISK_REWARD) {
    recommendations.push({
      priority: recommendations.length + 1,
      title: 'Review Risk:Reward',
      description: 'Your observed average win/loss ratio is below the configured heuristic threshold. Evaluate position sizing, stop placement, target placement, fees, and actual expectancy together.',
      action: 'Measure expectancy before changing trade rules'
    });
  }

  const goodHours = Object.entries(analysis.hourly || {})
    .filter(([, data]) => parseInt(data.winRate, 10) >= THRESHOLDS.MIN_GOOD_HOUR_WIN_RATE && data.total >= THRESHOLDS.MIN_BAD_HOUR_TRADES)
    .map(([h]) => h);

  if (goodHours.length > 0) {
    recommendations.push({
      priority: recommendations.length + 1,
      title: 'Review Strong Hours',
      description: `Your historical win rate is higher at: ${goodHours.map(h => `${h}:00 UTC`).join(', ')}. This is historical correlation, not proof of a future edge.`,
      action: 'Validate with a separate out-of-sample period'
    });
  }

  if (analysis.streaks.maxLossStreak > THRESHOLDS.MAX_LOSS_STREAK) {
    recommendations.push({
      priority: recommendations.length + 1,
      title: 'Review Loss Streaks',
      description: `A maximum streak of ${analysis.streaks.maxLossStreak} consecutive negative realized-PnL events was observed. The data alone cannot establish the cause.`,
      action: 'Review journal/context around the streak'
    });
  }

  return recommendations;
}
/**
 * Generate structured action plan
 */
function generateActionPlan(analysis) {
  return [
    {
      phase: 'IMMEDIATE (This Week)',
      steps: [
        'Set stop loss BEFORE entering any trade',
        'Use a documented risk/reward rule and validate its expectancy',
        'Check UTC time before trading - only trade at good hours'
      ]
    },
    {
      phase: 'SHORT-TERM (This Month)',
      steps: [
        'Implement 3-loss rule - stop after 3 losses per day',
        'Reduce trading frequency by 50%',
        'Practice on demo account while tracking expectancy and drawdown'
      ]
    },
    {
      phase: 'LONG-TERM (This Quarter)',
      steps: [
        'Build trading journal to track decisions',
        'Study support/resistance and candlestick patterns',
        'Aim for a positive, repeatable expectancy rather than a fixed win-rate target'
      ]
    }
  ];
}

/**
 * Get motivational message based on performance
 */
function getMotivation(analysis) {
  const netPnL = parseFloat(analysis.pnl.net);

  if (netPnL > 0) {
    return "Positive net PnL is one signal; keep validating the underlying process, costs, and consistency.";
  } else if (netPnL > -5) {
    return "You've identified your problems - now it's about discipline. You can do this!";
  } else {
    return "Everyone loses at first. The key is learning from your mistakes. You've got this!";
  }
}

/**
 * Format full coach report for console display
 */
function formatReport(report) {
  let output = '';

  output += '============================================\n';
  output += '    SHADOW TRADING COACH REPORT             \n';
  output += '============================================\n\n';

  output += 'SUMMARY\n';
  output += '--------------------------------------------\n';
  output += `Period: ${report.summary.period}\n`;
  output += `Trades: ${report.summary.totalTrades}\n`;
  output += `Win Rate: ${report.summary.winRate}\n`;
  output += `Net PnL: ${report.summary.netPnL}\n`;
  output += `Verdict: ${report.summary.verdict}\n\n`;

  if (report.problems.length > 0) {
    output += 'PROBLEMS IDENTIFIED\n';
    output += '--------------------------------------------\n';
    report.problems.forEach((p, i) => {
      output += `${i + 1}. ${p.title}\n   ${p.description}\n\n`;
    });
  }

  if (report.recommendations.length > 0) {
    output += 'RECOMMENDATIONS\n';
    output += '--------------------------------------------\n';
    report.recommendations.forEach((r, i) => {
      output += `${i + 1}. [Priority ${r.priority}] ${r.title}\n`;
      output += `   ${r.description}\n`;
      if (r.action) output += `   Action: ${r.action}\n`;
      if (r.potentialGain) output += `   Potential: ${r.potentialGain}\n`;
      output += '\n';
    });
  }

  output += 'ACTION PLAN\n';
  output += '--------------------------------------------\n';
  report.actionPlan.forEach(phase => {
    output += `\n${phase.phase}:\n`;
    phase.steps.forEach(step => {
      output += `  - ${step}\n`;
    });
  });
  output += '\n';

  if (report.disclaimer) {
    output += 'NOTE\n';
    output += '--------------------------------------------\n';
    output += `${report.disclaimer}\n\n`;
  }

  output += '============================================\n';
  output += `${report.motivation}\n`;
  output += '============================================\n';

  return output;
}

/**
 * Generate coaching report for Spot trading
 */
function generateSpotCoachReport(spotAnalysis) {
  return {
    summary: generateSpotSummary(spotAnalysis),
    insights: generateSpotInsights(spotAnalysis),
    recommendations: generateSpotRecommendations(spotAnalysis),
    fetchErrors: spotAnalysis.fetchErrors || []
  };
}

function generateSpotSummary(spotAnalysis) {
  return {
    totalTrades: spotAnalysis.totalTrades,
    totalSymbols: spotAnalysis.totalSymbols,
    totalVolume: spotAnalysis.totalVolume,
    avgTradeSize: spotAnalysis.avgTradeSize,
    commission: spotAnalysis.totalCommission,
    commissionByAsset: spotAnalysis.commissionByAsset || {},
    commissionComparable: spotAnalysis.commissionComparable !== false,
    complete: spotAnalysis.complete !== false
  };
}

function generateSpotInsights(spotAnalysis) {
  const insights = [];

  if (spotAnalysis.totalTrades === 0) {
    insights.push({
      type: 'info',
      message: 'No Spot trades found. Start trading on Spot to see analysis!'
    });
    return insights;
  }

  if (spotAnalysis.totalSymbols < 3) {
    insights.push({
      type: 'tip',
      message: `You're only trading ${spotAnalysis.totalSymbols} symbol(s). Consider diversifying across more coins to reduce risk.`
    });
  }

  const avgSize = parseFloat(spotAnalysis.avgTradeSize);
  if (avgSize > 100) {
    insights.push({
      type: 'warning',
      message: `Your average Spot trade is $${avgSize.toFixed(2)} - quite large! Consider position sizing.`
    });
  } else if (avgSize < 10) {
    insights.push({
      type: 'tip',
      message: `Your average Spot trade is $${avgSize.toFixed(2)} - good for learning with small amounts!`
    });
  }

  if (spotAnalysis.totalTrades > 100) {
    insights.push({
      type: 'warning',
      message: `You've made ${spotAnalysis.totalTrades} Spot trades. Make sure to consider fees!`
    });
  }

  const symbols = spotAnalysis.symbols || {};
  let mostTraded = { symbol: '', trades: 0 };
  Object.entries(symbols).forEach(([symbol, stats]) => {
    if (stats.trades > mostTraded.trades) {
      mostTraded = { symbol, trades: stats.trades };
    }
  });

  if (mostTraded.symbol) {
    insights.push({
      type: 'info',
      message: `Most traded: ${mostTraded.symbol} (${mostTraded.trades} trades)`
    });
  }

  Object.entries(symbols).forEach(([symbol, stats]) => {
    if (stats.buys > 0 && stats.sells > 0) {
      const buyRatio = (stats.buys / (stats.buys + stats.sells) * 100).toFixed(0);
      if (buyRatio > 70) {
        insights.push({
          type: 'tip',
          message: `${symbol}: You're mostly buying (${buyRatio}% buys). Consider taking profits!`
        });
      } else if (buyRatio < 30) {
        insights.push({
          type: 'tip',
          message: `${symbol}: You're mostly selling (${100 - buyRatio}% sells). Consider buying the dip!`
        });
      }
    }
  });

  return insights;
}

function generateSpotRecommendations(spotAnalysis) {
  const recommendations = [];

  if (spotAnalysis.totalTrades === 0) {
    recommendations.push({
      priority: 1,
      title: 'Start Trading on Spot',
      description: 'Make some Spot trades to see personalized analysis!'
    });
    return recommendations;
  }

  if (spotAnalysis.totalSymbols < 3) {
    recommendations.push({
      priority: 2,
      title: 'Diversify Your Portfolio',
      description: 'Consider trading more than one coin to spread risk.'
    });
  }

  const avgSize = parseFloat(spotAnalysis.avgTradeSize);
  if (avgSize > 100) {
    recommendations.push({
      priority: 2,
      title: 'Reduce Position Size',
      description: `$${avgSize.toFixed(2)} per trade is high. Try smaller amounts while learning!`
    });
  }

  const commission = parseFloat(spotAnalysis.totalCommission);
  if (commission > 10) {
    recommendations.push({
      priority: 3,
      title: 'Watch Your Fees',
      description: `You've paid $${commission.toFixed(2)} in fees. Consider trading less frequently!`
    });
  }

  return recommendations;
}

/**
 * Format Spot report for console display
 */
function formatSpotReport(report) {
  let output = '';

  output += '============================================\n';
  output += '       SPOT COACHING REPORT                \n';
  output += '============================================\n\n';

  output += 'SPOT SUMMARY\n';
  output += '--------------------------------------------\n';
  output += `Total Trades: ${report.summary.totalTrades}\n`;
  output += `Symbols: ${report.summary.totalSymbols}\n`;
  output += `Volume: $${report.summary.totalVolume} USDT\n`;
  output += `Avg Trade: $${report.summary.avgTradeSize} USDT\n`;
  if (report.summary.commissionComparable) {
    output += `Fees Paid: ${report.summary.commission}\n\n`;
  } else {
    const breakdown = Object.entries(report.summary.commissionByAsset || {})
      .map(([asset, amount]) => `${amount} ${asset}`)
      .join(', ');
    output += `Fees Paid: ${breakdown || 'N/A'} (paid in multiple assets, not summed)\n\n`;
  }

  if (report.fetchErrors && report.fetchErrors.length > 0) {
    output += 'FETCH WARNINGS\n';
    output += '--------------------------------------------\n';
    report.fetchErrors.forEach(e => {
      output += `  ! ${e.symbol}: ${e.error}\n`;
    });
    output += '\n';
  }

  if (report.insights.length > 0) {
    output += 'INSIGHTS\n';
    output += '--------------------------------------------\n';
    report.insights.forEach((insight) => {
      const prefix = insight.type === 'warning' ? '!' : insight.type === 'tip' ? '+' : 'i';
      output += `[${prefix}] ${insight.message}\n\n`;
    });
  }

  if (report.recommendations.length > 0) {
    output += 'RECOMMENDATIONS\n';
    output += '--------------------------------------------\n';
    report.recommendations.forEach((rec, i) => {
      output += `${i + 1}. [Priority ${rec.priority}] ${rec.title}\n   ${rec.description}\n\n`;
    });
  }

  output += '============================================\n';

  return output;
}

module.exports = {
  generateCoachReport,
  formatReport,
  generateSpotCoachReport,
  formatSpotReport,
  THRESHOLDS
};
