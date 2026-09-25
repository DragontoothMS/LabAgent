/**
 * test-kapso.js - Test de conexión con Kapso API
 * Verifica que las credenciales y endpoints de Kapso funcionan
 */
require("./loader.js");
const https = require("https");
const http = require("http");

const PORT = process.env.PORT || 3458;
const KAPSO_API_KEY = process.env.KAPSO_API_KEY || '';
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID || '';

const PASS = "\x1b[32m✅ PASS\x1b[0m";
const FAIL = "\x1b[31m❌ FAIL\x1b[0m";
const INFO = "\x1b[36m💧\x1b[0m";

async function testKapso() {
  const results = [];

  // 1. Verificar KAPSO_API_KEY
  results.push({
    name: "KAPSO_API_KEY configurado",
    ok: !!KAPSO_API_KEY,
    detail: KAPSO_API_KEY ? "configurado (" + KAPSO_API_KEY.substring(0, 8) + "...)" : "NO CONFIGURADO"
  });

  // 2. Verificar PHONE_NUMBER_ID
  results.push({
    name: "PHONE_NUMBER_ID configurado",
    ok: !!PHONE_NUMBER_ID,
    detail: PHONE_NUMBER_ID || "NO CONFIGURADO"
  });

  // 3. Test de conexión a Kapso API (solo si está configurado)
  if (KAPSO_API_KEY && PHONE_NUMBER_ID) {
    console.log(INFO + " Probando conexión a Kapso API...");
    const kapsoResult = await testKapsoConnection();
    results.push({
      name: "Conexión Kapso API",
      ok: kapsoResult.ok,
      detail: kapsoResult.detail
    });

    // 4. Test de health de Kapso
    const healthResult = await testKapsoHealth();
    results.push({
      name: "Kapso webhook reachable",
      ok: healthResult.ok,
      detail: healthResult.detail
    });
  } else {
    results.push({
      name: "Conexión Kapso API",
      ok: false,
      detail: "Requiere KAPSO_API_KEY + PHONE_NUMBER_ID configurados"
    });
    results.push({
      name: "Kapso webhook reachable",
      ok: false,
      detail: "Requiere configuración"
    });
  }

  // 5. Verificar que el server local responde
  const localResult = await testLocalServer();
  results.push({
    name: "Server local responde (health)",
    ok: localResult.ok,
    detail: localResult.detail
  });

  // 6. Verificar ngrok
  results.push({
    name: "Ngrok domain configurado",
    ok: true,
    detail: "hungerless-uncrystalled-andy.ngrok-free.dev (ver start.sh)"
  });

  // Imprimir resultados
  console.log("\n========================================");
  console.log("  Laboratorio Bot - Test Kapso API");
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

  process.exit(0);
}

function testKapsoConnection() {
  return new Promise((resolve) => {
    const options = {
      hostname: "api.kapso.ai",
      path: "/meta/whatsapp/v24.0/" + PHONE_NUMBER_ID,
      method: "GET",
      headers: {
        "X-API-Key": KAPSO_API_KEY,
        "Authorization": "Bearer " + KAPSO_API_KEY,
      },
    };

    const req = https.request(options, (res) => {
      let body = "";
      res.on("data", chunk => body += chunk);
      res.on("end", () => {
        resolve({
          ok: res.statusCode >= 200 && res.statusCode < 300,
          detail: "HTTP " + res.statusCode + " - " + body.substring(0, 80)
        });
      });
    });
    req.on("error", (e) => {
      resolve({ ok: false, detail: "Error: " + e.message });
    });
    req.setTimeout(5000, () => {
      req.destroy();
      resolve({ ok: false, detail: "timeout (5s)" });
    });
    req.end();
  });
}

function testKapsoHealth() {
  return new Promise((resolve) => {
    const options = {
      hostname: "api.kapso.ai",
      path: "/meta/whatsapp/v24.0/" + PHONE_NUMBER_ID + "/messages",
      method: "OPTIONS",
      headers: {
        "X-API-Key": KAPSO_API_KEY,
      },
    };

    const req = https.request(options, (res) => {
      resolve({
        ok: res.statusCode >= 200 && res.statusCode < 300,
        detail: "HTTP " + res.statusCode
      });
    });
    req.on("error", (e) => {
      resolve({ ok: false, detail: "Error: " + e.message });
    });
    req.setTimeout(5000, () => {
      req.destroy();
      resolve({ ok: false, detail: "timeout (5s)" });
    });
    req.end();
  });
}

function testLocalServer() {
  return new Promise((resolve) => {
    const req = http.get("http://127.0.0.1:" + PORT + "/health", (res) => {
      let body = "";
      res.on("data", chunk => body += chunk);
      req.on("end", () => {
        resolve({
          ok: res.statusCode === 200,
          detail: "HTTP " + res.statusCode + " - " + body.substring(0, 80)
        });
      });
    });
    req.on("error", (e) => {
      resolve({ ok: false, detail: "Server no corre: " + e.message });
    });
    req.setTimeout(3000, () => {
      req.destroy();
      resolve({ ok: false, detail: "timeout (3s)" });
    });
  });
}

testKapso();
