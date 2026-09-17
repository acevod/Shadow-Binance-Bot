/**
 * Shadow Binance Bot - Trade Analyzer
 * Analyzes trading history and generates statistics
 */

// Shared behavioral thresholds (kept in sync with coach.cjs)
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
 * Analyze futures income history
 * @param {array} incomeHistory - Array of income events from Binance
 * @returns {object} - Analysis results
 */
function analyzeFuturesIncome(incomeHistory) {
  if (!Array.isArray(incomeHistory)) {
    incomeHistory = [];
  }

  // Filter only realized PnL
  const pnlTrades = incomeHistory.filter(i => i.incomeType === 'REALIZED_PNL');
  const commissions = incomeHistory.filter(i => i.incomeType === 'COMMISSION');
  const fundingFees = incomeHistory.filter(i => i.incomeType === 'FUNDING_FEE');
  const transfers = incomeHistory.filter(i => i.incomeType === 'TRANSFER');

  // Calculate totals
  const totalRealizedPnL = pnlTrades.reduce((sum, i) => sum + parseFloat(i.income), 0);
  const totalCommission = commissions.reduce((sum, i) => sum + parseFloat(i.income), 0);
  const totalFunding = fundingFees.reduce((sum, i) => sum + parseFloat(i.income), 0);
  const totalTransfers = transfers.reduce((sum, i) => sum + parseFloat(i.income), 0);

  // Win/Loss analysis
  const wins = pnlTrades.filter(t => parseFloat(t.income) > 0);
  const losses = pnlTrades.filter(t => parseFloat(t.income) < 0);

  const winCount = wins.length;
  const lossCount = losses.length;
  const totalTrades = winCount + lossCount;
  const winRate = totalTrades > 0 ? (winCount / totalTrades) * 100 : 0;

  // Average win/loss (avgLoss is NEGATIVE when there are losses)
  const avgWin = winCount > 0
    ? wins.reduce((sum, t) => sum + parseFloat(t.income), 0) / winCount
    : 0;
  const avgLoss = lossCount > 0
    ? losses.reduce((sum, t) => sum + parseFloat(t.income), 0) / lossCount
    : 0;

  // Risk:Reward ratio (magnitude)
  const riskReward = avgLoss !== 0 ? Math.abs(avgWin / avgLoss) : 0;

  // Time analysis (by hour UTC)
  const hourlyStats = analyzeByHour(pnlTrades);

  // Streak analysis
  const streakStats = analyzeStreaks(pnlTrades);

  // Daily PnL
  const dailyPnL = analyzeDailyPnL(pnlTrades);

  // Date range
  const dates = incomeHistory.map(i => i.time).filter(t => typeof t === 'number').sort((a, b) => a - b);
  const startDate = dates.length > 0 ? new Date(dates[0]) : null;
  const endDate = dates.length > 0 ? new Date(dates[dates.length - 1]) : null;

  return {
    period: {
      start: startDate ? startDate.toISOString().split('T')[0] : 'N/A',
      end: endDate ? endDate.toISOString().split('T')[0] : 'N/A',
      days: startDate && endDate
        ? Math.max(1, Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)))
        : 0
    },
    trades: {
      total: totalTrades,
      wins: winCount,
      losses: lossCount,
      winRate: winRate.toFixed(1),
      commissions: totalCommission.toFixed(4),
      funding: totalFunding.toFixed(4)
    },
    pnl: {
      realized: totalRealizedPnL.toFixed(4),
      net: (totalRealizedPnL + totalCommission + totalFunding).toFixed(4),
      transfers: totalTransfers.toFixed(4)
    },
    averages: {
      avgWin: avgWin.toFixed(4),
      avgLoss: avgLoss.toFixed(4),
      riskReward: riskReward.toFixed(2)
    },
    streaks: streakStats,
    hourly: hourlyStats,
    daily: dailyPnL
  };
}

