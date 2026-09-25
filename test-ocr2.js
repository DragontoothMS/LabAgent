require('./loader.js');
const ocr = require('./ocr.js');

const OCR_API_KEY = process.env.OCR_API_KEY;
console.log('OCR_API_KEY:', OCR_API_KEY ? 'Yes (' + OCR_API_KEY.substring(0,10) + '...)' : 'NO');

// Imagen con texto legible
const testImageUrl = 'https://www.textseed.com/images/samples/1483329781.png';

async function run() {
  console.log('Downloading image...');
  const base64 = await ocr.downloadImageAsBase64(testImageUrl);
  console.log('✅ Downloaded, base64 length:', base64 ? base64.length : 'FAILED');

  console.log('Sending to OCR.Space via ocr.js...');
  const text = await ocr.ocrSpaceParse(base64, 'test.png');
  console.log('✅ OCR result:', text ? text.substring(0, 200) : 'VACIO');
}

run().catch(e => console.log('❌ Error:', e.message));
