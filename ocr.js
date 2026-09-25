/**
 * ocr.js - Servicio OCR para recetas manuscritas
 * Soporta: OCR.Space (servicio gratuito) + fallback a base64 inline para IA
 */
const https = require('https');
const http = require('http');
const { URL } = require('url');

const OCR_ENDPOINT = process.env.OCR_ENDPOINT || 'https://api.ocr.space/parse/image';
const OCR_API_KEY = process.env.OCR_API_KEY || '';

/**
 * Descarga una imagen desde una URL y la devuelve como base64
 * @param {string} imageUrl - URL pública de la imagen
 * @returns {Promise<string>} - base64 de la imagen
 */
function downloadImageAsBase64(imageUrl) {
  const lib = imageUrl.startsWith('https') ? https : http;
  return new Promise((resolve, reject) => {
    lib.get(imageUrl, (res) => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        resolve(buffer.toString('base64'));
      });
    }).on('error', reject);
  });
}

/**
 * Envía una imagen (base64) a OCR.Space y devuelve el texto extraído
 * @param {string} base64Image - Imagen en base64
 * @param {string} filename - Nombre del archivo
 * @returns {Promise<string>} - Texto extraído
 */
function ocrSpaceParse(base64Image, filename = 'receta.jpg') {
  return new Promise((resolve, reject) => {
    // OCR.Space necesita el base64Data sin prefijo data: (solo el base64 puro)
    const isBase64 = base64Image.startsWith('data:');
    const base64Data = isBase64 ? base64Image.replace(/^data:image\/[^;]+;base64,/, '') : base64Image;

    const data = JSON.stringify({
      apikey: OCR_API_KEY || 'test',
      base64Image: base64Data,
      language: 'spa',
      isOverlayRequired: false,
      detectOrientation: true,
      scale: true,
      filetype: 'jpg'
    });

    const url = new URL('https://api.ocr.space/parse/image');
    const options = {
      hostname: 'api.ocr.space',
      path: '/parse/image',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };

    const req = https.request(options, (res) => {
      let respData = '';
      res.on('data', chunk => respData += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(respData);
          if (result && result.ParsedResults && result.ParsedResults.length > 0) {
            resolve(result.ParsedResults[0].ParsedText || '');
          } else {
            resolve('');
          }
        } catch(e) {
          resolve('');
        }
      });
    });
    req.on('error', (e) => { resolve(''); });
    req.write(data);
    req.end();
  });
}

/**
 * Procesa una receta manuscrita usando OCR + IA
 * Paso 1: OCR.Space extrae texto de la imagen
 * Paso 2: IA (OpenRouter) interpreta "letras de doctor" y estructura la receta
 * @param {string} imageUrl - URL pública de la imagen de la receta
 * @param {string} aiModel - Modelo de IA a usar
 * @param {string} openRouterKey - API key de OpenRouter
 * @returns {Promise<object>} - Receta estructurada
 */
async function procesarRecetaManuscrita(imageUrl, aiModel, openRouterKey) {
  let ocrText = '';
  let recetaData = null;

  // Paso 1: OCR (si la imagen está disponible)
  if (imageUrl) {
    try {
      const base64 = await downloadImageAsBase64(imageUrl);
      ocrText = await ocrSpaceParse(base64);
    } catch(e) {
      ocrText = '';
    }
  }

  // Paso 2: IA interpreta la letra y estructura
  if (openRouterKey) {
    recetaData = await interpretarConIA(ocrText, imageUrl, aiModel, openRouterKey);
  }

  return { ocrText, recetaData };
}

/**
 * Envía el texto extraído (y referencia a la imagen) a la IA para interpretación
 */
async function interpretarConIA(ocrText, imageUrl, aiModel, openRouterKey) {
  const prompt = require('./prompt-base.js');

  const userContent = `
Texto extraído por OCR de una receta médica manuscrita (letra de doctor):
---INICIO OCR---
${ocrText || '(no se pudo extraer texto OCR)'}
---FIN OCR---

Imagen original de la receta: ${imageUrl || '(no disponible)'}

Interpreta esta receta médica manuscrita. Aplica el siguiente prompt de sistema:
"${prompt.RECETA_EXTRACTION_PROMPT.replace(/"/g, "'")}"

Devuelve SOLO el JSON estructurado según el formato especificado. No incluyas markdown ni texto adicional.
`;

  return new Promise((resolve) => {
    const data = JSON.stringify({
      model: aiModel || process.env.AI_MODEL || 'google/gemma-4-26b-a4b-it:free',
      messages: [
        { role: 'system', content: prompt.RECETA_EXTRACTION_PROMPT },
        { role: 'user', content: userContent }
      ],
      temperature: 0.3,
      max_tokens: 4000
    });

    const options = {
      hostname: 'openrouter.ai',
      path: '/api/v1/chat/completions',
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + openRouterKey,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://laboratorio-bot.local',
        'X-Title': 'Laboratorio Recetas Bot'
      }
    };

    const req = https.request(options, (res) => {
      let respData = '';
      res.on('data', chunk => respData += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(respData);
          if (result.choices && result.choices[0] && result.choices[0].message) {
            const content = result.choices[0].message.content.trim();
            // Limpiar posible markdown
            let cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '');
            try {
              resolve(JSON.parse(cleanContent));
            } catch(e) {
              resolve(null);
            }
          } else {
            resolve(null);
          }
        } catch(e) {
          resolve(null);
        }
      });
    });
    req.on('error', () => resolve(null));
    req.write(data);
    req.end();
  });
}

module.exports = {
  downloadImageAsBase64,
  ocrSpaceParse,
  procesarRecetaManuscrita,
  interpretarConIA
};
