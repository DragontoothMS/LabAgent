require('./loader.js');
const https = require('https');
const OCR_API_KEY = process.env.OCR_API_KEY;

console.log('OCR_API_KEY:', OCR_API_KEY ? 'Yes (' + OCR_API_KEY.substring(0,10) + '...)' : 'NO');

// Test con una imagen de texto real
const testImage = 'https://www.textseed.com/images/samples/1483329781.png';

https.get(testImage, (res) => {
  const chunks = [];
  res.on('data', c => chunks.push(c));
  res.on('end', () => {
    const b64 = Buffer.concat(chunks).toString('base64');
    console.log('Image base64 length:', b64.length);

    const payload = JSON.stringify({
      apikey: OCR_API_KEY,
      base64Image: 'data:image/png;base64,' + b64,
      language: 'spa',
      isOverlayRequired: false,
      detectOrientation: true,
      scale: true,
      filetype: 'png'
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

    console.log('Sending to OCR.Space...');
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        console.log('OCR.Space HTTP Status:', res.statusCode);
        console.log('Response:', body.substring(0, 600));
        try {
          const result = JSON.parse(body);
          if (result.ParsedResults && result.ParsedResults.length > 0) {
            console.log('✅ ParsedText:', result.ParsedResults[0].ParsedText || '(empty)');
          } else if (result.OCRExitCode === 28) {
            console.log('❌ OCR Error 28: No text found in image');
          } else {
            console.log('❌ No ParsedResults');
          }
        } catch(e) {
          console.log('Parse error:', e.message);
        }
      });
    });
    req.on('error', (e) => console.log('Request error:', e.message));
    req.on('timeout', () => { console.log('❌ Timeout'); req.destroy(); });
    req.write(payload);
    req.end();
  });
}).on('error', (e) => console.log('Download error:', e.message));
