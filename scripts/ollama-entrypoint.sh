#!/bin/sh
# =============================================================================
# Ollama Entrypoint — Auto-pull required models on first start
# =============================================================================
# This script starts Ollama and ensures all required models are available.
# Models are stored in a named volume, so they only download once.
# =============================================================================

MODELS="qwen2.5:7b"

# Start Ollama in the background so we can issue pull commands against it
ollama serve &
OLLAMA_PID=$!

# Wait until the Ollama API is ready
echo "⏳ Waiting for Ollama to start..."
until curl -sf http://localhost:11434/api/tags > /dev/null 2>&1; do
  sleep 1
done
echo "✅ Ollama is up"

# Pull each model if not already present in the volume
for MODEL in $MODELS; do
  if ollama list | grep -q "^$MODEL"; then
    echo "✅ Model already present: $MODEL"
  else
    echo "⬇️  Pulling model: $MODEL (this only happens once)"
    ollama pull "$MODEL"
  fi
done

echo "🚀 All models ready — Ollama is serving"

# Hand off to the Ollama process (keeps container alive)
wait $OLLAMA_PID