/**
 * Analyze trades by hour of day
 * @param {array} pnlTrades - Array of PnL trades (never mutated)
 * @returns {object} - Hourly statistics
 */
function analyzeByHour(pnlTrades) {
  const hourly = {};

  pnlTrades.forEach(trade => {
    const hour = new Date(trade.time).getUTCHours();
    const amount = parseFloat(trade.income);

    if (!hourly[hour]) {
      hourly[hour] = { wins: 0, losses: 0, pnl: 0, total: 0, winRate: 0 };
    }

    hourly[hour].pnl += amount;

    if (amount > 0) hourly[hour].wins++;
    else if (amount < 0) hourly[hour].losses++;
  });

  Object.keys(hourly).forEach(hour => {
    const h = hourly[hour];
    h.total = h.wins + h.losses;
    h.winRate = h.total > 0 ? ((h.wins / h.total) * 100).toFixed(0) : '0';
    h.pnl = h.pnl.toFixed(4);
  });

  return hourly;
}

/**
 * Analyze win/loss streaks
 * @param {array} pnlTrades - Array of PnL trades
 * @returns {object} - Streak statistics
 */
function analyzeStreaks(pnlTrades) {
  const sorted = [...pnlTrades].sort((a, b) => a.time - b.time);

  let maxWinStreak = 0;
  let maxLossStreak = 0;
  let tempWinStreak = 0;
  let tempLossStreak = 0;

  sorted.forEach(trade => {
    const amount = parseFloat(trade.income);
    if (amount > 0) {
      tempWinStreak++;
      tempLossStreak = 0;
      maxWinStreak = Math.max(maxWinStreak, tempWinStreak);
    } else if (amount < 0) {
      tempLossStreak++;
      tempWinStreak = 0;
      maxLossStreak = Math.max(maxLossStreak, tempLossStreak);
    }
  });

  return { maxWinStreak, maxLossStreak };
}

/**
 * Analyze daily PnL (UTC ISO dates for locale independence)
 * @param {array} pnlTrades - Array of PnL trades
 * @returns {object} - Daily statistics
 */
function analyzeDailyPnL(pnlTrades) {
  const daily = {};

  pnlTrades.forEach(trade => {
    const date = new Date(trade.time).toISOString().slice(0, 10); // YYYY-MM-DD UTC
    const amount = parseFloat(trade.income);

    if (!daily[date]) {
      daily[date] = { pnl: 0, trades: 0 };
    }

    daily[date].pnl += amount;
    daily[date].trades++;
  });

  let bestDay = { date: '', pnl: -Infinity };
  let worstDay = { date: '', pnl: Infinity };

  Object.entries(daily).forEach(([date, data]) => {
    if (data.pnl > bestDay.pnl) bestDay = { date, pnl: data.pnl };
    if (data.pnl < worstDay.pnl) worstDay = { date, pnl: data.pnl };
  });

  if (bestDay.date === '') {
    bestDay = { date: 'N/A', pnl: 0 };
    worstDay = { date: 'N/A', pnl: 0 };
  }

  return {
    days: daily,
    bestDay: { date: bestDay.date, pnl: Number(bestDay.pnl).toFixed(4) },
    worstDay: { date: worstDay.date, pnl: Number(worstDay.pnl).toFixed(4) }
  };
}

/**
 * Get trading behavior analysis
 * @param {object} analysis - Full analysis object
 * @returns {object} - Behavior insights
 */
