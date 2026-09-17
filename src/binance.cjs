/**
 * Shadow Binance Bot - Binance API Connection
 * Handles all communication with Binance API
 *
 * Improvements:
 * - Query parameter encoding (URLSearchParams)
 * - recvWindow on signed requests
 * - Time-window pagination for Futures income
 * - backwards endTime pagination for Spot trades
 * - Symbol validation
 */

const crypto = require('crypto');
const https = require('https');

// API Configuration
const BASE_SPOT_URL = 'api.binance.com';
const BASE_FUTURES_URL = 'fapi.binance.com';

// Retry configuration
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 500;

// Request defaults
const DEFAULT_RECV_WINDOW = 5000;
const FUTURES_INCOME_WINDOW_MS = 7 * 24 * 60 * 60 * 1000; // 7 days per window
const FUTURES_INCOME_MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000; // Binance retains ~3 months
const SPOT_TRADES_PAGE_SIZE = 1000;
const SYMBOL_REGEX = /^[A-Z0-9]{4,25}$/;

/**
 * Delay utility for retry backoff
 * @param {number} ms - Milliseconds to wait
 * @returns {Promise<void>}
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

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
 * Validate a trading symbol (prevents query injection)
 * @param {string} symbol
 * @returns {boolean}
 */
function isValidSymbol(symbol) {
  return typeof symbol === 'string' && SYMBOL_REGEX.test(symbol);
}

/**
 * Build a signed query string with proper encoding and recvWindow
 * @param {object} params - Key/value pairs (values must be strings or numbers)
 * @param {string} secret - API secret
 * @returns {string} - Encoded query string including signature
 */
function buildSignedQuery(params, secret) {
  const search = new URLSearchParams();
  const keys = Object.keys(params).sort();
  for (const key of keys) {
    const value = params[key];
    if (value === undefined || value === null) continue;
    search.append(key, String(value));
  }
  if (!search.has('recvWindow')) {
    search.append('recvWindow', String(DEFAULT_RECV_WINDOW));
  }
  if (!search.has('timestamp')) {
    search.append('timestamp', String(Date.now()));
  }
  const queryString = search.toString();
  const signature = generateSignature(queryString, secret);
  return `${queryString}&signature=${signature}`;
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
 * Determine if an error is retryable
 * @param {Error|object} error - Error or response data
 * @returns {boolean} - True if safe to retry
 */
function isRetryable(error) {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    if (msg.includes('timeout') || msg.includes('econnreset') || msg.includes('econnrefused') || msg.includes('socket')) {
      return true;
    }
  }
  // -1003 = RATE_LIMIT, -1023 = Maintenance, -1001 = DISCONNECTED, -1021 = timestamp
  if (error && error.code && [-1003, -1023, -1001, -1021].includes(error.code)) {
    return true;
  }
  return false;
}

/**
 * Make HTTP request to Binance API with automatic retry
 * @param {string} hostname - API hostname
 * @param {string} path - API path (including query)
 * @param {string} method - HTTP method
 * @param {object} headers - Request headers
 * @returns {Promise<object>} - API response
 */
async function makeRequest(hostname, pathOrFactory, method, headers = {}) {
  let lastError;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    // A function factory is required for signed requests so timestamp/signature
    // can be regenerated after a retry. A string remains supported for callers
    // that already have an immutable path.
    const path = typeof pathOrFactory === 'function' ? pathOrFactory() : pathOrFactory;

    try {
      const result = await _doRequest(hostname, path, method, headers);

      if (isRetryable(result)) {
        if (attempt < MAX_RETRIES) {
          const retryAfterMs = Number(result.retryAfterMs);
          const backoffMs = Number.isFinite(retryAfterMs) && retryAfterMs >= 0
            ? retryAfterMs
            : BASE_DELAY_MS * Math.pow(2, attempt - 1);
          console.error(`[Retry ${attempt}/${MAX_RETRIES}] Rate-limited or transient. Waiting ${backoffMs}ms...`);
          await delay(backoffMs);
          continue;
        }
      }

      return result;
    } catch (err) {
      lastError = err;

      if (isRetryable(err) && attempt < MAX_RETRIES) {
        const backoffMs = BASE_DELAY_MS * Math.pow(2, attempt - 1);
        console.error(`[Retry ${attempt}/${MAX_RETRIES}] ${err.message}. Waiting ${backoffMs}ms...`);
        await delay(backoffMs);
      } else {
        throw err;
      }
    }
  }

  throw lastError;
}
/**
 * Internal: perform a single HTTP request
 */
