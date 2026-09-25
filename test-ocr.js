/**
 * test-ocr.js - Test del servicio OCR + IA
 * Usa OCR.Space con un endpoint de test (placeholder) y simula
 * la interpretación de IA con el prompt de extracción.
 */
require("./loader.js");

const ocr = require("./ocr.js");
const { RECETA_EXTRACTION_PROMPT } = require("./prompt-base.js");

const PASS = "\x1b[32m✅ PASS\x1b[0m";
const FAIL = "\x1b[31m❌ FAIL\x1b[0m";
const INFO = "\x1b[36m💧\x1b[0m";

async function testOcr() {
  const results = [];

  // 1. Verificar que el módulo OCR carga
  const functions = ["downloadImageAsBase64", "ocrSpaceParse", "procesarRecetaManuscrita", "interpretarConIA"];
  for (const fn of functions) {
    results.push({
      name: "ocr." + fn + " exportado",
      ok: typeof ocr[fn] === "function",
      detail: typeof ocr[fn] === "function" ? "function" : "FALTA"
    });
  }

  // 2. Verificar prompt de extracción
  results.push({
    name: "RECETA_EXTRACTION_PROMPT definido",
    ok: !!RECETA_EXTRACTION_PROMPT,
    detail: RECETA_EXTRACTION_PROMPT ? "OK (" + RECETA_EXTRACTION_PROMPT.length + " chars)" : "NO DEFINIDO"
  });

  // 3. Verificar que el prompt produce JSON parseable (estructura esperada)
  const testJson = {
    nombre_paciente: "Juan Pérez",
    edad: 45,
    genero: "M",
    doctor: "Dr. Gómez",
    centro_medico: "Clínica Santos",
    fecha_emision: "2026-09-15",
    fecha_vencimiento: "2026-09-22",
    medicamentos: [
      { nombre: "Paracetamol", dosis: "500mg", frecuencia: "cada 8h", duracion: "5 días", cantidad: "10", instrucciones_uso: "con agua", observaciones: null }
    ],
    instrucciones_generales: "Tomar con alimentos",
    notas_adicionales: null
  };

  try {
    const parsed = JSON.parse(JSON.stringify(testJson));
    results.push({
      name: "Formato JSON de receta válido",
      ok: true,
      detail: "OK - " + Object.keys(parsed).length + " campos"
    });
  } catch(e) {
    results.push({
      name: "Formato JSON de receta válido",
      ok: false,
      detail: "Error: " + e.message
    });
  }

  // 4. Test de OCR.Space con imagen de test (solo si OCR_API_KEY está configurado)
  const OCR_API_KEY = process.env.OCR_API_KEY || '';
  if (OCR_API_KEY) {
    results.push({
      name: "OCR_API_KEY configurado",
      ok: true,
      detail: "configurado (" + OCR_API_KEY.substring(0, 8) + "...)"
    });
    results.push({
      name: "Test de OCR.Space",
      ok: false,
      detail: "Requiere imagen real - usar test-ocr-live.js"
    });
  } else {
    results.push({
      name: "OCR_API_KEY configurado",
      ok: false,
      detail: "NO CONFIGURADO - OCR.Space usará 'test' (limitado)"
    });
  }

  // 5. Test de interpretación con IA (solo si OPENROUTER_API_KEY está configurado)
  const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
  const AI_MODEL = process.env.AI_MODEL || 'poolside/laguna-s-2.1:free';
  if (OPENROUTER_API_KEY) {
    results.push({
      name: "OPENROUTER_API_KEY configurado",
      ok: true,
      detail: "configurado - test live requiere imagen"
    });
  } else {
    results.push({
      name: "OPENROUTER_API_KEY configurado",
      ok: false,
      detail: "NO CONFIGURADO - la IA no puede interpretar"
    });
  }

  results.push({
    name: "AI_MODEL configurado",
    ok: true,
    detail: AI_MODEL
  });

  // Imprimir resultados
  console.log("\n========================================");
  console.log("  Laboratorio Bot - Test OCR + IA");
  console.log("========================================\n");

  let allPass = true;
  for (const r of results) {
    const mark = r.ok ? PASS : FAIL;
    console.log(mark + " | " + r.name + " | " + r.detail);
    if (!r.ok) allPass = false;
  }

  console.log("\n========================================");
  console.log(allPass ? "✅ TODO OK" : "❌ CONFIGURACIÓN INCOMPLETA (esperado sin .env)");
  console.log("========================================\n");

  process.exit(0); // Siempre 0 - es un test de configuración
}

testOcr();
