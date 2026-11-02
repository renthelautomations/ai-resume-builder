# OnlineJobs.ph scraper

This worker fetches public OnlineJobs.ph listings with Scrapling, classifies niches with JEV, and upserts jobs into Supabase.

The worker follows `robots.txt`, enforces at least five seconds between requests, and stops on HTTP 403 or 429. It does not log in, solve CAPTCHAs, or bypass access controls.

Each run upserts jobs posted within `ONLINEJOBS_LOOKBACK_DAYS` days. A job stays in database history, but becomes inactive when it disappears for `ONLINEJOBS_STALE_HOURS` or fails a daily detail-page closure check. The closure check marks HTTP 404/410 pages and explicit closed or filled notices inactive.

## Local dry run

```bash
python3 -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
cp env.example .env.scraper
set -a
. .env.scraper
set +a
SCRAPER_DRY_RUN=true python onlinejobs_scraper.py
```

## VPS setup

```bash
apt-get update
apt-get install -y python3.12-venv util-linux
mkdir -p /opt/ai-resume-job-scraper
python3 -m venv /opt/ai-resume-job-scraper/venv
/opt/ai-resume-job-scraper/venv/bin/pip install -r /opt/ai-resume-job-scraper/requirements.txt
install -m 600 env.example /etc/ai-resume-job-scraper.env
nano /etc/ai-resume-job-scraper.env
chmod 700 /opt/ai-resume-job-scraper/run.sh /opt/ai-resume-job-scraper/install_cron.sh
/opt/ai-resume-job-scraper/install_cron.sh
```

Set these values in `/etc/ai-resume-job-scraper.env`:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `TYPESAFE_API_KEY` or `JEV_API_KEY`

The Supabase service-role key and JEV key stay on the VPS. Never prefix either key with `VITE_`.

The hourly cron runs closure checks for records due after `ONLINEJOBS_CLOSURE_CHECK_HOURS`. The default checks each active job about once daily.

## Manual run and logs

```bash
/opt/ai-resume-job-scraper/run.sh
tail -f /var/log/ai-resume-job-scraper.log
```

The first run can take several minutes because the source requires a five-second crawl delay.
