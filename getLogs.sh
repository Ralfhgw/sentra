#!/bin/bash

set -euo pipefail

AUTH_DIR="/home/deploy/sentra/authServer"
MICRO_DIR="/home/deploy/sentra/microservice"
PM2_APP="sentra"
TAIL_LINES="${TAIL_LINES:-100}"

show_compose_logs() {
  local dir="$1"
  local service="$2"

  echo "-> Logs ${service}"
  cd "$dir" || exit 1

  timeout 10 docker compose logs --tail "${TAIL_LINES:-100}" --no-color "$service" || \
    echo "Konnte Logs von ${service} nicht sauber lesen"
  echo
}

follow_compose_logs() {
  local dir="$1"
  local service="$2"

  echo "-> Follow ${service}"
  cd "$dir" || exit 1
  docker compose logs -f --tail "${TAIL_LINES:-100}" --no-color "$service"
}

clear_compose_logs() {
  local dir="$1"
  local service="$2"

  cd "$dir" || exit 1

  local container_id
  container_id="$(docker compose ps -q "$service")"

  if [[ -z "$container_id" ]]; then
    echo "Kein Container fuer ${service} gefunden"
    return
  fi

  local log_path
  log_path="$(docker inspect -f '{{.LogPath}}' "$container_id")"

  if [[ -z "$log_path" ]]; then
    echo "Keine LogPath fuer ${service} gefunden"
    return
  fi

  if ! sudo test -e "$log_path"; then
    echo "Log-Datei fuer ${service} nicht zugreifbar"
    return
  fi

  sudo truncate -s 0 "$log_path"

  echo "Starte ${service} neu, damit Docker die Logdatei sauber neu oeffnet"
  docker compose restart "$service"
}


confirm_clear() {
  read -r -p "Willst du wirklich Docker- und PM2-Logs leeren? [y/N] " answer
  [[ "$answer" =~ ^[Yy]$ ]]
}

show_all_logs() {
  echo "===== AUTH SERVER ====="
  show_compose_logs "$AUTH_DIR" "app"
  show_compose_logs "$AUTH_DIR" "db"

  echo "===== MICROSERVICE ====="
  show_compose_logs "$MICRO_DIR" "db"
  show_compose_logs "$MICRO_DIR" "mediamtx"
  show_compose_logs "$MICRO_DIR" "livetalk"
  show_compose_logs "$MICRO_DIR" "coturn"
  show_compose_logs "$MICRO_DIR" "mosquitto"

  echo "===== PM2 ====="
  pm2 logs "$PM2_APP" --lines "$TAIL_LINES" --nostream
}

clear_all_logs() {
  if ! confirm_clear; then
    echo "Abgebrochen"
    exit 0
  fi

  echo "===== AUTH SERVER ====="
  clear_compose_logs "$AUTH_DIR" "app"
  clear_compose_logs "$AUTH_DIR" "db"

  echo "===== MICROSERVICE ====="
  clear_compose_logs "$MICRO_DIR" "db"
  clear_compose_logs "$MICRO_DIR" "mediamtx"
  clear_compose_logs "$MICRO_DIR" "livetalk"
  clear_compose_logs "$MICRO_DIR" "coturn"
  clear_compose_logs "$MICRO_DIR" "mosquitto"

  echo "===== PM2 ====="
  pm2 flush "$PM2_APP"

  echo "Logs wurden geleert"
}

case "${1:-show}" in
  show)
    show_all_logs
    ;;
  clear)
    clear_all_logs
    ;;
  *)
    echo "Usage: $0 [show|clear]"
    exit 1
    ;;
esac