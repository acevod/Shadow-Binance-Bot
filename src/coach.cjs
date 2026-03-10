/**
 * Shadow Binance Bot - AI Trading Coach
 * Generates personalized coaching feedback based on analysis
 */

/**
 * Generate coaching report based on analysis
 * @param {object} analysis - Trading analysis results
 * @param {object} shadowComparison - Shadow strategy simulations
 * @returns {object} - Full coaching report
 */
function generateCoachReport(analysis, shadowComparison) {
  const report = {
    summary: generateSummary(analysis),
    problems: identifyProblems(analysis),
    recommendations: generateRecommendations(analysis, shadowComparison),
    actionPlan: generateActionPlan(analysis),
    motivation: getMotivation(analysis)
  };

  return report;
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
  if (netPnL > 0) verdict = 'PROFITABLE ✅';
  else if (netPnL > -5) verdict = 'NEAR BREAK-EVEN ⚠️';
  else verdict = 'NEEDS IMPROVEMENT 🔴';

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
 * Identify key problems
 */
function identifyProblems(analysis) {
  const problems = [];
  const winRate = parseFloat(analysis.trades.winRate);
  const riskReward = parseFloat(analysis.averages.riskReward);
  const maxLossStreak = analysis.streaks.maxLossStreak;
  const hourly = analysis.hourly;

  if (winRate < 30) {
    problems.push({
      severity: 'high',
      title: 'Low Win Rate',
      description: `Your win rate is only ${winRate}%. At this rate, you need excellent risk:reward to be profitable.`
    });
  }

  if (riskReward < 3) {
    problems.push({
      severity: 'high',
      title: 'Poor Risk:Reward',
      description: `You're using 1:${riskReward} risk:reward. You need at least 1:3 to cover your losses.`
    });
  }

  if (maxLossStreak > 5) {
    problems.push({
      severity: 'high',
      title: 'Loss Streak Problem',
      description: `You had a streak of ${maxLossStreak} consecutive losses. This indicates emotional trading or revenge trading.`
    });
  }

  // Find bad hours
  const badHours = Object.entries(hourly)
    .filter(([h, data]) => data.winRate < 30 && data.total > 3)
    .map(([h]) => h);

  if (badHours.length > 0) {
    problems.push({
      severity: 'medium',
      title: 'Avoid These Trading Hours',
      description: `Your win rate is very low (under 30%) at: ${badHours.map(h => `${h}:00 UTC`).join(', ')}`
    });
  }

  return problems;
}

/**
 * Generate recommendations
 */
function generateRecommendations(analysis, shadowComparison) {
  const recommendations = [];
  const strategies = shadowComparison.strategies;

  // Best improvement strategy
  let bestStrategy = null;
  let bestImprovement = -Infinity;

  strategies.forEach(s => {
    if (s.improvement && parseFloat(s.improvement) > bestImprovement) {
      bestImprovement = parseFloat(s.improvement);
      bestStrategy = s;
    }
  });

  if (bestStrategy) {
    recommendations.push({
      priority: 1,
      title: `Try: ${bestStrategy.strategy}`,
      description: bestStrategy.description,
      potentialGain: `+${bestStrategy.improvement} USDT`
    });
  }

  // Risk:Reward recommendation
  if (parseFloat(analysis.averages.riskReward) < 3) {
    recommendations.push({
      priority: 2,
      title: 'Fix Your Risk:Reward',
      description: 'Set your stop loss to 10 points and take profit to 30+ points (1:3 minimum). This is the quickest way to improve.',
      action: 'Use OCO orders with proper ratios'
    });
  }

  // Time-based recommendation
  const goodHours = Object.entries(analysis.hourly)
    .filter(([h, data]) => data.winRate >= 60)
    .map(([h]) => h);

  if (goodHours.length > 0) {
    recommendations.push({
      priority: 3,
      title: 'Trade During Your Best Hours',
      description: `Your win rate is highest at: ${goodHours.map(h => `${h}:00 UTC`).join(', ')}`,
      action: 'Set trading hours to these times only'
    });
  }

  // Streak prevention
  if (analysis.streaks.maxLossStreak > 3) {
    recommendations.push({
      priority: 4,
      title: 'Implement 3-Strike Rule',
      description: 'Stop trading after 3 consecutive losses. Take a break. Come back tomorrow.',
      action: 'Set a reminder or use a trading journal'
    });
  }

  return recommendations;
}

/**
 * Generate action plan
 */
function generateActionPlan(analysis) {
  return [
    {
      phase: 'IMMEDIATE (This Week)',
      steps: [
        'Set stop loss BEFORE entering any trade',
        'Use 1:3 minimum risk:reward',
        'Check UTC time before trading - only trade at good hours'
      ]
    },
    {
      phase: 'SHORT-TERM (This Month)',
      steps: [
        'Implement 3-loss rule - stop after 3 losses per day',
        'Reduce trading frequency by 50%',
        'Practice on demo account until 50% win rate'
      ]
    },
    {
      phase: 'LONG-TERM (This Quarter)',
      steps: [
        'Build trading journal to track decisions',
        'Study support/resistance and candlestick patterns',
        'Aim for 40%+ win rate consistently'
      ]
    }
  ];
}

/**
 * Get motivational message
 */
function getMotivation(analysis) {
  const netPnL = parseFloat(analysis.pnl.net);
  
  if (netPnL > 0) {
    return "You're doing great! Keep improving your discipline and you'll be profitable in no time.";
  } else if (netPnL > -10) {
    return "You've identified your problems - now it's just about discipline. You can do this!";
  } else {
    return "Everyone loses at first. The key is learning from your mistakes. You've got this!";
  }
}

/**
 * Format report for display
 */
function formatReport(report) {
  let output = '';
  
  output += '═══════════════════════════════════════\n';
  output += '    SHADOW TRADING COACH REPORT       \n';
  output += '═══════════════════════════════════════\n\n';
  
  // Summary
  output += '📊 SUMMARY\n';
  output += '───────────────────────────────────────\n';
  output += `Period: ${report.summary.period}\n`;
  output += `Trades: ${report.summary.totalTrades}\n`;
  output += `Win Rate: ${report.summary.winRate}\n`;
  output += `Net PnL: ${report.summary.netPnL}\n`;
  output += `Verdict: ${report.summary.verdict}\n\n`;
  
  // Problems
  if (report.problems.length > 0) {
    output += '⚠️ PROBLEMS IDENTIFIED\n';
    output += '───────────────────────────────────────\n';
    report.problems.forEach((p, i) => {
      output += `${i + 1}. ${p.title}\n`;
      output += `   ${p.description}\n\n`;
    });
  }
  
  // Recommendations
  if (report.recommendations.length > 0) {
    output += '💡 RECOMMENDATIONS\n';
    output += '───────────────────────────────────────\n';
    report.recommendations.forEach((r, i) => {
      output += `${i + 1}. [Priority ${r.priority}] ${r.title}\n`;
      output += `   ${r.description}\n`;
      if (r.action) output += `   Action: ${r.action}\n`;
      if (r.potentialGain) output += `   Potential: ${r.potentialGain}\n`;
      output += '\n';
    });
  }
  
  // Action Plan
  output += '📋 ACTION PLAN\n';
  output += '───────────────────────────────────────\n';
  report.actionPlan.forEach(phase => {
    output += `\n${phase.phase}:\n`;
    phase.steps.forEach(step => {
      output += `  ✓ ${step}\n`;
    });
  });
  output += '\n';
  
  // Motivation
  output += '═══════════════════════════════════════\n';
  output += `💕 ${report.motivation}\n`;
  output += '═══════════════════════════════════════\n';
  
  return output;
}

module.exports = {
  generateCoachReport,
  formatReport
};
