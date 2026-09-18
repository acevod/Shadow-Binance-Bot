/**
 * Shadow Binance Bot - Main Entry Point
 * AI-powered trading coach that analyzes your Binance trades
 * and simulates alternative strategies
 *
 * Usage: node src/index.cjs
 *
 * Credentials: Set BINANCE_API_KEY and BINANCE_API_SECRET via:
 *   1. Environment variables (recommended — works on all platforms)
 *   2. Local config.env file (for local development)
 *   See config.env.example for all supported variables.
 */

const fs = require('fs');
const path = require('path');

const binance = require('./binance.cjs');
const analyzer = require('./analyzer.cjs');
const shadowSim = require('./shadowSim.cjs');
const coach = require('./coach.cjs');

const DEFAULT_SPOT_SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'SHIBUSDT'];

/**
 * Load configuration.
 * Priority: process.env overrides config.env for the same key.
 * Supports values that contain '=' (e.g. some secret formats).
 */
function loadConfig() {
  const config = {};

  // 1) Optional local config.env
  const configPath = path.join(__dirname, '..', 'config.env');
  if (fs.existsSync(configPath)) {
    const content = fs.readFileSync(configPath, 'utf8');
    content.split('\n').forEach(line => {
      line = line.trim();
      if (!line || line.startsWith('#')) return;
      const eq = line.indexOf('=');
      if (eq <= 0) return;
      const key = line.slice(0, eq).trim();
      let value = line.slice(eq + 1).trim();
      // Strip optional surrounding quotes
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (key) config[key] = value;
    });
  } else if (!process.env.BINANCE_API_KEY || !process.env.BINANCE_API_SECRET) {
    console.log('Note: config.env not found. Running in Demo Mode unless env vars are set.');
  }

  // 2) Environment variables override file
  if (process.env.BINANCE_API_KEY) config.BINANCE_API_KEY = process.env.BINANCE_API_KEY;
  if (process.env.BINANCE_API_SECRET) config.BINANCE_API_SECRET = process.env.BINANCE_API_SECRET;
  if (process.env.SPOT_SYMBOLS) config.SPOT_SYMBOLS = process.env.SPOT_SYMBOLS;

  return config;
}

/**
 * Generate mock data for Demo Mode
 */
function generateDemoData() {
  console.log('');
  console.log('+==============================================+');
  console.log('|     DEMO MODE - Using Sample Data           |');
  console.log('+==============================================+');
  console.log('');
  console.log('Note: No API keys found. Running with simulated');
  console.log('demo data to show how the bot works.');
  console.log('');

  const now = Date.now();
  const HOUR = 60 * 60 * 1000;
  const DAY = 24 * HOUR;

  const incomeHistory = [];
  for (let i = 0; i < 60; i++) {
    const isWin = Math.random() > 0.45;
    const amount = isWin
      ? (Math.random() * 80 + 10).toFixed(4)
      : (-(Math.random() * 30 + 5)).toFixed(4);
    incomeHistory.push({
      incomeType: 'REALIZED_PNL',
      income: String(amount),
      time: now - (i * DAY * 0.5)
    });
  }

  incomeHistory.push({ incomeType: 'COMMISSION', income: '-2.50', time: now - DAY });
  incomeHistory.push({ incomeType: 'FUNDING_FEE', income: '-1.20', time: now - DAY * 2 });
  incomeHistory.sort((a, b) => a.time - b.time);

  const spotTrades = {
    BTCUSDT: [
      { id: 1, qty: '0.50', price: '62000', commission: '0.00025', isBuyer: true, time: now - DAY * 5 },
      { id: 2, qty: '0.30', price: '64000', commission: '0.00015', isBuyer: false, time: now - DAY * 3 },
      { id: 3, qty: '0.20', price: '61000', commission: '0.00010', isBuyer: true, time: now - DAY * 1 },
    ],
    ETHUSDT: [
      { id: 4, qty: '2.00', price: '3400', commission: '0.00100', isBuyer: true, time: now - DAY * 4 },
      { id: 5, qty: '1.50', price: '3500', commission: '0.00075', isBuyer: false, time: now - DAY * 2 },
    ]
  };

  return { incomeHistory, spotTrades, isDemo: true };
}

