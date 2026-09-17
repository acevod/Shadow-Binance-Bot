/**
 * Shadow Binance Bot - Shadow Strategy Simulator
 * Illustrative alternative-strategy comparisons (heuristic, not live backtests)
 */

/**
 * Simulate improved Risk:Reward strategy (illustrative)
 * @param {object} analysis - Real trading analysis
 * @param {number} targetRR - Target risk:reward ratio
 * @returns {object} - Simulated results
 */
function simulateImprovedRiskReward(analysis, targetRR = 4) {
  const realTrades = analysis.trades.total;
  if (realTrades <= 0) {
    return { strategy: `Improved Risk:Reward (1:${targetRR})`, error: 'No trades to simulate' };
  }

  const realWinRate = parseFloat(analysis.trades.winRate) / 100;
  // avgLoss is stored as NEGATIVE in analyzer.cjs
  const avgLoss = parseFloat(analysis.averages.avgLoss);
  const avgWin = Math.abs(avgLoss) * targetRR;

  const wins = Math.round(realTrades * realWinRate);
  const losses = realTrades - wins;

  const simulatedPnL = (wins * avgWin) + (losses * avgLoss);
  const improvement = simulatedPnL - parseFloat(analysis.pnl.realized);

  return {
    strategy: `Improved Risk:Reward (1:${targetRR})`,
    trades: realTrades,
    wins,
    losses,
    winRate: analysis.trades.winRate,
    avgWin: avgWin.toFixed(4),
    avgLoss: avgLoss.toFixed(4),
    riskReward: targetRR,
    pnl: simulatedPnL.toFixed(4),
    improvement: improvement.toFixed(4),
    description: `[Illustrative] Holding the same win rate but targeting 1:${targetRR} R:R (instead of 1:${analysis.averages.riskReward}) would imply ${improvement > 0 ? '+' : ''}${improvement.toFixed(4)} USDT vs realized. Assumes average loss size stays constant.`
  };
}

/**
 * Simulate selective trading (only good hours) — hindsight illustration
 * @param {object} analysis - Real trading analysis
 * @param {number} minWinRate - Minimum win rate threshold
 * @returns {object} - Simulated results
 */
function simulateSelectiveTrading(analysis, minWinRate = 50) {
  const hourly = analysis.hourly || {};

  const goodHours = Object.entries(hourly)
    .filter(([, data]) => parseInt(data.winRate, 10) >= minWinRate)
    .map(([hour, data]) => ({
      hour: parseInt(hour, 10),
      winRate: parseInt(data.winRate, 10),
      pnl: parseFloat(data.pnl),
      total: data.total
    }));

  if (goodHours.length === 0) {
    return {
      strategy: 'Selective Trading',
      error: 'Not enough data to simulate'
    };
  }

  const goodHourPnL = goodHours.reduce((sum, h) => sum + h.pnl, 0);
  const goodHourTrades = goodHours.reduce((sum, h) => sum + h.total, 0);

  const realPnL = parseFloat(analysis.pnl.realized);
  const improvement = goodHourPnL - realPnL;

  return {
    strategy: `Selective Trading (${minWinRate}%+ win rate hours)`,
    goodHours: goodHours.map(h => `${h.hour}:00 UTC (${h.winRate}% WR)`),
    simulatedTrades: goodHourTrades,
    simulatedPnL: goodHourPnL.toFixed(4),
    realPnL: realPnL.toFixed(4),
    improvement: improvement.toFixed(4),
    description: `[Illustrative / hindsight] Summing only hours that already had ${minWinRate}%+ win rate yields ${improvement > 0 ? '+' : ''}${improvement.toFixed(4)} USDT vs all hours. This is selection bias, not a guaranteed future edge.`
  };
}

/**
 * Simulate reduced trading frequency (illustrative)
 * @param {object} analysis - Real trading analysis
 * @param {number} reductionPercent - How much to reduce trades by (0-100)
 * @returns {object} - Simulated results
 */
function simulateReducedTrading(analysis, reductionPercent = 50) {
  const realTrades = analysis.trades.total;
  if (realTrades <= 0) {
    return {
      strategy: `Reduced Trading (-${reductionPercent}% trades)`,
      error: 'No trades to simulate'
    };
  }

  const reducedTrades = Math.round(realTrades * (1 - reductionPercent / 100));
  const realWinRate = parseFloat(analysis.trades.winRate) / 100;
  const avgWin = parseFloat(analysis.averages.avgWin);
  const avgLoss = parseFloat(analysis.averages.avgLoss); // negative in production

  const wins = Math.round(reducedTrades * realWinRate);
  const losses = reducedTrades - wins;
  const simulatedPnL = (wins * avgWin) + (losses * avgLoss);

  const realCommission = parseFloat(analysis.trades.commissions) || 0;
  const reducedCommission = realCommission * (1 - reductionPercent / 100);
  const commissionSavings = realCommission - reducedCommission;

  const totalImprovement = (simulatedPnL - parseFloat(analysis.pnl.realized)) + commissionSavings;

  return {
    strategy: `Reduced Trading (-${reductionPercent}% trades)`,
    originalTrades: realTrades,
    simulatedTrades: reducedTrades,
    reduction: `${reductionPercent}%`,
    originalPnL: analysis.pnl.realized,
    simulatedPnL: simulatedPnL.toFixed(4),
    commissionSavings: commissionSavings.toFixed(4),
    improvement: totalImprovement.toFixed(4),
    description: `[Illustrative] If trade count were ${reductionPercent}% lower (${reducedTrades} vs ${realTrades}) with the same average win/loss, implied difference is ${totalImprovement > 0 ? '+' : ''}${totalImprovement.toFixed(4)} USDT (includes proportional fee savings).`
  };
}

