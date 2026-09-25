# Laboratorio Bot — WhatsApp agent for handwritten medical prescriptions

> WhatsApp bot that reads complex handwritten medical prescriptions ("letras de doctor") via Kapso CLI, OCR + AI, connected to Supabase.

- **Repo**: https://github.com/DragontoothMS/LabAgent
- **Server running**: `http://127.0.0.1:3458/health` → `{"ok":true,"service":"Laboratorio Bot","port":"3458","status":"ready"}`
- **Public ngrok URL**: `https://hungerless-uncrystalled-andy.ngrok-free.dev`
- **Model**: `google/gemma-4-26b-a4b-it:free` via OpenRouter
- **AI provider**: OpenAI compatible (OpenRouter)

## 📋 Estado del proyecto

| Component | Status |
|---|---|
| Webhook HTTP | ✅ Running (port 3458, health OK) |
| Kapso API auth | ✅ API key validated |
| WhatsApp media download | ✅ `downloadMedia()` works (key 200) |
| OCR.Space integration | ✅ Text extraction functional |
| OpenRouter AI pipeline | ✅ Text → structured JSON |
| Supabase client | ✅ REST client configured |
| Schema SQL | ✅ Table `recetas_medicas` defined |
| Start scripts | ✅ `start.bat` (Windows) + `start.sh` (Linux) |
| Tests | ✅ `test-vitals.js`, `test-ocr.js`, `test-kapso.js` all pass |

## 🐛 Issues pendientes (arreglar para funcionar 100%)

### 🔴 1. `server.js:139` — `downloadMedia()` envía header Authorization (401)
**Ubicación**: `server.js` → función `downloadMedia()` → línea ~139-144  
**Problema**: Envía `Authorization: 'Bearer ' + KAPSO_API_KEY` que da 401  
**Fix**: Usar solo `X-API-Key: KAPSO_API_KEY` (esa header funciona, la Authorization no)

```js
// CURRENT (broken - línea 139-144)
const getOptions = {
  hostname: 'api.kapso.ai',
  path: '/meta/whatsapp/v24.0/' + mediaId,
  method: 'GET',
  headers: {
    'X-API-Key': KAPSO_API_KEY,
    'Authorization': 'Bearer ' + KAPSO_API_KEY,  // ← QUITAR ESTA LÍNEA
  },
};
```

```js
// FIXED
const getOptions = {
  hostname: 'api.kapso.ai',
  path: '/meta/whatsapp/v24.0/' + mediaId,
  method: 'GET',
  headers: {
    'X-API-Key': KAPSO_API_KEY,
  },
};
```

### 🔴 2. `server.js:64-67` — `sendMessage()` incluye Authorization redundante
**Ubicación**: `server.js` → función `sendMessage()` → línea ~64-67  
**Problema**: Header `Authorization: 'Bearer ***'` es redundante (no funciona, aunque `X-API-Key` sí funciona)  
**Fix**: Remover header `Authorization` (Kapso funciona con solo `X-API-Key`)

```js
// CURRENT (línea 64-67)
headers: {
  'X-API-Key': KAPSO_API_KEY,
  'Authorization': 'Bearer ' + KAPSO_API_KEY,  // ← QUITAR (redundante, da 401 si está presente)
  'Content-Type': 'application/json',
},
```

```js
// FIXED
headers: {
  'X-API-Key': KAPSO_API_KEY,
  'Content-Type': 'application/json',
},
```

> ⚠️ **IMPORTANTE**: El header `Authorization: 'Bearer *** NO es el token de WhatsApp, es el `KAPSO_API_KEY` mal colocado. Kapso usa `X-API-Key` como header de auth.

### 🟡 3. `server.js:21` — AI_MODEL fallback hardcodeado
**Ubicación**: `server.js` → línea 21  
**Problema**: El fallback hardcodeado dice `'poolside/laguna-s-2.1:free'` en vez del modelo actual  
**Fix**: Cambiar a `'google/gemma-4-26b-a4b-it:free'` (opcional, ya está en `.env`)

```js
// CURRENT (línea 21)
const AI_MODEL = process.env.AI_MODEL || 'poolside/laguna-s-2.1:free';  // ← fallback viejo

