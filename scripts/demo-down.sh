#!/usr/bin/env bash
# =============================================================================
# KI Translator KMU — Demo Teardown
# =============================================================================
# Reverses scripts/demo-setup.sh. Invoked by `pnpm demo:down`.
#
# By default the data volumes survive, so the next `pnpm demo` starts in seconds
# with the demo's translation history intact. Pass --purge to reclaim the disk:
#
#   pnpm demo:down -- --purge
#
# --purge deletes the local database and, if the containerised Ollama was used,
# its ~4.7 GB model volume. A natively installed Ollama is never touched — the
# setup script does not manage it and must not delete models it did not download.
# =============================================================================
set -euo pipefail

cd "$(dirname "$0")/.."

# Scanned rather than read off $1: `pnpm demo:down -- --purge` forwards the `--`
# itself as the first argument.
PURGE=false
for arg in "$@"; do
  if [ "$arg" = "--purge" ]; then PURGE=true; fi
done

if ! docker info > /dev/null 2>&1; then
  echo "Docker läuft nicht — es gibt nichts zu stoppen." >&2
  exit 0
fi

# No-op when the native Ollama path was taken and this container never existed.
docker compose --profile ollama down --remove-orphans

if [ "$PURGE" = true ]; then
  pnpm exec supabase stop --no-backup
  docker volume rm -f ki-uebersetzer-kmu_ollama_models > /dev/null 2>&1 || true
  echo "Datenvolumes entfernt."
else
  pnpm exec supabase stop
fi

rm -f .env.development.local

echo "Demo gestoppt."
