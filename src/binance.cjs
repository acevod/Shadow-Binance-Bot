/**
 * Shadow Binance Bot - Binance API Connection
 * Handles all communication with Binance API
 */

const crypto = require('crypto');
const https = require('https');

// API Configuration
const BASE_SPOT_URL = 'api.binance.com';
const BASE_FUTURES_URL = 'fapi.binance.com';

/**
 * Generate signature for Binance API
 * @param {string} queryString - The query string to sign
 * @param {string} secret - Your API secret
 * @returns {string} - The signature
 */
function generateSignature(queryString, secret) {
  return crypto.createHmac('sha256', secret).update(queryString).digest('hex');
}

/**
 * Check if a Binance API response is an error
 * @param {object} data - Response data
 * @returns {boolean} - True if error
 */
function isBinanceError(data) {
  return data && typeof data === 'object' && typeof data.code === 'number' && data.msg;
}

/**
 * Make HTTP request to Binance API
 * @param {string} hostname - API hostname
 * @param {string} path - API path
 * @param {string} method - HTTP method
 * @param {object} headers - Request headers
 * @returns {Promise<object>} - API response
 */
function makeRequest(hostname, path, method, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname,
      path,
      method,
      headers
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed);
        } catch (e) {
          reject(new Error(`Failed to parse response: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

/**
 * Get Spot Account Balance
 * @param {string} apiKey - Your Binance API Key
 * @param {string} apiSecret - Your Binance API Secret
 * @returns {Promise<object>} - Account balances
 */
async function getSpotBalance(apiKey, apiSecret) {
  const timestamp = Date.now();
  const queryString = `timestamp=${timestamp}`;
  const signature = generateSignature(queryString, apiSecret);

  const path = `/api/v3/account?${queryString}&signature=${signature}`;
  const data = await makeRequest(BASE_SPOT_URL, path, 'GET', {
    'X-MBX-APIKEY': apiKey
  });

  if (isBinanceError(data)) {
    throw new Error(`Binance API Error [${data.code}]: ${data.msg}`);
  }

  return data;
}

/**
 * Get Futures Account Balance
 * @param {string} apiKey - Your Binance API Key
 * @param {string} apiSecret - Your Binance API Secret
 * @returns {Promise<object>} - Futures account data
 */
async function getFuturesBalance(apiKey, apiSecret) {
  const timestamp = Date.now();
  const queryString = `timestamp=${timestamp}`;
  const signature = generateSignature(queryString, apiSecret);

  const path = `/fapi/v2/account?${queryString}&signature=${signature}`;
  const data = await makeRequest(BASE_FUTURES_URL, path, 'GET', {
    'X-MBX-APIKEY': apiKey
  });

  if (isBinanceError(data)) {
    throw new Error(`Binance API Error [${data.code}]: ${data.msg}`);
  }

  return data;
}

/**
 * Get Futures Income/PNL History
 * @param {string} apiKey - Your Binance API Key
 * @param {string} apiSecret - Your Binance API Secret
 * @param {number} daysBack - How many days back to fetch
 * @returns {Promise<array>} - Income history
 */
async function getFuturesIncome(apiKey, apiSecret, daysBack = 365) {
  const timestamp = Date.now();
  const startTime = timestamp - (daysBack * 24 * 60 * 60 * 1000);
  const queryString = `startTime=${startTime}&timestamp=${timestamp}&limit=1000`;
  const signature = generateSignature(queryString, apiSecret);

  const path = `/fapi/v1/income?${queryString}&signature=${signature}`;
  const data = await makeRequest(BASE_FUTURES_URL, path, 'GET', {
    'X-MBX-APIKEY': apiKey
  });

  if (isBinanceError(data)) {
    throw new Error(`Binance API Error [${data.code}]: ${data.msg}`);
  }

  return data;
}

/**
 * Get Spot Trade History
 * @param {string} apiKey - Your Binance API Key
 * @param {string} apiSecret - Your Binance API Secret
 * @param {string} symbol - Trading pair (e.g., 'BTCUSDT')
 * @param {number} limit - Number of trades to fetch (max 1000)
 * @returns {Promise<array>} - Trade history
 */
async function getSpotTrades(apiKey, apiSecret, symbol = 'BTCUSDT', limit = 100) {
  const timestamp = Date.now();
  const queryString = `symbol=${symbol}&timestamp=${timestamp}&limit=${limit}`;
  const signature = generateSignature(queryString, apiSecret);

  const path = `/api/v3/myTrades?${queryString}&signature=${signature}`;
  const data = await makeRequest(BASE_SPOT_URL, path, 'GET', {
    'X-MBX-APIKEY': apiKey
  });

  if (isBinanceError(data)) {
    throw new Error(`Binance API Error [${data.code}]: ${data.msg}`);
  }

  return data;
}

/**
 * Get all Spot trades for multiple symbols
 * @param {string} apiKey - Your Binance API Key
 * @param {string} apiSecret - Your Binance API Secret
 * @param {array} symbols - Array of trading pairs to fetch
 * @returns {Promise<object>} - All trades grouped by symbol
 */
async function getAllSpotTrades(apiKey, apiSecret, symbols = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT']) {
  const allTrades = {};

  for (const symbol of symbols) {
    try {
      const trades = await getSpotTrades(apiKey, apiSecret, symbol, 100);
      if (Array.isArray(trades) && trades.length > 0) {
        allTrades[symbol] = trades;
      }
    } catch (e) {
      console.error(`Failed to fetch trades for ${symbol}: ${e.message}`);
    }
  }

  return allTrades;
}

/**
 * Test API Connection
 * @param {string} apiKey - Your Binance API Key
 * @param {string} apiSecret - Your Binance API Secret
 * @returns {Promise<boolean>} - Connection successful?
 */
async function testConnection(apiKey, apiSecret) {
  try {
    const balance = await getSpotBalance(apiKey, apiSecret);
    return balance && !balance.code;
  } catch (e) {
    console.error('Connection test failed:', e.message);
    return false;
  }
}

module.exports = {
  getSpotBalance,
  getFuturesBalance,
  getFuturesIncome,
  getSpotTrades,
  getAllSpotTrades,
  testConnection,
  generateSignature
};
