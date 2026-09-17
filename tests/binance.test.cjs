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

console.log(`\n${'='.repeat(40)}`);
console.log(`Results: ${testsPassed} passed, ${testsFailed} failed`);
console.log(`${'='.repeat(40)}`);

process.exit(testsFailed > 0 ? 1 : 0);
