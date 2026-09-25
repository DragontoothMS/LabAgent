require('./loader.js');
const https = require('https');
const KAPSO_API_KEY = process.env.KAPSO_API_KEY;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;

console.log('Testing sendMessage equivalent...');
console.log('KAPSO_API_KEY:', KAPSO_API_KEY ? KAPSO_API_KEY.substring(0,8)+'...' : 'MISSING');
console.log('PHONE_NUMBER_ID:', PHONE_NUMBER_ID);

const data = JSON.stringify({
  messaging_product: 'whatsapp',
  to: '59177858907',
  type: 'text',
  text: { body: 'Test message from bot verification' }
});

// Test with X-API-Key only
const options = {
  hostname: 'api.kapso.ai',
  path: '/meta/whatsapp/v24.0/' + PHONE_NUMBER_ID + '/messages',
  method: 'POST',
  headers: {
    'X-API-Key': KAPSO_API_KEY,
    'Content-Type': 'application/json',
  },
  timeout: 15000
};

const req = https.request(options, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    console.log('HTTP Status:', res.statusCode);
    console.log('Response:', body.substring(0, 300));
    if (res.statusCode >= 200 && res.statusCode < 300) {
      console.log('✅ sendMessage with X-API-Key ONLY works!');
    } else {
      console.log('❌ Still failing. Trying with Bearer...');
    }
  });
});
req.on('error', (e) => console.log('Error:', e.message));
req.on('timeout', () => { console.log('Timeout'); req.destroy(); });
req.write(data);
req.end();
