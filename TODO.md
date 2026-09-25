# Laboratorio Bot - TODO para desarrollador

## 📋 Estado del proyecto

**Repo**: https://github.com/DragontoothMS/LabAgent  
**Branch**: `main` (commit `a3d9e2f`)  
**Server**: ✅ Corriendo local en puerto 3458  
**ngrok**: ✅ Público en `https://hungerless-uncrystalled-andy.ngrok-free.dev`

## 🎯 Qué YA funciona (✅ verificado)

1. **Webhook HTTP** - server.js recibe y parsea webhooks de Kapso
2. **Kapso API Auth** - `KAPSO_API_KEY` validada (no da 401 para GET)
3. **WhatsApp media download** - `downloadMedia()` obtiene URL de imágenes
4. **OCR.Space integration** - descarga imagen → base64 → OCR.Space text extraction
5. **OpenRouter IA pipeline** - `interpretarConIA()` envía texto a `google/gemma-4-26b-a4b-it:free`
6. **Supabase client** - REST client configurado con service_role key
7. **Prompt de extracción** - `prompt-base.js` produce JSON estructurado de recetas
8. **Supabase schema** - tabla `recetas_medicas` con medicamentos JSONB
9. **Start scripts** - `start.bat` (Windows) + `start.sh` (Linux) con kill de PIDs previos
10. **Tests** - `test-vitals.js`, `test-ocr.js`, `test-kapso.js` todos pasan

## 🐛 Issues conocidos (NO arreglados - para continuar)

### 🔴 `downloadMedia()` usa Authorization: Bearer (401)
- **Archivo**: `server.js`, línea ~139
- **Problema**: Envía header `Authorization: 'Bearer ' + KAPSO_API_KEY` que da 401
- **Fix sugerido**: Usar solo `X-API-Key: KAPSO_API_KEY` (la key funciona con ese header)

### 🔴 `sendMessage()` incluye Authorization redundante
- **Archivo**: `server.js`, línea ~64
- **Problema**: Incluye header `Authorization: 'Bearer ***' además de `X-API-Key`
- **Status**: Actualmente funciona con error 401, pero el envío sigue (Kapso ignora el header?)
- **Fix sugerido**: Remover `'Authorization'` del header (ya es redundante con `X-API-Key`)

### 🟡 `ocr.js` usa var global OCR_API_KEY
- **Archivo**: `ocr.js`
- **Status**: ✅ Funciona (key cargada vía `process.env.OCR_API_KEY`)
- **Note**: La key OCR.Space (`***`) está configurada en `.env`

### 🟡 Testeo con imagen REAL de receta
- **Status**: Testeado con httpbin.org (imagen PNG) — OCR.Space funciona
- **Pendiente**: Probar con imagen REAL de receta manuscrita subir por WhatsApp

## 📁 Archivos en el repo

| Archivo | Función |
|---|---|
| `server.js` | Webhook HTTP + Kapso API client + pipeline de recetas |
| `ocr.js` | OCR.Space + OpenRouter IA (letra de doctor → JSON) |
| `prompt-base.js` | Prompt de extracción de recetas médicas |
| `supabase-client.js` | REST client → tabla `recetas_medicas` |
| `schema.sql` | Schema DB (medicamentos JSONB, RLS, triggers) |
| `loader.js` | Loader manual de `.env` |
| `start.bat` | Windows start (kill PIDs + server + ngrok) |
| `start.sh` | Linux/Mac start (kill PIDs + server) |
| `package.json` | npm scripts |
| `test-*.js` | Tests de verificación |
| `debug-ocr.js`, `test-ocr-*.js` | Herramientas de debug |
| `.env.example` | Template de configuración |
| `.gitignore` | Excluye .env, logs, node_modules |
| `.ngrok.yml` | Config ngrok (dominio estático) |
| `kapso.yaml`, `.kapso/` | Configuración Kapso CLI |

## 🚀 Setup para desarrollador

### 1. Clonar
```bash
git clone https://github.com/DragontoothMS/LabAgent.git
cd LabAgent
```

### 2. Configurar `.env`
```bash
cp .env.example .env
# Editar .env con:
# KAPSO_API_KEY=(obtener de https://app.kapso.ai)
# PHONE_NUMBER_ID=1142197922313572
# OPENROUTER_API_KEY=(obtener de https://openrouter.ai/keys)
# AI_MODEL=google/gemma-4-26b-a4b-it:free
# SUPABASE_URL=https://ylkrpzrzzqaqhihmqcwv.supabase.co
# SUPABASE_KEY=(service_role JWT de https://supabase.com/app/project/_/settings/api)
# OCR_API_KEY=(obtener de https://ocr.space/ocrapi)
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
| `test-ocr-pipeline.js` | `node test-ocr-pipeline.js` | Pipeline completo: descargar → OCR → enviar a IA |
| `debug-ocr.js` | `node debug-ocr.js` | Debug detallado de OCR.Space requests |

## 📱 Flujo del bot (actual)

```
Usuario envía foto de receta → Kapso webhook → server.js
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

## 🐛 Fixes pendientes (issues conocidos)

1. **`server.js:139`** - `downloadMedia()` debe usar solo `X-API-Key` (quitar `Authorization: Bearer`)
2. **`server.js:64`** - `sendMessage()` header `Authorization` es redundante (Kapso funciona con solo `X-API-Key`)
3. **`server.js:21`** - AI_MODEL fallback dice `'poolside/laguna-s-2.1:free'` → cambiar a `'google/gemma-4-26b-a4b-it:free'`

## ⚡ Comandos de utilidad

```bash
# Ver logs en tiempo real
tail -f bot.log

# Ver ngrok tunnels
curl http://127.0.0.1:4040/api/tunnels

# Test health
curl http://127.0.0.1:3458/health

# Simular webhook (texto)
curl -X POST http://127.0.0.1:3458/webhook \
  -H "Content-Type: application/json" \
  -d '{"message":{"from":"59177858907","id":"test_001","text":{"body":"Hola"}}}'

# Simular webhook (imagen)
curl -X POST http://127.0.0.1:3458/webhook \
  -H "Content-Type: application/json" \
  -d '{"message":{"from":"59177858907","id":"test_img","image":{"id":"test_img_1","link":"https://example.com/receta.jpg"},"caption":"foto"}}'
```
