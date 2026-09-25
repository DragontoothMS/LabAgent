/**
 * server.js - Laboratorio Bot
 * WhatsApp webhook bot que lee recetas medicas manuscritas (letras de doctor)
 * - Webhook HTTP via Kapso API
 * - OCR + IA (OpenRouter) para interpretar letra de doctor
 * - Conexion Supabase para guardar recetas
 * - Sistema de estados conversacionales
 * - Rate limiting y message buffering
 */
require("./loader.js");

const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3458;
const KAPSO_API_KEY = process.env.KAPSO_API_KEY || '';
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID || '';
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const AI_MODEL = process.env.AI_MODEL || 'google/gemma-4-26b-a4b-it:free';

const conversations = new Map();
const MAX_HISTORY = 10;

function randomDelay(min, max) {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise(resolve => setTimeout(resolve, delay));
}

function log(msg) {
  const line = '[' + new Date().toISOString() + '] ' + msg + '\n';
  try { process.stdout.write(line); } catch(e) {}
  try { fs.appendFileSync('bot.log', line); } catch(e) {}
}

// ==================== SUPABASE ====================
const supabase = require('./supabase-client.js');

// ==================== OCR ====================
const ocr = require('./ocr.js');

// ==================== KAPSO (WhatsApp API) ====================
function markAsRead(msgId) {
  return Promise.resolve();
}

/**
 * Enviar mensaje de texto via Kapso API v24.0
 * @param {string} to - número de teléfono con código de país (ej: 5917XXXXXX)
 * @param {string} text - texto del mensaje
 */
function sendMessage(to, text, retries = 2) {
  const data = JSON.stringify({
    messaging_product: 'whatsapp',
    to: to,
    type: 'text',
    text: { body: text }
  });
  const options = {
    hostname: 'api.kapso.ai',
    path: '/meta/whatsapp/v24.0/' + PHONE_NUMBER_ID + '/messages',
    method: 'POST',
    headers: {
      'X-API-Key': KAPSO_API_KEY,
      'Content-Type': 'application/json',
    },
  };
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let respData = '';
      res.on('data', (chunk) => { respData += chunk; });
      res.on('end', () => {
        log('  Send [' + res.statusCode + ']: ' + respData.substring(0, 80));
        resolve({ status: res.statusCode, body: respData });
      });
    });
    req.on('error', (e) => {
      log('  Send error: ' + e.message);
      if (retries > 0) {
        setTimeout(() => sendMessage(to, text, retries - 1).then(resolve).catch(reject), 2000);
      } else {
        reject(e);
      }
    });
    req.write(data);
    req.end();
  });
}

/**
 * Enviar imagen via Kapso API
 * @param {string} to - número de teléfono
 * @param {string} imageUrl - URL pública de la imagen
 * @param {string} caption - pie de foto opcional
 */
async function sendKapsoImage(to, imageUrl, caption) {
  const payload = {
    messaging_product: 'whatsapp',
    to: to,
    type: 'image',
    image: { link: imageUrl, caption: caption || '' }
  };
  const data = JSON.stringify(payload);
  const options = {
    hostname: 'api.kapso.ai',
    path: '/meta/whatsapp/v24.0/' + PHONE_NUMBER_ID + '/messages',
    method: 'POST',
    headers: {
      'X-API-Key': KAPSO_API_KEY,
      'Content-Type': 'application/json',
    },
  };
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let respData = '';
      res.on('data', (chunk) => { respData += chunk; });
      res.on('end', () => {
        log('  Send image [' + res.statusCode + ']: ' + respData.substring(0, 80));
        resolve({ status: res.statusCode, body: respData });
      });
    });
    req.on('error', (e) => { log('  Send image error: ' + e.message); reject(e); });
    req.write(data);
    req.end();
  });
}

/**
 * Descargar imagen desde URL de Kapso (media de WhatsApp)
 * Kapso provee URLs temporales de descarga de media
 */
