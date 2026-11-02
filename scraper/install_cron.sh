#!/usr/bin/env bash
set -euo pipefail

SCRAPER_ROOT="${SCRAPER_ROOT:-/opt/ai-resume-job-scraper}"
SCRAPER_ENV_FILE="${SCRAPER_ENV_FILE:-/etc/ai-resume-job-scraper.env}"
CRON_FILE="/etc/cron.d/ai-resume-job-scraper"
LOG_FILE="/var/log/ai-resume-job-scraper.log"

[[ "$(id -u)" == "0" ]] || { echo "Run as root." >&2; exit 1; }
[[ -x "$SCRAPER_ROOT/venv/bin/python" ]] || { echo "Missing $SCRAPER_ROOT/venv/bin/python" >&2; exit 1; }
[[ -f "$SCRAPER_ROOT/onlinejobs_scraper.py" ]] || { echo "Missing scraper source." >&2; exit 1; }
[[ -f "$SCRAPER_ENV_FILE" ]] || { echo "Missing $SCRAPER_ENV_FILE" >&2; exit 1; }

touch "$LOG_FILE"
chmod 600 "$LOG_FILE"

printf '%s\n' \
  'SHELL=/bin/bash' \
  'PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin' \
  'MAILTO=""' \
  "15,45 * * * * root /usr/bin/flock -n /run/lock/ai-resume-job-scraper.lock /bin/bash $SCRAPER_ROOT/run.sh new >> $LOG_FILE 2>&1" \
  "5 3 * * * root /usr/bin/flock -n /run/lock/ai-resume-job-scraper.lock /bin/bash $SCRAPER_ROOT/run.sh daily >> $LOG_FILE 2>&1" \
  > "$CRON_FILE"

chmod 644 "$CRON_FILE"
echo "Installed 30-minute new-listing and daily refresh cron: $CRON_FILE"
