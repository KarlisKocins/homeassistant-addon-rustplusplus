#!/usr/bin/env bash
set -euo pipefail

IMAGE_TAG="${IMAGE_TAG:-rustplusplus-addon-smoke:local}"
CONTAINER_NAME="${CONTAINER_NAME:-rustplusplus-smoke-$RANDOM}"
STARTUP_WAIT_SECONDS="${STARTUP_WAIT_SECONDS:-30}"
LOG_TAIL_LINES="${LOG_TAIL_LINES:-200}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TMP_DIR="$(mktemp -d)"

cleanup() {
  docker rm -f "$CONTAINER_NAME" >/dev/null 2>&1 || true
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

cat > "$TMP_DIR/options.json" <<'JSON'
{
  "discord_client_id": "000000000000000000",
  "discord_token": "dummy_token_for_smoke_test",
  "log_level": "info",
  "mqtt_host": "core-mosquitto",
  "mqtt_port": 1883,
  "mqtt_username": "",
  "mqtt_password": "",
  "mqtt_discovery": false,
  "webui_enabled": false,
  "webui_port": 3001,
  "database_path": "/data/statistics.db"
}
JSON

echo "[smoke] Building add-on image: $IMAGE_TAG"
docker build -t "$IMAGE_TAG" "$REPO_ROOT" >/dev/null

echo "[smoke] Starting container: $CONTAINER_NAME"
docker run -d \
  --name "$CONTAINER_NAME" \
  -v "$TMP_DIR:/data" \
  "$IMAGE_TAG" >/dev/null

echo "[smoke] Waiting ${STARTUP_WAIT_SECONDS}s for early-exit detection"
for _ in $(seq 1 "$STARTUP_WAIT_SECONDS"); do
  status="$(docker inspect -f '{{.State.Status}}' "$CONTAINER_NAME" 2>/dev/null || echo missing)"
  if [[ "$status" != "running" ]]; then
    echo "[smoke] Container exited early (status: $status)"
    docker logs "$CONTAINER_NAME" 2>&1 || true
    exit 1
  fi
  sleep 1
done

logs="$(docker logs "$CONTAINER_NAME" 2>&1 || true)"
echo "$logs" | tail -n "$LOG_TAIL_LINES"

if ! grep -q "Launching RustPlusPlus" <<< "$logs"; then
  echo "[smoke] Expected startup log line not found."
  exit 1
fi

if ! grep -q "ts-node" <<< "$logs"; then
  echo "[smoke] Expected npm start command output not found."
  exit 1
fi

echo "[smoke] PASS: add-on container stayed up and reached app launch."