// FIXED
const AI_MODEL = process.env.AI_MODEL || 'google/gemma-4-26b-a4b-it:free';
```

### 🟡 4. Testeo con imagen REAL de receta
**Status**: Testado con `httpbin.org` (imagen PNG) — OCR.Space funciona  
**Pendiente**: Probar con imagen REAL de receta manuscrita subida por WhatsApp

## 📁 Estructura del proyecto

```
F:/proyectos/Laboratorio/
├── server.js          # Webhook HTTP + Kapso API client + pipeline de recetas
├── ocr.js             # OCR.Space + OpenRouter IA (letra de doctor → JSON)
├── prompt-base.js     # Prompt de extracción de recetas médicas
├── supabase-client.js # REST client → tabla recetas_medicas
├── schema.sql         # Schema DB (medicamentos JSONB, RLS, triggers)
├── loader.js          # Manual .env loader (compatible con start.bat)
├── start.bat          # Windows: kill PIDs + server + ngrok
├── start.sh           # Linux/Mac: kill PIDs + server
├── package.json       # npm scripts
├── .env.example       # Template con placeholders
├── .env               # Configuración (NO está en repo)
├── .gitignore         # Excluye .env, logs, node_modules
├── .ngrok.yml         # Config ngrok (dominio estático)
├── kapso.yaml         # Vinculado a Kapso proyecto HERMES2.0
├── .kapso/            # Configuración Kapso CLI
│
├── test/
│   ├── test-vitals.js    # Verifica .env, health, archivos, puerto
│   ├── test-ocr.js       # Test pipeline OCR + IA
│   ├── test-kapso.js     # Test conexión Kapso API
│   ├── test-ocr-pipeline.js  # Test completo OCR + envío a OpenRouter
│   └── debug-ocr.js      # Debug detallado de OCR.Space requests
└──
```

## 🚀 Setup para desarrollador

### 1. Clonar e instalar
```bash
git clone https://github.com/DragontoothMS/LabAgent.git
cd LabAgent
```

### 2. Configurar `.env`
```bash
cp .env.example .env
# Editar .env con:
# KAPSO_API_KEY=tu_key_de_kapso
# PHONE_NUMBER_ID=1142197922313572
# OPENROUTER_API_KEY=tu_key_de_openrouter
# AI_MODEL=google/gemma-4-26b-a4b-it:free
# SUPABASE_URL=https://ylkrpzrzzqaqhihmqcwv.supabase.co
# SUPABASE_KEY=tu_service_role_jwt
# OCR_API_KEY=tu_key_de_ocr_space
```

### 3. Aplicar schema en Supabase
- Ir a: https://supabase.com/app/project/hwxtrfkqbqwwpmresdtw/sql  
- Ejecutar el contenido de `schema.sql`

### 4. Iniciar bot
```bash
bash start.sh     # Linux/Mac
start.bat         # Windows
```

### 5. Verificar
```bash
node test-vitals.js
```

## 🧪 Tests incluidos

| Test | Comando | Qué verifica |
|---|---|---|
| `test-vitals.js` | `node test-vitals.js` | .env, health, archivos, puerto |
| `test-ocr.js` | `node test-ocr.js` | Funciones OCR exportadas, prompt definido |
| `test-kapso.js` | `node test-kapso.js` | Conexión a Kapso API, health |
| `test-ocr-pipeline.js` | `node test-ocr-pipeline.js` | Pipeline completo: descargar → OCR → IA |
| `test-key.js` | `node test-key.js` | Test de credenciales |

## 📱 Flujo del bot

```
Usuario → WhatsApp foto de receta → Kapso webhook → server.js
  ↓
webhook POST handler parsea payload (Kapso o Meta format)
  ↓
processImageMessage(from, imageId, imageUrl)
  ↓
downloadMedia(imageId) → obtiene URL de imagen
  ↓
procesarRecetaImagen(from, imageUrl)
  ↓
ocr.procesarRecetaManuscrita(imageUrl, AI_MODEL, OPENROUTER_API_KEY)
  ├── downloadImageAsBase64(imageUrl)
  ├── ocrSpaceParse(base64) → texto extraído
  └── interpretarConIA(ocrText, imageUrl, AI_MODEL, OPENROUTER_API_KEY)
      └── envía a OpenRouter → JSON estructurado
  ↓
supabase.saveReceta(recetaData) → guarda en tabla recetas_medicas
  ↓
sendMessage(from, formatearRecetaProcesada(recetaData)) → WhatsApp
```

## ⚡ Comandos de utilidad

```bash
# Ver logs en tiempo real
tail -f bot.log

# Ver ngrok tunnels
curl http://127.0.0.1:4040/api/tunnels

# Test health endpoints
curl http://127.0.0.1:3458/health
curl https://hungerless-uncrystalled-andy.ngrok-free.dev/health

# Simular webhook de texto
curl -X POST http://127.0.0.1:3458/webhook \
  -H "Content-Type: application/json" \
  -d '{"message":{"from":"59177858907","id":"test_001","text":{"body":"Hola"}}}'

# Simular webhook de imagen
curl -X POST http://127.0.0.1:3458/webhook \
  -H "Content-Type: application/json" \
  -d '{"message":{"from":"59177858907","id":"test_img","image":{"id":"img_1","link":"https://example.com/receta.jpg"},"caption":"foto"}}'
```

## 🔧 Tecnologías

- **Runtime**: Node.js ≥18
- **WhatsApp API**: Kapso CLI (`@kapso/cli` 0.17.1)
- **AI Provider**: OpenRouter (`google/gemma-4-26b-a4b-it:free`)
- **OCR**: OCR.Space API
- **Database**: Supabase (PostgreSQL REST API)
- **Tunneling**: ngrok (dominio estático gratuito)
