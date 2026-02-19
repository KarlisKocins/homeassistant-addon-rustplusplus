#!/usr/bin/env bash
set -euo pipefail

IMAGE_TAG="${IMAGE_TAG:-rustplusplus-addon-smoke:local}"
CONTAINER_NAME="${CONTAINER_NAME:-rustplusplus-smoke-$RANDOM}"
SUPERVISOR_CONTAINER_NAME="${SUPERVISOR_CONTAINER_NAME:-rustplusplus-supervisor-smoke-$RANDOM}"
NETWORK_NAME="${NETWORK_NAME:-rustplusplus-smoke-net-$RANDOM}"
MOCK_SUPERVISOR_PORT="${MOCK_SUPERVISOR_PORT:-8080}"
SUPERVISOR_API="${SUPERVISOR_API:-http://supervisor:${MOCK_SUPERVISOR_PORT}}"
STARTUP_TIMEOUT_SECONDS="${STARTUP_TIMEOUT_SECONDS:-45}"
LOG_TAIL_LINES="${LOG_TAIL_LINES:-200}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TMP_DIR="$(mktemp -d)"

cleanup() {
  docker rm -f "$SUPERVISOR_CONTAINER_NAME" >/dev/null 2>&1 || true
  docker rm -f "$CONTAINER_NAME" >/dev/null 2>&1 || true
  docker network rm "$NETWORK_NAME" >/dev/null 2>&1 || true
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

cat > "$TMP_DIR/mock-supervisor.js" <<'JS'
const fs = require("fs");
const http = require("http");

const port = Number(process.env.MOCK_SUPERVISOR_PORT || "8080");

function readOptions() {
  try {
    const raw = fs.readFileSync("/data/options.json", "utf8");
    return JSON.parse(raw);
  } catch (error) {
    return {};
  }
}

const server = http.createServer((req, res) => {
  if (req.method === "GET" && req.url === "/addons/self/options/config") {
    const body = JSON.stringify({ result: "ok", data: readOptions() });
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(body);
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ result: "error", message: "not found" }));
});

server.listen(port, "0.0.0.0", () => {
  console.log(`[mock-supervisor] listening on ${port}`);
});
JS

echo "[smoke] Building add-on image: $IMAGE_TAG"
docker build -t "$IMAGE_TAG" "$REPO_ROOT" >/dev/null

echo "[smoke] Creating Docker network: $NETWORK_NAME"
docker network create "$NETWORK_NAME" >/dev/null

echo "[smoke] Starting mock Supervisor: $SUPERVISOR_CONTAINER_NAME"
docker run -d \
  --name "$SUPERVISOR_CONTAINER_NAME" \
  --network "$NETWORK_NAME" \
  -e MOCK_SUPERVISOR_PORT="$MOCK_SUPERVISOR_PORT" \
  -v "$TMP_DIR:/data:ro" \
  "$IMAGE_TAG" \
  node /data/mock-supervisor.js >/dev/null

echo "[smoke] Waiting for mock Supervisor readiness"
for _ in $(seq 1 10); do
  if docker logs "$SUPERVISOR_CONTAINER_NAME" 2>&1 | grep -q "listening on"; then
    break
  fi
  sleep 1
done

echo "[smoke] Starting container: $CONTAINER_NAME"
docker run -d \
  --name "$CONTAINER_NAME" \
  --network "$NETWORK_NAME" \
  -e SUPERVISOR_API="$SUPERVISOR_API" \
  -v "$TMP_DIR:/data" \
  "$IMAGE_TAG" >/dev/null

echo "[smoke] Waiting up to ${STARTUP_TIMEOUT_SECONDS}s for startup"
startup_detected=0
for _ in $(seq 1 "$STARTUP_TIMEOUT_SECONDS"); do
  logs="$(docker logs "$CONTAINER_NAME" 2>&1 || true)"
  status="$(docker inspect -f '{{.State.Status}}' "$CONTAINER_NAME" 2>/dev/null || echo missing)"

  if grep -q "Failed to get addon config from Supervisor API" <<< "$logs"; then
    echo "[smoke] Add-on could not load config from Supervisor API."
    echo "$logs" | tail -n "$LOG_TAIL_LINES"
    exit 1
  fi

  if grep -q "FATAL:" <<< "$logs"; then
    echo "[smoke] Fatal startup log detected."
    echo "$logs" | tail -n "$LOG_TAIL_LINES"
    exit 1
  fi

  if grep -q "Launching RustPlusPlus" <<< "$logs" && grep -q "ts-node" <<< "$logs"; then
    startup_detected=1
    break
  fi

  if [[ "$status" != "running" ]]; then
    echo "[smoke] Container exited early (status: $status)"
    echo "$logs" | tail -n "$LOG_TAIL_LINES"
    exit 1
  fi
  sleep 1
done

logs="$(docker logs "$CONTAINER_NAME" 2>&1 || true)"
echo "$logs" | tail -n "$LOG_TAIL_LINES"

if [[ "$startup_detected" -ne 1 ]]; then
  echo "[smoke] Startup markers were not detected within timeout."
  exit 1
fi

echo "[smoke] PASS: add-on bootstrap reached run.sh -> npm start path."
