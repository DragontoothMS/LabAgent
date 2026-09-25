/**
 * supabase-client.js - Cliente Supabase para recetas medicas
 * Tabla: recetas_medicas
 */
const https = require('https');

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_KEY || '';

function supabaseRequest(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      resolve({ error: 'Supabase no configurado' });
      return;
    }
    const url = new URL(SUPABASE_URL + path);
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      }
    };
    if (body) {
      const bodyStr = JSON.stringify(body);
      options.headers['Content-Length'] = Buffer.byteLength(bodyStr);
    }
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch(e) { resolve(data); }
      });
    });
    req.on('error', reject);
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('timeout')); });
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// ==================== RECETAS ====================

async function saveReceta(receta) {
  const body = {
    telefono_paciente: receta.telefono_paciente,
    nombre_paciente: receta.nombre_paciente || null,
    edad: receta.edad || null,
    genero: receta.genero || null,
    doctor: receta.doctor || null,
    centro_medico: receta.centro_medico || null,
    fecha_emision: receta.fecha_emision || null,
    fecha_vencimiento: receta.fecha_vencimiento || null,
    medicamentos: receta.medicamentos || [],
    instrucciones: receta.instrucciones || null,
    notas: receta.notas || null,
    image_url: receta.image_url || null,
    status: 'nueva',
    created_at: new Date().toISOString()
  };
  return await supabaseRequest('/rest/v1/recetas_medicas', 'POST', body);
}

async function getRecetasPorPaciente(telefono) {
  return await supabaseRequest(
    '/rest/v1/recetas_medicas?telefono_paciente=eq.' + encodeURIComponent(telefono) +
    '&order=created_at.desc&select=*'
  );
}

async function getRecetaPorId(id) {
  const data = await supabaseRequest('/rest/v1/recetas_medicas?id=eq.' + id + '&select=*');
  if (!data || data.length === 0) return null;
  return data[0];
}

async function updateRecetaStatus(id, status) {
  return await supabaseRequest('/rest/v1/recetas_medicas?id=eq.' + id, 'PATCH', { status });
}

module.exports = {
  saveReceta,
  getRecetasPorPaciente,
  getRecetaPorId,
  updateRecetaStatus
};