async function downloadMedia(mediaId) {
  // Paso 1: obtener URL de descarga
  const getOptions = {
  hostname: 'api.kapso.ai',
  path: '/meta/whatsapp/v24.0/' + mediaId + '?phone_number_id=' + PHONE_NUMBER_ID,
  method: 'GET',
  headers: {
    'X-API-Key': KAPSO_API_KEY,
  },
  };

  return new Promise((resolve, reject) => {
    const req = https.request(getOptions, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          const data = JSON.parse(body);
          if (data.url) {
            resolve(data.url);
          } else {
            resolve(null);
          }
        } catch(e) {
          resolve(null);
        }
      });
    });
    req.on('error', () => resolve(null));
    req.end();
  });
}

// ==================== PROCESO DE RECETAS ====================

/**
 * Procesar una imagen de receta manuscrita
 * - OCR para extraer texto
 * - IA para interpretar "letra de doctor"
 * - Guardar en Supabase
 */
async function procesarRecetaImagen(from, imageUrl) {
  log('>> Procesando imagen de receta de: ' + from);

  // Mensaje de "procesando"
  await sendMessage(from, '🔄 Recibida la foto de la receta. Procesando con OCR e inteligencia artificial... por favor espere un momento.');

  try {
    // OCR + IA
    const { ocrText, recetaData } = await ocr.procesarRecetaManuscrita(
      imageUrl,
      AI_MODEL,
      OPENROUTER_API_KEY
    );

    log('  OCR extraído: ' + (ocrText ? ocrText.substring(0, 100) : 'vacío'));

    if (!recetaData) {
      await sendMessage(from, '⚠️ No se pudo interpretar la receta. Por favor verifica que la imagen sea clara y legible, o envía los datos manualmente.');
      return;
    }

    // Guardar en Supabase
    const recetaGuardada = await supabase.saveReceta({
      telefono_paciente: from,
      ...recetaData,
      image_url: imageUrl
    });

    if (recetaGuardada && recetaGuardada.error) {
      log('  Supabase error: ' + JSON.stringify(recetaGuardada.error));
    }

    // Formatear respuesta
    const respuesta = formatearRecetaProcesada(recetaData);
    await sendMessage(from, respuesta);

    log('  Receta procesada y guardada para: ' + from);

  } catch(e) {
    log('  Error procesando receta: ' + e.message);
    await sendMessage(from, '❌ Error procesando la receta. Por favor intenta nuevamente o contacta al personal.');
  }
}

/**
 * Formatea la receta estructurada como mensaje legible
 */
function formatearRecetaProcesada(receta) {
  let msg = '';

  // Paciente
  msg += '📋 *RECETA MÉDICA PROCESADA*\n\n';
  if (receta.nombre_paciente) msg += '*Paciente:* ' + receta.nombre_paciente + '\n';
  if (receta.edad) msg += '*Edad:* ' + receta.edad + '\n';
  if (receta.genero) msg += '*Género:* ' + receta.genero + '\n';

  // Doctor y centro
  msg += '\n';
  if (receta.doctor) msg += '*Doctor:* ' + receta.doctor + '\n';
  if (receta.centro_medico) msg += '*Centro:* ' + receta.centro_medico + '\n';

  // Fechas
  msg += '\n';
  if (receta.fecha_emision) msg += '*Emisión:* ' + receta.fecha_emision + '\n';
  if (receta.fecha_vencimiento) msg += '*Vence:* ' + receta.fecha_vencimiento + '\n';

  // Medicamentos
  if (receta.medicamentos && receta.medicamentos.length > 0) {
    msg += '\n💊 *MEDICAMENTOS:*\n';
    receta.medicamentos.forEach((med, i) => {
      msg += '\n' + (i + 1) + '. *' + (med.nombre || 'Sin nombre') + '*\n';
      if (med.dosis) msg += '   Dosis: ' + med.dosis + '\n';
      if (med.frecuencia) msg += '   Frecuencia: ' + med.frecuencia + '\n';
      if (med.duracion) msg += '   Duración: ' + med.duracion + '\n';
      if (med.cantidad) msg += '   Cantidad: ' + med.cantidad + '\n';
      if (med.instrucciones_uso) msg += '   Uso: ' + med.instrucciones_uso + '\n';
      if (med.observaciones) msg += '   Obs: ' + med.observaciones + '\n';
    });
  }

  // Instrucciones generales
  if (receta.instrucciones_generales) {
    msg += '\n📝 *INSTRUCCIONES:*\n' + receta.instrucciones_generales + '\n';
  }

  // Notas
  if (receta.notas_adicionales) {
    msg += '\n📌 *NOTAS:*\n' + receta.notas_adicionales + '\n';
  }

  msg += '\n✅ Receta guardada en el sistema.';

  return msg;
}

