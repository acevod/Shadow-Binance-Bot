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
  if (!Array.isArray(incomeHistory)) incomeHistory = [];

  const invalidRecords = [];
  const valid = incomeHistory.filter((row, index) => {
    const time = Number(row && row.time);
    const income = Number(row && row.income);
    if (!row || !Number.isFinite(time) || !Number.isFinite(income) || !row.incomeType) {
      invalidRecords.push(index);
      return false;
    }
    return true;
  });

  const pnlTrades = valid.filter(i => i.incomeType === 'REALIZED_PNL');
  const commissions = valid.filter(i => i.incomeType === 'COMMISSION');
  const fundingFees = valid.filter(i => i.incomeType === 'FUNDING_FEE');
  const transfers = valid.filter(i => i.incomeType === 'TRANSFER');

  const sumIncome = rows => rows.reduce((sum, i) => sum + Number(i.income), 0);
  const totalRealizedPnL = sumIncome(pnlTrades);
  const totalCommission = sumIncome(commissions);
  const totalFunding = sumIncome(fundingFees);
  const totalTransfers = sumIncome(transfers);

  const wins = pnlTrades.filter(t => Number(t.income) > 0);
  const losses = pnlTrades.filter(t => Number(t.income) < 0);
  const winCount = wins.length;
  const lossCount = losses.length;
  const totalTrades = winCount + lossCount;
  const winRate = totalTrades > 0 ? (winCount / totalTrades) * 100 : 0;

  const avgWin = winCount > 0 ? sumIncome(wins) / winCount : 0;
  const avgLoss = lossCount > 0 ? sumIncome(losses) / lossCount : 0;
  const riskReward = avgLoss !== 0 ? Math.abs(avgWin / avgLoss) : 0;

  const hourlyStats = analyzeByHour(pnlTrades);
  const streakStats = analyzeStreaks(pnlTrades);
  const dailyPnL = analyzeDailyPnL(pnlTrades);
  const dates = valid.map(i => Number(i.time)).sort((a, b) => a - b);
  const startDate = dates.length > 0 ? new Date(dates[0]) : null;
  const endDate = dates.length > 0 ? new Date(dates[dates.length - 1]) : null;

  return {
    period: {
      start: startDate ? startDate.toISOString().split('T')[0] : 'N/A',
      end: endDate ? endDate.toISOString().split('T')[0] : 'N/A',
      days: startDate && endDate ? Math.max(1, Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24))) : 0
    },
    trades: {
      total: totalTrades,
      wins: winCount,
      losses: lossCount,
      unit: 'realized_pnl_event',
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
    dataQuality: {
      inputRecords: incomeHistory.length,
      validRecords: valid.length,
      invalidRecords: invalidRecords.length,
      complete: invalidRecords.length === 0
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
      message: `Win rate is only ${analysis.trades.winRate}%. A higher win rate can help, but profitability also depends on average win/loss, fees, funding, and expectancy.`
    });
  }

  if (parseFloat(analysis.averages.riskReward) < THRESHOLDS.MIN_RISK_REWARD) {
    insights.push({
      type: 'warning',
      message: `Risk:Reward is only 1:${analysis.averages.riskReward}. Evaluate expectancy using your actual win/loss distribution and trading costs; 1:${THRESHOLDS.MIN_RISK_REWARD} is only a heuristic target.`
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
  const symbols = Object.keys(tradesBySymbol);
  const symbolStats = {};
  const commissionByAsset = {};
  let invalidTrades = 0;

  symbols.forEach(symbol => {
    const trades = tradesBySymbol[symbol];
    if (!Array.isArray(trades) || trades.length === 0) return;

    let symbolVolume = 0;
    let buys = 0;
    let sells = 0;
    let symbolInvalid = 0;
    const symbolCommissionByAsset = {};

    trades.forEach(trade => {
      const qty = Number(trade && trade.qty);
      const price = Number(trade && trade.price);
      if (!Number.isFinite(qty) || !Number.isFinite(price) || qty < 0 || price < 0) {
        invalidTrades++;
        symbolInvalid++;
        return;
      }

      symbolVolume += qty * price;
      const asset = typeof trade.commissionAsset === 'string' && trade.commissionAsset.trim()
        ? trade.commissionAsset.trim().toUpperCase()
        : 'UNKNOWN';
      const commission = Number(trade.commission);
      if (Number.isFinite(commission)) {
        commissionByAsset[asset] = (commissionByAsset[asset] || 0) + commission;
        symbolCommissionByAsset[asset] = (symbolCommissionByAsset[asset] || 0) + commission;
      }

      if (trade.isBuyer === true) buys++;
      else if (trade.isBuyer === false) sells++;
    });

    totalTrades += trades.length;
    totalVolume += symbolVolume;

    const assets = Object.keys(symbolCommissionByAsset);
    symbolStats[symbol] = {
      trades: trades.length,
      volume: symbolVolume.toFixed(2),
      buys,
      sells,
      invalidTrades: symbolInvalid,
      commissionByAsset: Object.fromEntries(
        assets.map(asset => [asset, symbolCommissionByAsset[asset].toFixed(8)])
      )
    };
  });

  const assets = Object.keys(commissionByAsset);
  const totalCommission = assets.length <= 1
    ? (assets.length === 1 ? commissionByAsset[assets[0]] : 0).toFixed(6)
    : null;

  return {
    totalSymbols: symbols.length,
    totalTrades,
    totalVolume: totalVolume.toFixed(2),
    avgTradeSize: totalTrades > 0 ? (totalVolume / totalTrades).toFixed(2) : '0.00',
    totalCommission,
    commissionByAsset: Object.fromEntries(
      assets.map(asset => [asset, commissionByAsset[asset].toFixed(8)])
    ),
    commissionComparable: assets.length <= 1,
    symbols: symbolStats,
    invalidTrades,
    fetchErrors: (allTrades && allTrades.errors) ? allTrades.errors : [],
    requestedSymbols: (allTrades && allTrades.requestedSymbols) || symbols,
    successfulSymbols: (allTrades && allTrades.successfulSymbols) || symbols,
    complete: (allTrades && typeof allTrades.complete === 'boolean')
      ? allTrades.complete && invalidTrades === 0
      : invalidTrades === 0
  };
}

module.exports = {
  analyzeFuturesIncome,
  analyzeBehavior,
  analyzeSpotTrades,
  THRESHOLDS
};
