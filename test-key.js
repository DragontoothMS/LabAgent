require('./loader.js');
const https = require('https');
const KAPSO_API_KEY = process.env.KAPSO_API_KEY;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;

console.log('KAPSO_API_KEY length:', KAPSO_API_KEY ? KAPSO_API_KEY.length : 'MISSING');
console.log('PHONE_NUMBER_ID:', PHONE_NUMBER_ID || 'MISSING');

const options = {
  hostname: 'api.kapso.ai',
  path: '/meta/whatsapp/v24.0/' + PHONE_NUMBER_ID,
  method: 'GET',
  headers: {
    'X-API-Key': KAPSO_API_KEY,
    'Authorization': 'Bearer ' + KAPSO_API_KEY,
  },
  timeout: 10000
};

const req = https.request(options, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    console.log('HTTP Status:', res.statusCode);
    console.log('Response:', body.substring(0, 200));
    if (res.statusCode === 200 || res.statusCode === 201) {
      console.log('✅ KAPSO_API_KEY is VALID');
    } else {
      console.log('❌ KAPSO_API_KEY is INVALID or phone_number_id mismatch');
    }
  });
});
req.on('error', (e) => {
  console.log('Error:', e.message);
});
req.on('timeout', () => {
  console.log('Request timed out');
  req.destroy();
});
req.end();
