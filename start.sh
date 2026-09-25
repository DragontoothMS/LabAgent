#!/bin/bash
# Start del Laboratorio Bot
# ngrok fijo: https://hungerless-uncrystalled-andy.ngrok-free.dev

PORT=3458

echo "=== Laboratorio Bot - Start ==="

# Matar procesos en el puerto
PIDS=$(netstat -ano 2>/dev/null | grep ":${PORT} " | awk '{print $NF}' | sort -u)
if [ -n "$PIDS" ]; then
  for p in $PIDS; do
    echo "Matando PID $p en puerto $PORT"
    taskkill //F //PID $p 2>/dev/null
  done
  sleep 1
fi

echo "Iniciando server en puerto $PORT..."
exec node server.js
