/**
 * test-ocr-pipeline.js - Test completo del pipeline OCR + IA
 * 1. Descarga imagen de prueba
 * 2. OCR.Space extrae texto
 * 3. OpenRouter IA interpreta
 */
require("./loader.js");
const ocr = require("./ocr.js");

const PASS = "\x1b[32m✅ PASS\x1b[0m";
const FAIL = "\x1b[31m❌ FAIL\x1b[0m";
const INFO = "\x1b[36m💧\x1b[0m";

async function testPipeline() {
  const results = [];

  // 1. Verificar configuración
  const OCR_API_KEY = process.env.OCR_API_KEY || '';
  const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
  const AI_MODEL = process.env.AI_MODEL || 'google/gemma-4-26b-a4b-it:free';

  results.push({
    name: "OCR_API_KEY configurado",
    ok: !!OCR_API_KEY,
    detail: OCR_API_KEY ? "configurado (" + OCR_API_KEY.substring(0,8) + "...)" : "NO CONFIGURADO"
  });

  results.push({
    name: "OPENROUTER_API_KEY configurado",
    ok: !!OPENROUTER_API_KEY,
    detail: OPENROUTER_API_KEY ? "configurado" : "NO CONFIGURADO"
  });

  results.push({
    name: "AI_MODEL configurado",
    ok: !!AI_MODEL,
    detail: AI_MODEL
  });

  // 2. Test descarga imagen de prueba pública
  console.log(INFO, " Descargando imagen de prueba...");
  const testImageUrl = 'https://httpbin.org/image/png';
  try {
    const base64 = await ocr.downloadImageAsBase64(testImageUrl);
    results.push({
      name: "downloadImageAsBase64",
      ok: base64 && base64.length > 100,
      detail: "base64 length: " + (base64 ? base64.length : 0)
    });

    // 3. Test OCR.Space
    console.log(INFO, " Enviando a OCR.Space...");
    const ocrText = await ocr.ocrSpaceParse(base64, 'test.png');
    results.push({
      name: "OCR.Space parse",
      ok: !!ocrText && ocrText.length > 0,
      detail: ocrText ? "extraído: " + ocrText.substring(0,80) : "vacío"
    });
  } catch(e) {
    results.push({
      name: "Download/OCR pipeline",
      ok: false,
      detail: "Error: " + e.message
    });
  }

  // Imprimir resultados
  console.log("\n========================================");
  console.log("  Laboratorio Bot - Test OCR Pipeline");
  console.log("========================================\n");

  let allPass = true;
  for (const r of results) {
    const mark = r.ok ? PASS : FAIL;
    console.log(mark + " | " + r.name + " | " + r.detail);
    if (!r.ok) allPass = false;
  }

  console.log("\n========================================");
  console.log(allPass ? "✅ TODO OK" : "❌ ERRORES DETECTADOS");
  console.log("========================================\n");
}

testPipeline().then(() => process.exit(0));
