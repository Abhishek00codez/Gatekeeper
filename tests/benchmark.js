const autocannon = require('autocannon');
const jwt = require('jsonwebtoken');

const token = jwt.sign({ user: 'test' }, 'secret');
const url = process.env.URL || 'http://localhost:3000/api/test/resource';

const instance = autocannon({
  url,
  connections: 50, // concurrent connections
  pipelining: 1, // pipelining requests
  duration: 5, // duration in seconds
  headers: {
    'Authorization': 'Bearer ' + token
  }
}, (err, results) => {
  if (err) {
    console.error('Benchmark error:', err);
    process.exit(1);
  }
  console.log('\n--- Benchmark Results ---');
  console.log(`Requests/sec: ${results.requests.average}`);
  console.log(`Latency p99: ${results.latency.p99} ms`);
  console.log(`Total Requests: ${results.requests.total}`);
  console.log(`2xx responses: ${results['2xx']}`);
  console.log(`429 responses (rate limited): ${results['4xx']}`);
  console.log(`5xx responses: ${results['5xx']}`);
});
autocannon.track(instance, { renderProgressBar: true });
