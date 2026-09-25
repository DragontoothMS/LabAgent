require('./loader.js');
const https = require('https');
const KAPSO_API_KEY = process.env.KAPSO_API_KEY;

// Test: get media URL via Kapso API for a WhatsApp media ID
const mediaId = '1774291650421662';
console.log('Testing downloadMedia for media ID:', mediaId);
console.log('Using KAPSO_API_KEY (first 8):', KAPSO_API_KEY.substring(0, 8));

const options = {
  hostname: 'api.kapso.ai',
  path: '/meta/whatsapp/v24.0/' + mediaId + '?phone_number_id=' + process.env.PHONE_NUMBER_ID,
  method: 'GET',
  headers: {
    'X-API-Key': KAPSO_API_KEY,
  },
  timeout: 10000
};

const req = https.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => { body += chunk; });
  res.on('end', () => {
    console.log('HTTP Status:', res.statusCode);
    console.log('Response:', body.substring(0, 300));
    try {
      const data = JSON.parse(body);
      console.log('Parsed:', JSON.stringify(data, null, 2).substring(0, 300));
    } catch(e) {
      console.log('Not JSON');
    }
  });
});
req.on('error', (e) => { console.log('Error:', e.message); });
req.on('timeout', () => { console.log('Timeout'); req.destroy(); });
req.end();