/**
 * Simulate DCA strategy (illustrative heuristic)
 * @param {object} analysis - Real trading analysis
 * @returns {object} - Simulated results
 */
function simulateDCA(analysis) {
  const realTrades = analysis.trades.total;
  if (realTrades <= 0) {
    return { strategy: 'DCA (Dollar Cost Averaging)', error: 'No trades to simulate' };
  }

  const realWinRate = parseFloat(analysis.trades.winRate) / 100;
  const avgWin = parseFloat(analysis.averages.avgWin);
  const avgLoss = parseFloat(analysis.averages.avgLoss);

  // Heuristic assumptions only — not a calibrated model
  const dcaWinRate = Math.min(realWinRate + 0.15, 0.7);
  const wins = Math.round(realTrades * dcaWinRate);
  const losses = realTrades - wins;

  const improvedAvgLoss = avgLoss * 0.8; // smaller magnitude if avgLoss negative
  const improvedAvgWin = avgWin * 1.1;

  const simulatedPnL = (wins * improvedAvgWin) + (losses * improvedAvgLoss);
  const improvement = simulatedPnL - parseFloat(analysis.pnl.realized);

  return {
    strategy: 'DCA (Dollar Cost Averaging)',
    originalWinRate: `${(realWinRate * 100).toFixed(0)}%`,
    simulatedWinRate: `${(dcaWinRate * 100).toFixed(0)}%`,
    improvement: 'Assumed: win rate +15pp (cap 70%), loss size -20%, win size +10%',
    pnl: simulatedPnL.toFixed(4),
    improvementPnL: improvement.toFixed(4),
    description: `[Illustrative] Under assumed DCA effects (win rate → ${(dcaWinRate * 100).toFixed(0)}%, smaller avg loss), implied difference is ${improvement > 0 ? '+' : ''}${improvement.toFixed(4)} USDT. These assumptions are not validated on your data.`
  };
}

/**
 * Generate comprehensive shadow comparison
 * @param {object} analysis - Real trading analysis
 * @returns {object} - All simulations
 */
function generateShadowComparison(analysis) {
  return {
    original: {
      pnl: parseFloat(analysis.pnl.realized),
      winRate: parseFloat(analysis.trades.winRate),
      riskReward: parseFloat(analysis.averages.riskReward),
      totalTrades: analysis.trades.total
    },
    strategies: [
      simulateImprovedRiskReward(analysis, 4),
      simulateSelectiveTrading(analysis, 50),
      simulateReducedTrading(analysis, 50),
      simulateDCA(analysis)
    ],
    disclaimer: 'Shadow results are illustrative heuristics under stated assumptions, not historical backtests or guarantees of future performance.'
  };
}

/**
 * Generate Spot shadow comparison
 * @param {object} spotAnalysis - Spot analysis results
 * @returns {object} - Spot shadow strategies
 */
function generateSpotShadowComparison(spotAnalysis) {
  return {
    original: {
      totalTrades: spotAnalysis.totalTrades,
      totalVolume: parseFloat(spotAnalysis.totalVolume),
      totalSymbols: spotAnalysis.totalSymbols
    },
    strategies: [
      simulateSpotDCA(spotAnalysis),
      simulateSpotHold(spotAnalysis)
    ],
    disclaimer: 'Spot shadow strategies are qualitative illustrations only; they do not compute realized PnL.'
  };
}

/**
 * Simulate DCA strategy for Spot (qualitative)
 */
function simulateSpotDCA(spotAnalysis) {
  if (spotAnalysis.totalTrades === 0) {
    return { strategy: 'DCA Strategy', error: 'No trades to simulate' };
  }

  const baseVolume = parseFloat(spotAnalysis.totalVolume) || (spotAnalysis.totalTrades * 1000);
  const improvedVolume = baseVolume * 1.15;

  return {
    strategy: 'Dollar Cost Averaging (DCA)',
    originalVolume: spotAnalysis.totalVolume || String(spotAnalysis.totalTrades * 1000),
    simulatedVolume: improvedVolume.toFixed(2),
    improvement: 'Better average entry price (qualitative)',
    description: '[Illustrative] Splitting purchases across multiple prices can lower average entry cost. No PnL is computed here.'
  };
}

/**
 * Simulate Hold strategy for Spot (qualitative)
 */
function simulateSpotHold(spotAnalysis) {
  if (spotAnalysis.totalTrades === 0) {
    return { strategy: 'Hold Strategy', error: 'No trades to simulate' };
  }

  const activeTrades = spotAnalysis.totalTrades;
  const holdingTrades = Math.max(1, Math.ceil(activeTrades * 0.2));

  return {
    strategy: 'Buy and Hold',
    originalTrades: activeTrades,
    simulatedTrades: holdingTrades,
    reduction: `${Math.round((1 - holdingTrades / activeTrades) * 100)}%`,
    improvement: 'Fewer fees, less emotional trading (qualitative)',
    description: `[Illustrative] Instead of ${activeTrades} trades, focusing on ${holdingTrades} higher-conviction trades per period may reduce fees and noise. No PnL is computed here.`
  };
}

module.exports = {
  simulateImprovedRiskReward,
  simulateSelectiveTrading,
  simulateReducedTrading,
  simulateDCA,
  generateShadowComparison,
  generateSpotShadowComparison,
  simulateSpotDCA,
  simulateSpotHold
};
