/**
 * debug-ocr.js - Debug directo de OCR.Space API
 */
require("./loader.js");
const https = require("https");
const OCR_API_KEY = process.env.OCR_API_KEY || "";

console.log("OCR_API_KEY:", OCR_API_KEY ? "configured (" + OCR_API_KEY.substring(0,8) + "...)" : "MISSING");
console.log("Key length:", OCR_API_KEY.length);

// Test con imagen de texto simple (httpbin)
const testImageUrl = 'https://httpbin.org/image/png';

function downloadImageAsBase64(imageUrl) {
  return new Promise((resolve, reject) => {
    https.get(imageUrl, (res) => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        resolve(buffer.toString('base64'));
      });
    }).on('error', reject);
  });
}

async function test() {
  console.log("Downloading test image...");
  const base64 = await downloadImageAsBase64(testImageUrl);
  console.log("Downloaded, base64 length:", base64.length);

  const data = JSON.stringify({
    apikey: OCR_API_KEY,
    base64Image: base64,
    language: "spa",
    isOverlayRequired: false,
    detectOrientation: true,
    scale: true,
    filetype: "png"
  });

  console.log("Sending to OCR.Space...");

  const options = {
    hostname: 'api.ocr.space',
    path: '/parse/image',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data)
    }
  };

  return new Promise((resolve) => {
    const req = https.request(options, (res) => {
      let respData = '';
      res.on('data', chunk => respData += chunk);
      res.on('end', () => {
        console.log("HTTP Status:", res.statusCode);
        console.log("Raw response:", respData.substring(0, 1000));
        try {
          const result = JSON.parse(respData);
          console.log("Parsed result keys:", Object.keys(result));
          console.log("IsErroredOnProcessing:", result.IsErroredOnProcessing);
          console.log("ErrorMessage:", JSON.stringify(result.ErrorMessage || "none"));
          console.log("OCRExitCode:", result.OCRExitCode);
          console.log("ParsedResults length:", result.ParsedResults ? result.ParsedResults.length : 0);
          if (result.ParsedResults && result.ParsedResults.length > 0) {
            console.log("ParsedText:", result.ParsedResults[0].ParsedText?.substring(0, 200));
          }
        } catch(e) {
          console.log("Parse error:", e.message);
        }
        resolve();
      });
    });
    req.on('error', (e) => {
      console.log("Request error:", e.message);
      resolve();
    });
    req.write(data);
    req.end();
  });
}

test().then(() => process.exit(0));