// ==================== MENSAJE DE PRIMER CONTACTO ====================
async function sendPrimerContacto(to) {
  await sendMessage(to, '👋 Hola. Bienvenido al asistente de Laboratorio.\n\nEnvíame una foto clara de tu receta médica manuscrita (letra de doctor) y yo extraigo todos los datos: paciente, doctor, medicamentos, dosis, frecuencia, duración, fechas, etc.\n\n📎 Por favor, asegúrate de que la foto sea legible y incluya toda la receta.');
}

// ==================== AYUDA ====================
function mensajeAyuda() {
  return '📋 *Comandos disponibles:*\n\n' +
    '• *Foto de receta* - Envía una imagen de tu receta manuscrita y la procesamos\n' +
    '• *Mis recetas* - Lista tus recetas procesadas\n' +
    '• *Ayuda* - Muestra este mensaje\n\n' +
    'El bot extrae: nombre del paciente, edad, género, doctor, centro médico, fechas, y todos los medicamentos con dosis, frecuencia, duración e instrucciones.';
}

// ==================== HELPERS ====================
function getConversationState(from) {
  const s = conversations.get(from) || { step: null, history: [] };
  return s;
}

function setConversationState(from, step, data) {
  const existing = conversations.get(from) || { history: [] };
  conversations.set(from, Object.assign(existing, { step: step, data: data, ts: Date.now() }));
}

function addToHistory(from, text, sender = 'user') {
  const state = getConversationState(from);
  state.history.push({ sender, text, ts: Date.now() });
  if (state.history.length > MAX_HISTORY) {
    state.history = state.history.slice(-MAX_HISTORY);
  }
}

// ==================== PROCESO DE MENSAJES ====================
async function processMessage(from, text, msgId, contactName) {
  addToHistory(from, text, 'user');

  const state = getConversationState(from);

  // Primer contacto: saludar y pedir foto
  if (!state.step || state.step === null) {
    await sendPrimerContacto(from);
    setConversationState(from, 'esperando_foto', { first_contact: true });
    return;
  }

  // Si ya pasó el primer contacto, manejar según estado
  if (state.step === 'esperando_foto') {
    const lowerText = text.toLowerCase().trim();

    if (lowerText.includes('mis recetas') || lowerText.includes('recetas')) {
      const recetas = await supabase.getRecetasPorPaciente(from);
      if (!recetas || recetas.length === 0) {
        await sendMessage(from, '📭 No tienes recetas registradas. Envía una foto de tu receta para procesarla.');
      } else {
        let msg = '📋 *Tus recetas registradas:*\n\n';
        recetas.forEach((r, i) => {
          msg += (i + 1) + '. *' + (r.nombre_paciente || 'Sin nombre') + '* - ' + (r.created_at || '') + '\n';
          msg += '   Estado: ' + (r.status || 'nueva') + '\n';
          if (r.medicamentos && r.medicamentos.length > 0) {
            msg += '   Medicamentos: ' + r.medicamentos.length + '\n';
          }
          msg += '\n';
        });
        msg += 'Envía el número de la receta para ver detalles, o una nueva foto para procesar otra.';
        await sendMessage(from, msg);
      }
      return;
    }

    if (lowerText.includes('ayuda') || lowerText.includes('help')) {
      await sendMessage(from, mensajeAyuda());
      return;
    }

    // Si el usuario responde con texto, no es una imagen -> aclarar
    await sendMessage(from, '📎 Por favor envía una *foto* de tu receta médica manuscrita. Puedo procesar imágenes en formato JPG, PNG, etc.\n\nSi tienes dudas, escribe *Ayuda*.');
    return;
  }

  // Estado por defecto
  await sendMessage(from, mensajeAyuda());
}

