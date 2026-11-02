#!/usr/bin/env bash
set -euo pipefail

SCRAPER_ROOT="${SCRAPER_ROOT:-/opt/ai-resume-job-scraper}"
SCRAPER_ENV_FILE="${SCRAPER_ENV_FILE:-/etc/ai-resume-job-scraper.env}"

if [[ ! -f "$SCRAPER_ENV_FILE" ]]; then
  echo "Missing $SCRAPER_ENV_FILE" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$SCRAPER_ENV_FILE"
set +a

SCRAPER_MODE="${1:-${SCRAPER_MODE:-full}}"
case "$SCRAPER_MODE" in
  full|new|daily) ;;
  *)
    echo "Usage: $0 [full|new|daily]" >&2
    exit 2
    ;;
esac

exec "$SCRAPER_ROOT/venv/bin/python" "$SCRAPER_ROOT/onlinejobs_scraper.py" "$SCRAPER_MODE"
