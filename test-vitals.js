/**
 * test-vitals.js - Verificación de vitales del bot
 * Comprueba que las dependencias, configuración y puerto funcionan
 */
require("./loader.js");
const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3458;
const KAPSO_API_KEY = process.env.KAPSO_API_KEY || '';
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';

const PASS = "\x1b[32m✅ PASS\x1b[0m";
const FAIL = "\x1b[31m❌ FAIL\x1b[0m";
const INFO = "\x1b[36m💧\x1b[0m";

async function testVitals() {
  const results = [];

  // 1. Verificar .env
  const envPath = path.join(__dirname, ".env");
  const hasEnv = fs.existsSync(envPath);
  results.push({
    name: ".env existe",
    ok: hasEnv,
    detail: hasEnv ? path.basename(envPath) : "NO EXISTE - copia .env.example"
  });

  // 2. Verificar KAPSO_API_KEY
  results.push({
    name: "KAPSO_API_KEY configurado",
    ok: !!KAPSO_API_KEY,
    detail: KAPSO_API_KEY ? "configurado (" + KAPSO_API_KEY.substring(0, 8) + "...)" : "NO CONFIGURADO"
  });

  // 3. Verificar SUPABASE_URL
  results.push({
    name: "SUPABASE_URL configurado",
    ok: !!SUPABASE_URL,
    detail: SUPABASE_URL || "NO CONFIGURADO"
  });

  // 4. Verificar OPENROUTER_API_KEY
  results.push({
    name: "OPENROUTER_API_KEY configurado",
    ok: !!OPENROUTER_API_KEY,
    detail: OPENROUTER_API_KEY ? "configurado (" + OPENROUTER_API_KEY.substring(0, 8) + "...)" : "NO CONFIGURADO"
  });

  // 5. Verificar puerto disponible
  results.push({
    name: "PORT configurado",
    ok: !!PORT,
    detail: "PORT=" + PORT
  });

  // 6. Verificar archivos clave
  const requiredFiles = ["server.js", "ocr.js", "supabase-client.js", "loader.js", "prompt-base.js"];
  for (const file of requiredFiles) {
    const exists = fs.existsSync(path.join(__dirname, file));
    results.push({
      name: "Archivo: " + file,
      ok: exists,
      detail: exists ? "OK" : "FALTA"
    });
  }

  // 7. Verificar server.js escucha
  const serverCheck = await checkServer();

  // 8. Verificar health endpoint
  if (serverCheck.running) {
    const health = await checkHealth();
    results.push({
      name: "Health endpoint responde",
      ok: health.ok,
      detail: health.body || health.error
    });
  }

  // Imprimir resultados
  console.log("\n========================================");
  console.log("  Laboratorio Bot - Test de Vitals");
  console.log("========================================\n");

  let allPass = true;
  for (const r of results) {
    const mark = r.ok ? PASS : FAIL;
    console.log(mark + " | " + r.name + " | " + r.detail);
    if (!r.ok) allPass = false;
  }

  if (serverCheck.running) {
    console.log("\n" + INFO + " Server corre en puerto " + serverCheck.port);
  } else {
    console.log("\n" + INFO + " Server NO está corriendo en puerto " + PORT);
  }

  console.log("\n========================================");
  console.log(allPass ? "✅ TODO OK" : "❌ HAY ERRORES");
  console.log("========================================\n");

  process.exit(allPass ? 0 : 1);
}

function checkServer() {
  return new Promise((resolve) => {
    const req = http.get("http://127.0.0.1:" + PORT + "/health", (res) => {
      resolve({ running: true, port: PORT, status: res.statusCode });
    });
    req.on("error", () => {
      resolve({ running: false, port: PORT });
    });
    req.setTimeout(3000, () => {
      req.destroy();
      resolve({ running: false, port: PORT });
    });
  });
}

function checkHealth() {
  return new Promise((resolve) => {
    const req = http.get("http://127.0.0.1:" + PORT + "/health", (res) => {
      let body = "";
      res.on("data", chunk => body += chunk);
      res.on("end", () => {
        resolve({ ok: res.statusCode === 200, body: body.substring(0, 120) });
      });
    });
    req.on("error", (e) => {
      resolve({ ok: false, error: e.message });
    });
    req.setTimeout(3000, () => {
      req.destroy();
      resolve({ ok: false, error: "timeout" });
    });
  });
}

testVitals();
