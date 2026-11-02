# OnlineJobs.ph scraper

This worker fetches public OnlineJobs.ph listings with Scrapling, classifies niches with JEV, and upserts jobs into Supabase.

The worker follows `robots.txt`, enforces at least five seconds between requests, and stops on HTTP 403 or 429. It does not log in, solve CAPTCHAs, or bypass access controls.

Detail enrichment stores full public job descriptions for the detail page. Keep `ONLINEJOBS_DETAIL_LIMIT` at least equal to `ONLINEJOBS_MAX_JOBS` when each synced listing needs full text.

The worker has three modes:

- `new` scans recent listings, filters known `external_id` values against Supabase, classifies only new jobs, and upserts only new jobs.
- `daily` refreshes active detail pages, updates changed descriptions and tags, reclassifies changed content, and marks closed jobs inactive.
- `full` performs the original lookback sync for manual recovery or initial seeding.

The installed cron runs `new` every 30 minutes at minutes 15 and 45. It runs `daily` at 03:05 in the VPS timezone. Daily refreshes update `last_seen_at`, so active jobs do not become stale while their source pages remain available. A job stays in database history, but becomes inactive after `ONLINEJOBS_STALE_HOURS` without a successful observation. HTTP 404/410 responses and explicit closed or filled notices also mark jobs inactive.

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

JEV classifies new jobs and changed listings. Supabase `external_id` identifies a listing, while `content_hash` identifies changed content. JEV does not decide whether a listing is new or closed.

## Manual run and logs

```bash
/opt/ai-resume-job-scraper/run.sh new
/opt/ai-resume-job-scraper/run.sh daily
tail -f /var/log/ai-resume-job-scraper.log
```

The first run can take several minutes because the source requires a five-second crawl delay.
