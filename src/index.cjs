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
    // Get Futures Income History
    console.log('📥 Fetching your trading history...');
    const incomeHistory = await binance.getFuturesIncome(BINANCE_API_KEY, BINANCE_SECRET_KEY, 365);
    
    if (!incomeHistory || incomeHistory.length === 0) {
      console.log('⚠️ No trading history found!');
      console.log('Start trading on Binance Futures to see your analysis.');
      process.exit(0);
    }
    
    console.log(`   Found ${incomeHistory.length} records`);
    console.log('');
    
    // Analyze
    console.log('🔍 Analyzing your trading patterns...');
    const analysis = analyzer.analyzeFuturesIncome(incomeHistory);
    console.log('   Analysis complete!');
    console.log('');
    
    // Shadow Simulation
    console.log('🎭 Running shadow strategy simulations...');
    const shadowComparison = shadowSim.generateShadowComparison(analysis);
    console.log('   Simulations complete!');
    console.log('');
    
    // Generate Coach Report
    console.log('📝 Generating coaching report...');
    const coachReport = coach.generateCoachReport(analysis, shadowComparison);
    console.log('');
    
    // Display Report
    console.log(coach.formatReport(coachReport));
    
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
