const http = require('http');
const fs = require('fs');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const NUM_REQUESTS = parseInt(process.env.NUM_REQUESTS) || 10;
const CONCURRENT_REQUESTS = parseInt(process.env.CONCURRENT_REQUESTS) || 5;

// Login and get auth token
async function authenticate() {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      username: 'admin',
      password: 'admin123'
    });

    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          resolve(response.token);
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

// Make CPU stress request
async function makeStressRequest(token, duration = 60000) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      duration: duration,
      intensity: 2000000
    });

    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/stress',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'Authorization': `Bearer ${token}`
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        console.log(`Stress request completed: ${res.statusCode}`);
        resolve(data);
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

// Main load test function
async function runLoadTest() {
  console.log('Starting load test...');
  console.log(`Target: ${BASE_URL}`);
  console.log(`Requests: ${NUM_REQUESTS}`);
  console.log(`Concurrent: ${CONCURRENT_REQUESTS}`);

  try {
    console.log('Authenticating...');
    const token = await authenticate();
    console.log('Authentication successful');

    const startTime = Date.now();
    const promises = [];

    // Create concurrent requests
    for (let i = 0; i < CONCURRENT_REQUESTS; i++) {
      promises.push(
        makeStressRequest(token, 300000) // 5 minute stress test
      );
    }

    console.log(`Sending ${CONCURRENT_REQUESTS} concurrent CPU stress requests...`);
    await Promise.all(promises);

    const endTime = Date.now();
    const totalTime = endTime - startTime;

    console.log('\n=== Load Test Results ===');
    console.log(`Total time: ${totalTime}ms`);
    console.log(`Average time per request: ${totalTime / CONCURRENT_REQUESTS}ms`);
    console.log('=========================');

  } catch (error) {
    console.error('Load test failed:', error);
  }
}

// Run if called directly
if (require.main === module) {
  runLoadTest();
}

module.exports = { runLoadTest, authenticate, makeStressRequest };
