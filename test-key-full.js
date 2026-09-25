require('./loader.js');
const https = require('https');
const KAPSO_API_KEY = process.env.KAPSO_API_KEY;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;

console.log('Testing KAPSO_API_KEY:', KAPSO_API_KEY ? KAPSO_API_KEY.substring(0,8) + '...' : 'MISSING');
console.log('PHONE_NUMBER_ID:', PHONE_NUMBER_ID);
console.log('');

// Test 1: Only X-API-Key header
function test1() {
  return new Promise((resolve) => {
    const options = {
      hostname: 'api.kapso.ai',
      path: '/meta/whatsapp/v24.0/' + PHONE_NUMBER_ID,
      method: 'GET',
      headers: { 'X-API-Key': KAPSO_API_KEY },
      timeout: 10000
    };
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        console.log('Test 1 (X-API-Key only):', res.statusCode, body.substring(0,150));
        resolve();
      });
    });
    req.on('error', (e) => { console.log('Test 1 error:', e.message); resolve(); });
    req.on('timeout', () => { console.log('Test 1 timeout'); req.destroy(); resolve(); });
    req.end();
  });
}

// Test 2: Only Bearer auth
function test2() {
  return new Promise((resolve) => {
    const options = {
      hostname: 'api.kapso.ai',
      path: '/meta/whatsapp/v24.0/' + PHONE_NUMBER_ID,
      method: 'GET',
      headers: { 'Authorization': 'Bearer ' + KAPSO_API_KEY },
      timeout: 10000
    };
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        console.log('Test 2 (Bearer only):', res.statusCode, body.substring(0,150));
        resolve();
      });
    });
    req.on('error', (e) => { console.log('Test 2 error:', e.message); resolve(); });
    req.on('timeout', () => { console.log('Test 2 timeout'); req.destroy(); resolve(); });
    req.end();
  });
}

// Test 3: apikey query param
function test3() {
  return new Promise((resolve) => {
    const options = {
      hostname: 'api.kapso.ai',
      path: '/meta/whatsapp/v24.0/' + PHONE_NUMBER_ID + '?apikey=' + KAPSO_API_KEY,
      method: 'GET',
      timeout: 10000
    };
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        console.log('Test 3 (apikey param):', res.statusCode, body.substring(0,150));
        resolve();
      });
    });
    req.on('error', (e) => { console.log('Test 3 error:', e.message); resolve(); });
    req.on('timeout', () => { console.log('Test 3 timeout'); req.destroy(); resolve(); });
    req.end();
  });
}

// Test 4: Check if key is from a different Kapso account/project
function test4() {
  return new Promise((resolve) => {
    const options = {
      hostname: 'api.kapso.ai',
      path: '/v1/projects',
      method: 'GET',
      headers: { 'X-API-Key': KAPSO_API_KEY },
      timeout: 10000
    };
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        console.log('Test 4 (list projects):', res.statusCode, body.substring(0,200));
        resolve();
      });
    });
    req.on('error', (e) => { console.log('Test 4 error:', e.message); resolve(); });
    req.on('timeout', () => { console.log('Test 4 timeout'); req.destroy(); resolve(); });
    req.end();
  });
}

(async () => {
  await test1();
  await test2();
  await test3();
  await test4();
})();
