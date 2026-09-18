/**
 * Unit tests for binance.cjs helpers (no network)
 */

const { isValidSymbol, generateSignature, buildSignedQuery } = require('../src/binance.cjs');

let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
  if (condition) {
    testsPassed++;
  } else {
    testsFailed++;
    console.error(`FAIL: ${message}`);
  }
}

console.log('Running binance.cjs helper tests...\n');

// Symbol validation
assert(isValidSymbol('BTCUSDT') === true, 'BTCUSDT should be valid');
assert(isValidSymbol('ETHUSDT') === true, 'ETHUSDT should be valid');
assert(isValidSymbol('btcusdt') === false, 'lowercase should be invalid');
assert(isValidSymbol('BTCUSDT&evil=1') === false, 'injection string should be invalid');
assert(isValidSymbol('BTC USDT') === false, 'space should be invalid');
assert(isValidSymbol('') === false, 'empty should be invalid');
assert(isValidSymbol(null) === false, 'null should be invalid');
assert(isValidSymbol('SHIBUSDT') === true, 'SHIBUSDT should be valid');

// Signature deterministic
const sig1 = generateSignature('foo=1&bar=2', 'secret');
const sig2 = generateSignature('foo=1&bar=2', 'secret');
assert(sig1 === sig2, 'Signature should be deterministic');
assert(sig1.length === 64, 'HMAC-SHA256 hex should be 64 chars');

// buildSignedQuery encodes and adds recvWindow + signature
const qs = buildSignedQuery({ symbol: 'BTCUSDT', limit: 100 }, 'testsecret');
assert(qs.includes('symbol=BTCUSDT'), 'Should include symbol');
assert(qs.includes('limit=100'), 'Should include limit');
assert(qs.includes('recvWindow=5000'), 'Should include default recvWindow');
assert(qs.includes('timestamp='), 'Should include timestamp');
assert(qs.includes('signature='), 'Should include signature');
// Injection attempt must be encoded if somehow passed (URLSearchParams encodes &)
const qs2 = buildSignedQuery({ symbol: 'BTC&X=1', limit: 1 }, 'testsecret');
assert(!qs2.includes('symbol=BTC&X=1&'), 'Ampersand in value must not break query structure');
assert(qs2.includes('signature='), 'Still signed');

// Spot pagination regression test: first page is newest, subsequent page must
// move backwards by endTime rather than incorrectly advancing from latest ID.
const https = require('https');
const EventEmitter = require('events');
const { getSpotTrades, getFuturesIncome, getSpotBalance } = require('../src/binance.cjs');

const originalRequest = https.request;

function mockSpotPagination() {
  const calls = [];
  https.request = (options, callback) => {
    calls.push(options.path);
    const req = new EventEmitter();
    req.setTimeout = () => req;
    req.destroy = () => {};
    req.end = () => {
      const res = new EventEmitter();
      res.statusCode = 200;
      res.headers = {};
      res.setEncoding = () => {};
      process.nextTick(() => {
        const page = calls.length === 1
          ? Array.from({ length: 1000 }, (_, i) => ({ id: 1001 + i, time: 1001 + i, qty: '1', price: '1' }))
          : Array.from({ length: 1000 }, (_, i) => ({ id: 1 + i, time: 1 + i, qty: '1', price: '1' }));
        callback(res);
        res.emit('data', JSON.stringify(page));
        res.emit('end');
      });
    };
    return req;
  };
  return calls;
}

async function testSpotPagination() {
  const calls = mockSpotPagination();
  const trades = await getSpotTrades('key', 'secret', 'BTCUSDT', 2000);
  assert(trades.length === 2000, `Pagination should return 2000 trades, got ${trades.length}`);
  assert(trades[0].id === 1 && trades[1999].id === 2000, 'Trades should be returned oldest-to-newest after backward pagination');
  assert(calls.length === 2, `Should make 2 paginated requests, got ${calls.length}`);
  assert(calls[1].includes('endTime=1000'), 'Second request should use endTime before the oldest trade from the first page');
  assert(!calls[1].includes('fromId='), 'Backward pagination should not advance from the newest trade ID');
}

