/**
 * Shadow Binance Bot - Main Entry Point
 * AI-powered trading coach that analyzes your Binance trades
 * and simulates alternative strategies
 * 
 * Usage: node src/index.js
 * 
 * Requires: Set BINANCE_API_KEY and BINANCE_API_SECRET in config.env
 */

const fs = require('fs');
const path = require('path');

// Import modules
const binance = require('./binance.cjs');
const analyzer = require('./analyzer.cjs');
const shadowSim = require('./shadowSim.cjs');
const coach = require('./coach.cjs');

// Load configuration
function loadConfig() {
  const configPath = path.join(__dirname, '..', 'config.env');
  
  if (!fs.existsSync(configPath)) {
    console.error('❌ config.env not found!');
    console.log('Please create config.env with:');
    console.log('  BINANCE_API_KEY=your_api_key');
    console.log('  BINANCE_API_SECRET=your_api_secret');
    process.exit(1);
  }
  
  const config = {};
  const content = fs.readFileSync(configPath, 'utf8');
  
  content.split('\n').forEach(line => {
    line = line.trim();
    if (line && !line.startsWith('#')) {
      const [key, value] = line.split('=');
      if (key && value) {
        config[key.trim()] = value.trim();
      }
    }
  });
  
  return config;
}

// Main function
async function main() {
  console.log('');
  console.log('╔══════════════════════════════════════════╗');
  console.log('║     🤖 SHADOW BINANCE BOT 🤖            ║');
  console.log('║     Your Personal Trading Coach          ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log('');
  
  // Load config
  const config = loadConfig();
  const { BINANCE_API_KEY, BINANCE_SECRET_KEY } = config;
  
  if (!BINANCE_API_KEY || !BINANCE_SECRET_KEY) {
    console.error('❌ API keys not found in config.env');
    process.exit(1);
  }
  
  console.log('📡 Connecting to Binance...');
  
  // Test connection
  const connected = await binance.testConnection(BINANCE_API_KEY, BINANCE_SECRET_KEY);
  if (!connected) {
    console.error('❌ Failed to connect to Binance. Check your API keys.');
    process.exit(1);
  }
  console.log('✅ Connected to Binance!');
  console.log('');
  
  try {
    // ===== FUTURES ANALYSIS =====
    console.log('═══════════════════════════════════════');
    console.log('         📈 FUTURES ANALYSIS          ');
    console.log('═══════════════════════════════════════');
    console.log('');
    
    console.log('📥 Fetching Futures trading history...');
    const incomeHistory = await binance.getFuturesIncome(BINANCE_API_KEY, BINANCE_SECRET_KEY, 365);
    
    if (!incomeHistory || incomeHistory.length === 0) {
      console.log('⚠️ No Futures trading history found!');
    } else {
      console.log(`   Found ${incomeHistory.length} records`);
    }
    console.log('');
    
    // Analyze Futures
    console.log('🔍 Analyzing Futures patterns...');
    const futuresAnalysis = analyzer.analyzeFuturesIncome(incomeHistory);
    
    // Shadow Simulation for Futures
    console.log('🎭 Running Futures shadow simulations...');
    const futuresShadow = shadowSim.generateShadowComparison(futuresAnalysis);
    
    // Generate Futures Coach Report
    const futuresCoach = coach.generateCoachReport(futuresAnalysis, futuresShadow);
    console.log('');
    
    // Display Futures Report
    console.log(coach.formatReport(futuresCoach));
    
    // ===== SPOT ANALYSIS =====
    console.log('');
    console.log('═══════════════════════════════════════');
    console.log('           💰 SPOT ANALYSIS            ');
    console.log('═══════════════════════════════════════');
    console.log('');
    
    console.log('📥 Fetching Spot trading history...');
    const spotSymbols = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'SHIBUSDT'];
    const allSpotTrades = await binance.getAllSpotTrades(BINANCE_API_KEY, BINANCE_SECRET_KEY, spotSymbols);
    
    const spotAnalysis = analyzer.analyzeSpotTrades(allSpotTrades);
    
    console.log(`   Found ${spotAnalysis.totalTrades} trades across ${spotAnalysis.totalSymbols} symbols`);
    console.log('');
    
    // Spot Shadow Simulation
    console.log('🎭 Running Spot shadow simulations...');
    const spotShadow = shadowSim.generateSpotShadowComparison(spotAnalysis);
    
    // Spot Coaching
    console.log('📝 Generating Spot coaching...');
    const spotCoach = coach.generateSpotCoachReport(spotAnalysis);
    console.log('');
    
    // Display Spot Report
    console.log(coach.formatSpotReport(spotCoach));
    
    // Show Spot Shadow Strategies
    if (spotAnalysis.totalTrades > 0) {
      console.log('═══════════════════════════════════════');
      console.log('      💡 SPOT SHADOW STRATEGIES      ');
      console.log('═══════════════════════════════════════');
      spotShadow.strategies.forEach(strategy => {
        if (!strategy.error) {
          console.log('');
          console.log(`📌 ${strategy.strategy}`);
          console.log(`   ${strategy.description}`);
        }
      });
      console.log('');
    }
    
    // ===== COMBINED TOTAL =====
    const futuresNetPnL = parseFloat(futuresAnalysis.pnl.net);
    const spotVolume = parseFloat(spotAnalysis.totalVolume);
    
    console.log('');
    console.log('═══════════════════════════════════════');
    console.log('        📈 COMBINED TOTAL             ');
    console.log('═══════════════════════════════════════');
    console.log(`Futures Net PnL: ${futuresNetPnL.toFixed(4)} USDT`);
    console.log(`Spot Volume: ${spotVolume.toFixed(2)} USDT`);
    console.log('');
    
    if (futuresNetPnL < 0) {
      console.log('💡 Focus on fixing your Futures trading first!');
      console.log('   - Use better Risk:Reward (1:3 minimum)');
      console.log('   - Trade during your best hours');
      console.log('   - Implement 3-loss rule');
    }
    
    console.log('');
    console.log('═══════════════════════════════════════');
    console.log('💕 Keep practicing and stay disciplined!');
    console.log('═══════════════════════════════════════');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main };
