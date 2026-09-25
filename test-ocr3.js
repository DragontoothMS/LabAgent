require('./loader.js');
const ocr = require('./ocr.js');

const OCR_API_KEY = process.env.OCR_API_KEY;
console.log('OCR_API_KEY:', OCR_API_KEY ? 'Yes (' + OCR_API_KEY.substring(0,10) + '...)' : 'NO');

// Imagen de receta manuscrita de prueba (placeholder image con texto)
const testImageUrl = 'https://dummyimage.com/600x400/ffffff/000000&text=Receta+Medicinal+Paracetamol+500mg+cada+8h';

async function run() {
  console.log('Downloading image from:', testImageUrl);
  const base64 = await ocr.downloadImageAsBase64(testImageUrl);
  console.log('✅ Downloaded, base64 length:', base64 ? base64.length : 'FAILED');

  console.log('Sending to OCR.Space via ocr.js...');
  const text = await ocr.ocrSpaceParse(base64, 'receta.jpg');
  console.log('✅ OCR result:', text ? text.substring(0, 300) : 'VACIO');
}

run().catch(e => console.log('❌ Error:', e.message));