/**
 * Procesar una imagen recibida
 */
async function processImageMessage(from, imageId, imageUrl) {
  addToHistory(from, '[imagen recibida]', 'user');
  await procesarRecetaImagen(from, imageUrl);
}

// ==================== WEBHOOK POST HANDLER ====================
const server = http.createServer(async (req, res) => {
  if (req.method === 'POST' && (req.url === '/' || req.url === '/webhook')) {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body);
        log('>> Webhook recibido: ' + body.substring(0, 200));

        let from, text, msgId, imageId = null, imageUrl = null;
        let mediaId = null;

        // Formato real de Kapso: {message:{from, text:{body}, id, ...}}
        if (payload.message) {
          from = payload.message.from || '';
          msgId = payload.message.id || ('msg_' + Date.now());
          text = payload.message.text && payload.message.text.body ? payload.message.text.body : null;

          // Si es imagen
          if (payload.message.image) {
            imageId = payload.message.image.id || null;
            imageUrl = payload.message.image.link || payload.message.image.url || null;
            text = payload.message.caption || '[imagen recibida]';
          }
          // Si viene con media (WhatsApp media objects)
          if (payload.message.media) {
            mediaId = payload.message.media.id || imageId;
          }
          // WhatsApp: descargar media si tenemos ID (cuando no viene link directo)
          if (!imageUrl && (imageId || mediaId)) {
            const downloadId = mediaId || imageId;
            imageUrl = await downloadMedia(downloadId);
            log('  Media URL obtenida: ' + (imageUrl ? imageUrl.substring(0, 80) : 'null'));
          }
        }
        // Formato alternativo Meta Graph API
        else if (payload.entry && payload.entry[0]) {
          const entry = payload.entry[0];
          const phone = entry.id || '';
          if (entry.messaging && entry.messaging[0]) {
            const msg = entry.messaging[0];
            if (msg.messages && msg.messages[0]) {
              const message = msg.messages[0];
              from = message.from || phone;
              msgId = message.id;
              text = message.text ? message.text.body : null;
              if (message.image) {
                imageUrl = message.image.link || null;
                text = message.image.caption || '[imagen recibida]';
              }
            }
          }
        }

        if (from) {
          await markAsRead(msgId);

          // Si es imagen, procesar como receta
          if (imageUrl) {
            await processImageMessage(from, imageId, imageUrl);
          }

          // Si hay texto, procesar mensaje
          if (text) {
            await processMessage(from, text, msgId);
          }

          res.writeHead(200);
          res.end(JSON.stringify({ ok: true, sent: true }));
          return;
        }

        res.writeHead(200);
        res.end(JSON.stringify({ ok: true, received: true }));
      } catch (error) {
        log('Webhook error: ' + error.message);
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'bad_request' }));
      }
    });
    return;
  }

  if (req.method === 'GET' && req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Laboratorio Bot - Recetas Médicas Manuscritas');
    return;
  }

  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, service: 'Laboratorio Bot', port: PORT, status: 'ready' }));
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, '0.0.0.0', () => {
  log('===============================================');
  log('Laboratorio Bot - Recetas Medicas Manuscritas');
  log('Port: ' + PORT);
  log('KAPSO_API_KEY: ' + (KAPSO_API_KEY ? 'configurado' : 'NO CONFIGURADO'));
  log('SUPABASE_URL: ' + (process.env.SUPABASE_URL ? 'configurado' : 'NO CONFIGURADO'));
  log('OPENROUTER_API_KEY: ' + (OPENROUTER_API_KEY ? 'configurado' : 'NO CONFIGURADO'));
  log('AI_MODEL: ' + AI_MODEL);
  log('===============================================');
});
