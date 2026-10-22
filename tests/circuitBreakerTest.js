const axios = require('axios');
const jwt = require('jsonwebtoken');

const token = jwt.sign({ user: 'test' }, 'secret');
const headers = { 'Authorization': 'Bearer ' + token };

async function runTest() {
  console.log('Testing successful service...');
  const res1 = await axios.get('http://localhost:3000/api/mock-service/resource', { headers });
  console.log('Success service response:', res1.status);

  console.log('Testing 400 bad request (should not trip circuit breaker)...');
  for (let i = 0; i < 6; i++) {
     try {
       await axios.get('http://localhost:3000/api/bad-request-service/resource', { headers, validateStatus: () => true });
     } catch (err) { }
  }

  // Verify circuit is still closed
  const res2 = await axios.get('http://localhost:3000/api/mock-service/resource', { headers });
  if (res2.status === 200) {
    console.log('Circuit breaker remains CLOSED after 400s! (Expected)');
  } else {
    console.error('Circuit breaker tripped unexpectedly after 400s.');
  }

  console.log('Testing 500 server error (should trip circuit breaker)...');
  for (let i = 0; i < 6; i++) {
     try {
       await axios.get('http://localhost:3000/api/failing-service/resource', { headers, validateStatus: () => true });
     } catch (err) { }
  }

  // Verify circuit is now open
  const res3 = await axios.get('http://localhost:3000/api/mock-service/resource', { headers, validateStatus: () => true });
  if (res3.status === 503) {
     console.log('Circuit breaker is OPEN after 500s! (Expected)');
  } else {
     console.error('Circuit breaker failed to trip after 500s.');
  }
}

runTest().catch(console.error).finally(() => process.exit(0));