function _doRequest(hostname, path, method, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = { hostname, path, method, headers };

    const req = https.request(options, (res) => {
      let data = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        let parsed;
        try {
          parsed = JSON.parse(data);
        } catch (e) {
          const error = new Error(`Failed to parse response: ${data.slice(0, 200)}`);
          error.statusCode = res.statusCode;
          reject(error);
          return;
        }

        if (res.statusCode === 429 || res.statusCode === 418) {
          const retryAfterHeader = res.headers['retry-after'];
          const retryAfterSeconds = Number(retryAfterHeader);
          if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds >= 0) {
            parsed.retryAfterMs = retryAfterSeconds * 1000;
          }
        }

        resolve(parsed);
      });
    });

    req.on('error', (err) => reject(err));
    req.setTimeout(15000, () => {
      req.destroy();
      reject(new Error('Request timed out after 15 seconds'));
    });
    req.end();
  });
}
/**
 * Get Spot Account Balance
 */
async function getSpotBalance(apiKey, apiSecret) {
  const data = await makeRequest(BASE_SPOT_URL, () => {
    const query = buildSignedQuery({}, apiSecret);
    return `/api/v3/account?${query}`;
  }, 'GET', {
    'X-MBX-APIKEY': apiKey
  });

  if (isBinanceError(data)) {
    throw new Error(`Binance API Error [${data.code}]: ${data.msg}`);
  }

  return data;
}

/**
 * Get Futures Account Balance
 */
async function getFuturesBalance(apiKey, apiSecret) {
  const data = await makeRequest(BASE_FUTURES_URL, () => {
    const query = buildSignedQuery({}, apiSecret);
    return `/fapi/v2/account?${query}`;
  }, 'GET', {
    'X-MBX-APIKEY': apiKey
  });

  if (isBinanceError(data)) {
    throw new Error(`Binance API Error [${data.code}]: ${data.msg}`);
  }

  return data;
}

/**
 * Fetch one page of Futures income for a time window
 * @private
 */
async function _fetchIncomeWindow(apiKey, apiSecret, startTime, endTime, limit = 1000) {
  const data = await makeRequest(BASE_FUTURES_URL, () => {
    const query = buildSignedQuery({ startTime, endTime, limit }, apiSecret);
    return `/fapi/v1/income?${query}`;
  }, 'GET', {
    'X-MBX-APIKEY': apiKey
  });

  if (isBinanceError(data)) {
    throw new Error(`Binance API Error [${data.code}]: ${data.msg}`);
  }

  if (!Array.isArray(data)) {
    throw new Error('Unexpected income response shape');
  }

  return data;
}

/**
 * Get Futures Income/PNL History with time-window pagination.
 * Binance retains ~3 months of income data. We walk 7-day windows
 * from (now - maxAge) to now and merge results.
 *
 * @param {string} apiKey
 * @param {string} apiSecret
 * @param {number} daysBack - Requested lookback (capped at ~90 days by API)
 * @returns {Promise<array>}
 */
async function getFuturesIncome(apiKey, apiSecret, daysBack = 90) {
  const now = Date.now();
  const requestedMs = Math.min(
    daysBack * 24 * 60 * 60 * 1000,
    FUTURES_INCOME_MAX_AGE_MS
  );
  let cursor = now - requestedMs;
  const all = [];
  const seen = new Set();

  while (cursor < now) {
    const windowEnd = Math.min(cursor + FUTURES_INCOME_WINDOW_MS, now);
    let pageStart = cursor;
    let safety = 0;

    while (pageStart < windowEnd && safety < 50) {
      safety++;
      const batch = await _fetchIncomeWindow(apiKey, apiSecret, pageStart, windowEnd, 1000);

      if (batch.length === 0) break;

      for (const row of batch) {
        const key = `${row.tranId || ''}|${row.time}|${row.incomeType}|${row.income}`;
        if (!seen.has(key)) {
          seen.add(key);
          all.push(row);
        }
      }

      if (batch.length < 1000) break;

      const lastTime = batch[batch.length - 1].time;
      if (typeof lastTime !== 'number' || lastTime <= pageStart) break;
      pageStart = lastTime + 1;
    }

    cursor = windowEnd;
  }

  all.sort((a, b) => a.time - b.time);
  return all;
}

/**
 * Get Spot Trade History for one symbol with backwards endTime pagination
 * @param {string} apiKey
 * @param {string} apiSecret
 * @param {string} symbol
 * @param {number} maxTrades - Soft cap (default 5000)
 * @returns {Promise<array>}
 */
