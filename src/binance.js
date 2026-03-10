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
          resolve(data);
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

  return data;
}

/**
 * Get Futures Trade History
 * @param {string} apiKey - Your Binance API Key
 * @param {string} apiSecret - Your Binance API Secret
 * @param {string} symbol - Trading pair (e.g., 'BTCUSDT')
 * @param {number} daysBack - How many days back to fetch
 * @returns {Promise<array>} - Trade history
 */
async function getFuturesTrades(apiKey, apiSecret, symbol = 'BTCUSDT', daysBack = 30) {
  const timestamp = Date.now();
  const startTime = timestamp - (daysBack * 24 * 60 * 60 * 1000);
  const queryString = `symbol=${symbol}&startTime=${startTime}&timestamp=${timestamp}&limit=100`;
  const signature = generateSignature(queryString, apiSecret);

  const path = `/fapi/v1/userTrades?${queryString}&signature=${signature}`;
  const data = await makeRequest(BASE_FUTURES_URL, path, 'GET', {
    'X-MBX-APIKEY': apiKey
  });

  return data;
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
  getFuturesTrades,
  testConnection,
  generateSignature
};