// Futures income pagination regression test: with daysBack=8, the 7-day
// window walker should produce exactly 2 outer windows. The first window's
// page returns a full 1000-row batch (forcing an in-window sub-page fetch),
// the sub-page returns 200 (< 1000, ending the window), and the second
// window returns 50. Total: 3 requests, 1250 merged+sorted records.
//
// The mock must generate `time` values relative to the *requested* startTime
// (real epoch scale) — the pagination safety guard breaks early if
// lastTime <= pageStart, which small synthetic counters would trigger.
function mockFuturesIncomePagination() {
  let callCount = 0;
  const pageSizes = [1000, 200, 50];
  https.request = (options, callback) => {
    callCount++;
    const url = new URL(options.path, 'http://x');
    const startTime = Number(url.searchParams.get('startTime'));
    const req = new EventEmitter();
    req.setTimeout = () => req;
    req.destroy = () => {};
    req.end = () => {
      const res = new EventEmitter();
      res.statusCode = 200;
      res.headers = {};
      res.setEncoding = () => {};
      process.nextTick(() => {
        const size = pageSizes[callCount - 1] !== undefined ? pageSizes[callCount - 1] : 0;
        const batch = Array.from({ length: size }, (_, i) => ({
          tranId: `${callCount}-${i}`,
          time: startTime + i,
          incomeType: 'REALIZED_PNL',
          income: '1.0'
        }));
        callback(res);
        res.emit('data', JSON.stringify(batch));
        res.emit('end');
      });
    };
    return req;
  };
  return () => callCount;
}

async function testFuturesIncomePagination() {
  const getCallCount = mockFuturesIncomePagination();
  const income = await getFuturesIncome('key', 'secret', 8);
  assert(getCallCount() === 3, `Should make 3 requests (1000+200 in window 1, 50 in window 2), got ${getCallCount()}`);
  assert(income.length === 1250, `Should return 1250 merged records, got ${income.length}`);
  const sorted = income.every((row, i) => i === 0 || row.time >= income[i - 1].time);
  assert(sorted, 'Futures income should be sorted ascending by time across windows');
  const uniqueKeys = new Set(income.map(r => `${r.tranId}|${r.time}|${r.incomeType}|${r.income}`));
  assert(uniqueKeys.size === income.length, 'Records should be de-duplicated');
}

// Rate-limit awareness regression test: a response reporting used-weight
// near the account's per-minute budget should trigger a proactive backoff
// delay; low usage (or a response with no weight header at all, e.g. an
// older/atypical response) should not.
function mockWeightResponse(usedWeightHeader) {
  https.request = (options, callback) => {
    const req = new EventEmitter();
    req.setTimeout = () => req;
    req.destroy = () => {};
    req.end = () => {
      const res = new EventEmitter();
      res.statusCode = 200;
      res.headers = usedWeightHeader !== undefined ? { 'x-mbx-used-weight-1m': String(usedWeightHeader) } : {};
      res.setEncoding = () => {};
      process.nextTick(() => {
        callback(res);
        res.emit('data', JSON.stringify({ balances: [] }));
        res.emit('end');
      });
    };
    return req;
  };
}

async function testRateLimitBackoff() {
  mockWeightResponse(100); // 100/6000, well under the 80% threshold
  let start = Date.now();
  await getSpotBalance('key', 'secret');
  assert(Date.now() - start < 500, 'Low used-weight should not trigger a backoff delay');

  mockWeightResponse(5500); // 5500/6000 ~= 92%, over the 80% threshold
  start = Date.now();
  await getSpotBalance('key', 'secret');
  assert(Date.now() - start >= 900, 'High used-weight (>=80% of budget) should trigger a proactive backoff delay');

  mockWeightResponse(undefined); // no weight header present
  start = Date.now();
  await getSpotBalance('key', 'secret');
  assert(Date.now() - start < 500, 'Missing weight header should not crash or trigger a delay');
}

testSpotPagination()
  .then(testFuturesIncomePagination)
  .then(testRateLimitBackoff)
  .catch(err => {
    testsFailed++;
    console.error(`FAIL: pagination regression test threw: ${err.message}`);
  })
  .finally(() => {
    https.request = originalRequest;
    console.log(`\n${'='.repeat(40)}`);
    console.log(`Results: ${testsPassed} passed, ${testsFailed} failed`);
    console.log(`${'='.repeat(40)}`);
    process.exit(testsFailed > 0 ? 1 : 0);
  });