async function getSpotTrades(apiKey, apiSecret, symbol = 'BTCUSDT', maxTrades = 5000) {
  if (!isValidSymbol(symbol)) {
    throw new Error(`Invalid symbol: ${symbol}. Expected format like BTCUSDT.`);
  }

  if (!Number.isInteger(maxTrades) || maxTrades <= 0) {
    throw new Error(`Invalid maxTrades: ${maxTrades}. Expected a positive integer.`);
  }

  const allTrades = [];
  const seenIds = new Set();
  // /myTrades without fromId returns the newest records. To walk backwards,
  // use endTime based pagination from the oldest record in each page.
  let endTime;
  let safety = 0;

  while (allTrades.length < maxTrades && safety < 100) {
    safety++;
    const params = {
      symbol,
      limit: Math.min(SPOT_TRADES_PAGE_SIZE, maxTrades - allTrades.length)
    };
    if (endTime !== undefined) params.endTime = endTime;

    const data = await makeRequest(BASE_SPOT_URL, () => {
      const query = buildSignedQuery(params, apiSecret);
      return `/api/v3/myTrades?${query}`;
    }, 'GET', {
      'X-MBX-APIKEY': apiKey
    });

    if (isBinanceError(data)) {
      throw new Error(`Binance API Error [${data.code}]: ${data.msg}`);
    }

    if (!Array.isArray(data) || data.length === 0) break;

    // Keep ascending order within the final result and de-duplicate boundary rows.
    const page = data
      .filter(t => t && Number.isInteger(t.id))
      .filter(t => !seenIds.has(t.id));

    for (const trade of page) {
      seenIds.add(trade.id);
      allTrades.push(trade);
    }

    if (data.length < SPOT_TRADES_PAGE_SIZE) break;

    const oldestTime = data.reduce((min, t) => {
      const time = Number(t && t.time);
      return Number.isFinite(time) ? Math.min(min, time) : min;
    }, Infinity);

    if (!Number.isFinite(oldestTime)) {
      throw new Error('Spot trade pagination stopped: response contained no valid trade timestamps');
    }

    const nextEndTime = oldestTime - 1;
    if (endTime !== undefined && nextEndTime >= endTime) {
      throw new Error('Spot trade pagination made no progress');
    }
    endTime = nextEndTime;
  }

  allTrades.sort((a, b) => a.time - b.time || a.id - b.id);
  return allTrades.slice(0, maxTrades);
}
/**
 * Get all Spot trades for multiple symbols
 * @returns {Promise<object>} - { trades, errors }
 */
async function getAllSpotTrades(apiKey, apiSecret, symbols = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT']) {
  const allTrades = {};
  const errors = [];

  const cleaned = [];
  for (const raw of symbols) {
    const symbol = String(raw).trim().toUpperCase();
    if (!isValidSymbol(symbol)) {
      errors.push({ symbol: raw, error: `Invalid symbol format: ${raw}` });
      console.error(`Skipping invalid symbol: ${raw}`);
      continue;
    }
    cleaned.push(symbol);
  }

  for (const symbol of cleaned) {
    try {
      const trades = await getSpotTrades(apiKey, apiSecret, symbol);
      if (Array.isArray(trades) && trades.length > 0) {
        allTrades[symbol] = trades;
      }
    } catch (e) {
      errors.push({ symbol, error: e.message });
      console.error(`Failed to fetch trades for ${symbol}: ${e.message}`);
    }
  }

  return {
    trades: allTrades,
    errors,
    requestedSymbols: cleaned,
    successfulSymbols: Object.keys(allTrades),
    complete: errors.length === 0
  };
}

/**
 * Test API Connection.
 *
 * Tries Spot first (cheap, common case), then falls back to Futures.
 * A key scoped to only one product (e.g. Futures-only, a realistic
 * permission choice) should not be treated as "disconnected" just
 * because the other product's endpoint rejects it.
 */
async function testConnection(apiKey, apiSecret) {
  const spotResult = await getSpotBalance(apiKey, apiSecret).then(
    balance => ({ ok: !!(balance && !balance.code) }),
    e => ({ ok: false, error: e })
  );
  if (spotResult.ok) return true;

  const futuresResult = await getFuturesBalance(apiKey, apiSecret).then(
    account => ({ ok: !!(account && !account.code) }),
    e => ({ ok: false, error: e })
  );
  if (futuresResult.ok) return true;

  console.error('Connection test failed (Spot):', spotResult.error && spotResult.error.message);
  console.error('Connection test failed (Futures):', futuresResult.error && futuresResult.error.message);
  return false;
}

module.exports = {
  getSpotBalance,
  getFuturesBalance,
  getFuturesIncome,
  getSpotTrades,
  getAllSpotTrades,
  testConnection,
  generateSignature,
  isValidSymbol,
  buildSignedQuery
};