function analyzeBehavior(analysis) {
  const insights = [];

  if (parseFloat(analysis.trades.winRate) < THRESHOLDS.LOW_WIN_RATE) {
    insights.push({
      type: 'warning',
      message: `Win rate is only ${analysis.trades.winRate}%. Aim for ${THRESHOLDS.MIN_WIN_RATE}%+ to be profitable.`
    });
  }

  if (parseFloat(analysis.averages.riskReward) < THRESHOLDS.MIN_RISK_REWARD) {
    insights.push({
      type: 'warning',
      message: `Risk:Reward is only 1:${analysis.averages.riskReward}. Use at least 1:${THRESHOLDS.MIN_RISK_REWARD} to cover losses.`
    });
  }

  if (analysis.streaks.maxLossStreak > THRESHOLDS.MAX_LOSS_STREAK) {
    insights.push({
      type: 'danger',
      message: `Max loss streak of ${analysis.streaks.maxLossStreak} detected! This may indicate revenge trading or tilting.`
    });
  }

  const tradesPerDay = analysis.trades.total / (analysis.period.days || 1);
  if (tradesPerDay > THRESHOLDS.MAX_TRADES_PER_DAY) {
    insights.push({
      type: 'warning',
      message: `You're trading ${tradesPerDay.toFixed(1)} times per day on average. Consider trading less and waiting for better setups.`
    });
  }

  const hourly = analysis.hourly || {};
  const badHours = Object.entries(hourly)
    .filter(([, data]) => parseInt(data.winRate, 10) < THRESHOLDS.MAX_BAD_HOUR_WIN_RATE && data.total > THRESHOLDS.MIN_BAD_HOUR_TRADES)
    .map(([h]) => `${h}:00 UTC`);

  if (badHours.length > 0) {
    insights.push({
      type: 'tip',
      message: `Avoid trading at these hours (low win rate): ${badHours.join(', ')}`
    });
  }

  const goodHours = Object.entries(hourly)
    .filter(([, data]) => parseInt(data.winRate, 10) >= THRESHOLDS.MIN_GOOD_HOUR_WIN_RATE)
    .map(([h, data]) => `${h}:00 UTC (${data.winRate}% win rate)`);

  if (goodHours.length > 0) {
    insights.push({
      type: 'success',
      message: `Your best trading hours (highest win rate): ${goodHours.join(', ')}`
    });
  }

  return insights;
}

/**
 * Analyze Spot trades from multiple symbols
 * @param {object} allTrades - Object with trades grouped by symbol, or { trades, errors }
 * @returns {object} - Spot analysis results
 */
function analyzeSpotTrades(allTrades) {
  const tradesBySymbol = (allTrades && allTrades.trades) ? allTrades.trades : (allTrades || {});

  let totalTrades = 0;
  let totalVolume = 0;
  let totalCommission = 0;
  const symbols = Object.keys(tradesBySymbol);
  const symbolStats = {};

  symbols.forEach(symbol => {
    const trades = tradesBySymbol[symbol];
    if (!trades || trades.length === 0) return;

    let symbolVolume = 0;
    let symbolCommission = 0;
    let buys = 0;
    let sells = 0;

    trades.forEach(trade => {
      const qty = parseFloat(trade.qty) || 0;
      const price = parseFloat(trade.price) || 0;
      const commission = parseFloat(trade.commission) || 0;

      symbolVolume += qty * price;
      symbolCommission += commission;

      if (trade.isBuyer) buys++;
      else sells++;

      totalCommission += commission;
    });

    totalTrades += trades.length;
    totalVolume += symbolVolume;

    symbolStats[symbol] = {
      trades: trades.length,
      volume: symbolVolume.toFixed(2),
      buys,
      sells,
      commission: symbolCommission.toFixed(6)
    };
  });

  const avgTradeSize = totalTrades > 0 ? (totalVolume / totalTrades) : 0;

  return {
    totalSymbols: symbols.length,
    totalTrades,
    totalVolume: totalVolume.toFixed(2),
    avgTradeSize: avgTradeSize.toFixed(2),
    totalCommission: totalCommission.toFixed(6),
    symbols: symbolStats,
    fetchErrors: (allTrades && allTrades.errors) ? allTrades.errors : []
  };
}

module.exports = {
  analyzeFuturesIncome,
  analyzeBehavior,
  analyzeSpotTrades,
  THRESHOLDS
};