/**
 * Main function
 */
async function main() {
  console.log('');
  console.log('+==============================================+');
  console.log('|     SHADOW BINANCE BOT                      |');
  console.log('|     Your Personal Trading Coach              |');
  console.log('+==============================================+');
  console.log('');

  const config = loadConfig();
  const { BINANCE_API_KEY, BINANCE_API_SECRET, SPOT_SYMBOLS } = config;

  const spotSymbols = SPOT_SYMBOLS
    ? SPOT_SYMBOLS.split(',').map(s => s.trim()).filter(Boolean)
    : DEFAULT_SPOT_SYMBOLS;

  const isDemoMode = !BINANCE_API_KEY || !BINANCE_API_SECRET;

  if (isDemoMode) {
    const { incomeHistory, spotTrades } = generateDemoData();

    console.log('============================================');
    console.log('         FUTURES ANALYSIS [DEMO]            ');
    console.log('============================================');
    console.log('');

    const futuresAnalysis = analyzer.analyzeFuturesIncome(incomeHistory);
    const futuresShadow = shadowSim.generateShadowComparison(futuresAnalysis);
    const futuresCoach = coach.generateCoachReport(futuresAnalysis, futuresShadow);
    console.log(coach.formatReport(futuresCoach));

    console.log('');
    console.log('============================================');
    console.log('           SPOT ANALYSIS [DEMO]             ');
    console.log('============================================');
    console.log('');

    const spotAnalysis = analyzer.analyzeSpotTrades(spotTrades);
    const spotShadow = shadowSim.generateSpotShadowComparison(spotAnalysis);
    const spotCoach = coach.generateSpotCoachReport(spotAnalysis);
    console.log(coach.formatSpotReport(spotCoach));

    if (spotAnalysis.totalTrades > 0) {
      console.log('============================================');
      console.log('      SPOT SHADOW STRATEGIES                ');
      console.log('============================================');
      spotShadow.strategies.forEach(strategy => {
        if (!strategy.error) {
          console.log('');
          console.log(`[${strategy.strategy}]`);
          console.log(`   ${strategy.description}`);
        }
      });
      if (spotShadow.disclaimer) {
        console.log('');
        console.log(`Note: ${spotShadow.disclaimer}`);
      }
      console.log('');
    }

    console.log('============================================');
    console.log('         END OF DEMO MODE                   ');
    console.log('============================================');
    console.log('');
    console.log('To run with your real data:');
    console.log('  1. Set BINANCE_API_KEY and BINANCE_API_SECRET');
    console.log('     - As environment variables (recommended), OR');
    console.log('     - Copy config.env.example to config.env and fill in keys');
    console.log('  2. Run: node src/index.cjs');
    console.log('');
    return;
  }

  console.log('Connecting to Binance...');

  const connected = await binance.testConnection(BINANCE_API_KEY, BINANCE_API_SECRET);
  if (!connected) {
    console.error('x Failed to connect to Binance. Check your API keys.');
    process.exit(1);
  }
  console.log('Connected to Binance!');
  console.log('');

  console.log('Fetching account balances...');
  const [futuresBalanceResult, spotBalanceResult] = await Promise.allSettled([
    binance.getFuturesBalance(BINANCE_API_KEY, BINANCE_API_SECRET),
    binance.getSpotBalance(BINANCE_API_KEY, BINANCE_API_SECRET)
  ]);
  const futuresBalance = futuresBalanceResult.status === 'fulfilled' ? futuresBalanceResult.value : null;
  const spotBalance = spotBalanceResult.status === 'fulfilled' ? spotBalanceResult.value : null;
  console.log('');
  console.log(coach.formatBalanceSummary(futuresBalance, spotBalance));

  try {
    // ===== FUTURES ANALYSIS =====
    console.log('============================================');
    console.log('         FUTURES ANALYSIS                   ');
    console.log('============================================');
    console.log('');

    console.log('Fetching Futures trading history (paginated, up to ~90 days)...');
    const incomeHistory = await binance.getFuturesIncome(BINANCE_API_KEY, BINANCE_API_SECRET, 90);

    if (!incomeHistory || incomeHistory.length === 0) {
      console.log('No Futures trading history found.');
    } else {
      console.log(`   Found ${incomeHistory.length} records`);
    }
    console.log('');

    console.log('Analyzing Futures patterns...');
    const futuresAnalysis = analyzer.analyzeFuturesIncome(incomeHistory || []);

    console.log('Running Futures shadow simulations...');
    const futuresShadow = shadowSim.generateShadowComparison(futuresAnalysis);

    const futuresCoach = coach.generateCoachReport(futuresAnalysis, futuresShadow);
    console.log('');
    console.log(coach.formatReport(futuresCoach));

    // ===== SPOT ANALYSIS =====
    console.log('');
    console.log('============================================');
    console.log('           SPOT ANALYSIS                    ');
    console.log('============================================');
    console.log('');

    console.log(`Fetching Spot trading history for: ${spotSymbols.join(', ')}...`);
    const allSpotTrades = await binance.getAllSpotTrades(BINANCE_API_KEY, BINANCE_API_SECRET, spotSymbols);

    if (allSpotTrades.errors && allSpotTrades.errors.length > 0) {
      console.log(`  WARNING: incomplete Spot coverage (${allSpotTrades.successfulSymbols?.length || 0}/${allSpotTrades.requestedSymbols?.length || spotSymbols.length} symbols succeeded)`);
      console.log('  Some symbols failed:')
      allSpotTrades.errors.forEach(e => console.log(`    - ${e.symbol}: ${e.error}`));
    }

    const spotAnalysis = analyzer.analyzeSpotTrades(allSpotTrades);

    console.log(`   Found ${spotAnalysis.totalTrades} valid fills across ${spotAnalysis.totalSymbols} symbols`);
    if (!spotAnalysis.complete) {
      console.log('   WARNING: Spot analysis is incomplete or contains invalid records. Treat aggregate metrics as partial.');
    }
    console.log('');

    console.log('Running Spot shadow simulations...');
    const spotShadow = shadowSim.generateSpotShadowComparison(spotAnalysis);

    console.log('Generating Spot coaching...');
    const spotCoach = coach.generateSpotCoachReport(spotAnalysis);
    console.log('');
    console.log(coach.formatSpotReport(spotCoach));

    if (spotAnalysis.totalTrades > 0) {
      console.log('============================================');
      console.log('      SPOT SHADOW STRATEGIES                ');
      console.log('============================================');
      spotShadow.strategies.forEach(strategy => {
        if (!strategy.error) {
          console.log('');
          console.log(`[${strategy.strategy}]`);
          console.log(`   ${strategy.description}`);
        }
      });
      if (spotShadow.disclaimer) {
        console.log('');
        console.log(`Note: ${spotShadow.disclaimer}`);
      }
      console.log('');
    }

    // ===== COMBINED TOTAL =====
    const futuresNetPnL = parseFloat(futuresAnalysis.pnl.net);
    const spotVolumeComparable = spotAnalysis.volumeComparable !== false;
    const spotVolume = spotVolumeComparable ? (parseFloat(spotAnalysis.totalVolume) || 0) : null;

    console.log('');
    console.log('============================================');
    console.log('        COMBINED TOTAL                      ');
    console.log('============================================');
    console.log(`Futures Net PnL: ${futuresNetPnL.toFixed(4)} USDT`);
    if (spotVolumeComparable) {
      console.log(`Spot Notional: ${spotVolume.toFixed(2)} (quote asset depends on symbol)`);
    } else {
      console.log('Spot Notional: traded against multiple quote assets (see Spot Summary above for the breakdown)');
    }
    console.log('');

    if (futuresNetPnL < 0) {
      console.log('Focus on fixing your Futures trading first!');
      console.log('   - Review risk/reward and validate expectancy');
      console.log('   - Trade during your best hours');
      console.log('   - Implement 3-loss rule');
    }

    console.log('');
    console.log('============================================');
    console.log('Keep practicing and stay disciplined!');
    console.log('============================================');

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main, loadConfig };
