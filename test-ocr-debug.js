require('./loader.js');
const https = require('https');
const OCR_API_KEY = process.env.OCR_API_KEY;

// Test 1: multipart/form-data (formato recomendado por OCR.Space docs)
function testMultipart(b64, filename) {
  return new Promise((resolve, reject) => {
    const boundary = '----OCRSpaceBoundary12345';
    const body = [
      '--' + boundary,
      'Content-Disposition: form-data; name="apikey"',
      '',
      OCR_API_KEY,
      '--' + boundary,
      'Content-Disposition: form-data; name="language"',
      '',
      'spa',
      '--' + boundary,
      'Content-Disposition: form-data; name="isOverlayRequired"',
      '',
      'false',
      '--' + boundary,
      'Content-Disposition: form-data; name="image"; filename="' + filename + '"',
      'Content-Type: image/jpeg',
      '',
      Buffer.from(b64, 'base64'), // send raw buffer
      '--' + boundary + '--',
      ''
    ];

    // For multipart, we need to mix string and buffer parts
    const parts = [
      Buffer.from('--' + boundary + '\r\nContent-Disposition: form-data; name="apikey"\r\n\r\n' + OCR_API_KEY + '\r\n'),
      Buffer.from('--' + boundary + '\r\nContent-Disposition: form-data; name="language"\r\n\r\nspa\r\n'),
      Buffer.from('--' + boundary + '\r\nContent-Disposition: form-data; name="isOverlayRequired"\r\n\r\nfalse\r\n'),
      Buffer.from('--' + boundary + '\r\nContent-Disposition: form-data; name="image"; filename="' + filename + '"\r\nContent-Type: image/jpeg\r\n\r\n'),
      Buffer.from(b64, 'base64'),
      Buffer.from('\r\n--' + boundary + '--\r\n')
    ];
    const data = Buffer.concat(parts);

    const options = {
      hostname: 'api.ocr.space',
      path: '/parse/image',
      method: 'POST',
      headers: {
        'Content-Type': 'multipart/form-data; boundary=' + boundary,
        'Content-Length': data.length
      },
      timeout: 15000
    };

    const req = https.request(options, (res) => {
      let resp = '';
      res.on('data', c => resp += c);
      res.on('end', () => {
        console.log('Multipart HTTP:', res.statusCode);
        console.log('Response:', resp.substring(0, 400));
        try {
          const r = JSON.parse(resp);
          console.log('ParsedText:', r.ParsedResults ? r.ParsedResults[0]?.ParsedText || '(empty)' : 'N/A');
        } catch(e) { console.log('Parse fail'); }
        resolve();
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// Test 2: JSON with base64Data (NO data: prefix)
function testJSON(cleanB64) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      apikey: OCR_API_KEY,
      base64Image: cleanB64,
      language: 'spa',
      isOverlayRequired: false,
      detectOrientation: true,
      scale: true,
      filetype: 'jpg'
    });

    const options = {
      hostname: 'api.ocr.space',
      path: '/parse/image',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      },
      timeout: 15000
    };

    console.log('Payload length:', payload.length);
    console.log('base64Image length:', cleanB64.length);

    const req = https.request(options, (res) => {
      let resp = '';
      res.on('data', c => resp += c);
      res.on('end', () => {
        console.log('JSON HTTP:', res.statusCode);
        console.log('Response:', resp.substring(0, 400));
        try {
          const r = JSON.parse(resp);
          console.log('ParsedText:', r.ParsedResults ? r.ParsedResults[0]?.ParsedText || '(empty)' : 'N/A');
        } catch(e) { console.log('Parse fail:', e.message); }
        resolve();
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function run() {
  const url = 'https://dummyimage.com/600x400/ffffff/000000&text=Paracetamol+500mg+cada+8h';
  
  // Download as base64
  const b64 = await new Promise((resolve, reject) => {
    https.get(url, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('base64')));
    }).on('error', reject);
  });

  console.log('Downloaded base64 length:', b64.length);

  // Test JSON with clean base64
  console.log('\n=== Test JSON (clean base64) ===');
  await testJSON(b64);

  // Test JSON with data URI
  console.log('\n=== Test JSON (data URI) ===');
  const dataUri = 'data:image/jpeg;base64,' + b64;
  await testJSON(dataUri);
}

run().catch(e => console.log('Error:', e.message));
