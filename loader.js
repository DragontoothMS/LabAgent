// Cargar .env manualmente (compatible con start.bat)
const fs = require("fs");
const path = require("path");
const envPath = path.join(__dirname, ".env");

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf8");
  const envLines = envContent.split("\n");
  for (const envLine of envLines) {
    const trimmed = envLine.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx > 0) {
      const key = trimmed.substring(0, eqIdx).trim();
      const val = trimmed.substring(eqIdx + 1).trim();
      if (!process.env[key]) { process.env[key] = val; }
    }
  }
}
