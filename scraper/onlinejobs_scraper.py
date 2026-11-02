#!/usr/bin/env python3
"""Fetch public OnlineJobs.ph listings and upsert normalized jobs into Supabase."""

from __future__ import annotations

import hashlib
import json
import logging
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.robotparser
import urllib.request
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Iterable
from zoneinfo import ZoneInfo

from scrapling.fetchers import Fetcher


LOGGER = logging.getLogger("onlinejobs-scraper")
SOURCE = "onlinejobs.ph"
BASE_URL = "https://www.onlinejobs.ph"
SEARCH_URL = f"{BASE_URL}/jobseekers/jobsearch"
USER_AGENT = (
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/131.0 Safari/537.36"
)
SOURCE_TIMEZONE = ZoneInfo("Asia/Manila")
PAGE_SIZE = 30
DEFAULT_CRAWL_DELAY = 5.0
DETAIL_SELECTORS = (
    ".job-description",
    "#job-description",
    ".jobpost-description",
)
SALARY_PATTERN = re.compile(
    r"(?i)(?:[$₱€£]\s?[\d,.]+(?:\s*[-–]\s*[$₱€£]?\s?[\d,.]+)?\s*"
    r"(?:/\s*(?:hr|hour|day|week|month|mo|year|project))?)"
)
POSTED_PATTERN = re.compile(r"Posted on\s+(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})", re.I)
JOB_ID_PATTERN = re.compile(r"-(\d+)(?:/)?$")

FALLBACK_RULES: tuple[tuple[str, tuple[str, ...]], ...] = (
    (
        "AI & Automation",
        (
            "artificial intelligence",
            "machine learning",
            "prompt engineer",
            "prompting",
            "automation",
            "chatbot",
            "chat bot",
            "ai agent",
            "n8n",
            "zapier",
            "make.com",
        ),
    ),
    (
        "Development & IT",
        (
            "software engineer",
            "developer",
            "programmer",
            "react",
            "javascript",
            "python",
            "wordpress developer",
            "devops",
            "cybersecurity",
            "technical support",
        ),
    ),
    (
        "Data & Analytics",
        (
            "data analyst",
            "data scientist",
            "business intelligence",
            "power bi",
            "tableau",
            "dashboard",
            "sql analyst",
            "research analyst",
        ),
    ),
    (
        "Customer Support",
        (
            "customer service",
            "customer support",
            "chat support",
            "call center",
            "customer success",
            "help desk",
        ),
    ),
    (
        "Sales & Business Development",
        (
            "sales",
            "lead generation",
            "appointment setter",
            "business development",
            "account manager",
            "closer",
        ),
    ),
    (
        "Marketing & SEO",
        (
            "digital marketing",
            "seo",
            "social media",
            "paid ads",
            "facebook ads",
            "email marketing",
            "growth marketing",
        ),
    ),
    (
        "Design & Creative",
        (
            "graphic design",
            "graphic designer",
            "ui/ux",
            "user experience",
            "figma",
            "video editor",
            "animation",
            "illustrator",
            "branding",
        ),
    ),
    (
        "Writing & Content",
        (
            "copywriter",
            "copywriting",
            "content writer",
            "content writing",
            "blog writer",
            "proofreader",
            "editor",
            "technical writer",
        ),
    ),
    (
        "Finance & Accounting",
        (
            "bookkeeper",
            "bookkeeping",
            "accountant",
            "accounting",
            "payroll",
            "accounts payable",
            "accounts receivable",
        ),
    ),
    (
        "E-commerce",
        (
            "shopify",
            "amazon store",
            "ecommerce",
            "e-commerce",
            "product listing",
            "online store",
            "marketplace",
        ),
    ),
    (
        "Virtual Assistance & Admin",
        (
            "virtual assistant",
            "virtual assistance",
            "data entry",
            "administrative assistant",
            "admin assistant",
            "transcription",
            "appointment scheduling",
            "inbox management",
        ),
    ),
    (
        "Operations & Project Management",
        (
            "project manager",
            "project management",
            "operations manager",
            "operations assistant",
            "process improvement",
            "recruiter",
            "recruiting",
        ),
    ),
    (
        "Education & Training",
        (
            "teacher",
            "tutor",
            "teaching",
            "instructional design",
            "course creator",
            "online class",
            "coach",
        ),
    ),
)


def env_bool(name: str, default: bool) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def env_int(name: str, default: int, minimum: int = 0) -> int:
    try:
        return max(minimum, int(os.getenv(name, str(default))))
    except ValueError:
        return default


def env_float(name: str, default: float, minimum: float = 0.0) -> float:
    try:
        return max(minimum, float(os.getenv(name, str(default))))
    except ValueError:
        return default


def clean_text(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, (list, tuple, set)):
        value = " ".join(str(item) for item in value)
    return re.sub(r"\s+", " ", str(value)).strip()


def element_attribute(element: Any, name: str) -> str:
    try:
        value = element[name]
        return clean_text(value)
    except (KeyError, IndexError, TypeError, AttributeError):
        return ""


def first_element_text(root: Any, selector: str) -> str:
    try:
        matches = root.css(selector)
    except Exception:
        return ""
    if not matches:
        return ""
    try:
        return clean_text(matches[0].get_all_text())
    except (AttributeError, IndexError, TypeError):
        return ""


def unique_text(values: Iterable[str], limit: int = 20) -> list[str]:
    output: list[str] = []
    seen: set[str] = set()
    for value in values:
        normalized = clean_text(value)
        key = normalized.casefold()
        if not normalized or key in seen or len(normalized) > 100:
            continue
        seen.add(key)
        output.append(normalized)
        if len(output) >= limit:
            break
    return output


def extract_tags(root: Any) -> list[str]:
    try:
        matches = root.css('a[href*="/jobseekers/search/c/"]')
    except Exception:
        return []
    values: list[str] = []
    for match in matches:
        try:
            values.append(match.get_all_text())
        except AttributeError:
            continue
    return unique_text(values)


def parse_posted_at(value: str) -> str | None:
    match = POSTED_PATTERN.search(value)
    if not match:
        return None
    try:
        parsed = datetime.strptime(match.group(1), "%Y-%m-%d %H:%M:%S")
        return parsed.replace(tzinfo=SOURCE_TIMEZONE).astimezone(timezone.utc).isoformat()
    except ValueError:
        return None


def extract_salary(value: str) -> str | None:
    match = SALARY_PATTERN.search(value)
    return clean_text(match.group(1)) if match else None


def trim_detail_text(value: str) -> str:
    text = clean_text(value)
    for marker in ("APPLY HERE:", "VIEW OTHER JOB POSTS FROM:", "Why is this blurred?"):
        marker_index = text.casefold().find(marker.casefold())
        if marker_index > 0:
            text = text[:marker_index].strip()
    return text[:40000]


def hash_job(title: str, description: str, tags: Iterable[str]) -> str:
    material = json.dumps(
        {
            "title": clean_text(title),
            "description": clean_text(description),
            "tags": sorted(unique_text(tags)),
        },
        ensure_ascii=False,
        sort_keys=True,
    ).encode("utf-8")
    return hashlib.sha256(material).hexdigest()


@dataclass
class JobRecord:
    external_id: str
    title: str
    job_url: str
    description: str
    company: str | None = None
    location: str | None = "Remote"
    employment_type: str | None = None
    salary_text: str | None = None
    posted_at: str | None = None
    source_tags: list[str] = field(default_factory=list)
    category: str = "Other"
    category_confidence: float | None = None
    content_hash: str = ""

    def refresh_hash(self) -> None:
        self.content_hash = hash_job(self.title, self.description, self.source_tags)

    def payload(self, seen_at: str) -> dict[str, Any]:
        return {
            "source": SOURCE,
            "external_id": self.external_id,
            "title": self.title,
            "company": self.company,
            "location": self.location,
            "job_url": self.job_url,
            "description": self.description or self.title,
            "employment_type": self.employment_type,
            "salary_text": self.salary_text,
            "category": self.category,
            "category_confidence": self.category_confidence,
            "source_tags": self.source_tags,
            "content_hash": self.content_hash,
            "posted_at": self.posted_at,
            "is_active": True,
            "last_seen_at": seen_at,
            "scraped_at": seen_at,
        }


class RobotsPolicy:
    def __init__(self, parser: urllib.robotparser.RobotFileParser, crawl_delay: float):
        self.parser = parser
        self.crawl_delay = max(DEFAULT_CRAWL_DELAY, crawl_delay)

    @classmethod
    def load(cls, timeout: int) -> "RobotsPolicy":
        robots_url = f"{BASE_URL}/robots.txt"
        request = urllib.request.Request(
            robots_url,
            headers={
                "User-Agent": USER_AGENT,
                "Accept": "text/plain,*/*;q=0.8",
            },
        )
        try:
            with urllib.request.urlopen(request, timeout=timeout) as response:
                status = int(getattr(response, "status", 200))
                if status >= 400:
                    raise RuntimeError(f"robots.txt returned HTTP {status}")
                body = response.read().decode("utf-8", errors="replace")
        except (OSError, urllib.error.URLError) as error:
            raise RuntimeError(f"Could not read {robots_url}: {error}") from error

        parser = urllib.robotparser.RobotFileParser()
        parser.set_url(robots_url)
        parser.parse(body.splitlines())
        crawl_delay = parser.crawl_delay(USER_AGENT) or parser.crawl_delay("*") or DEFAULT_CRAWL_DELAY
        LOGGER.info("robots.txt loaded; crawl delay %.1fs", crawl_delay)
        return cls(parser, float(crawl_delay))

    def allowed(self, url: str) -> bool:
        return self.parser.can_fetch(USER_AGENT, url)


class ScrapeBlocked(RuntimeError):
    pass


class OnlineJobsScraper:
    def __init__(self) -> None:
        self.timeout = env_int("SCRAPER_HTTP_TIMEOUT", 30, minimum=5)
        self.max_pages = env_int("ONLINEJOBS_MAX_PAGES", 3, minimum=1)
        self.max_jobs = env_int("ONLINEJOBS_MAX_JOBS", 90, minimum=1)
        self.fetch_details = env_bool("ONLINEJOBS_FETCH_DETAILS", True)
        self.detail_limit = env_int("ONLINEJOBS_DETAIL_LIMIT", 15, minimum=0)
        self.minimum_delay = env_float(
            "ONLINEJOBS_CRAWL_DELAY_SECONDS",
            DEFAULT_CRAWL_DELAY,
            minimum=DEFAULT_CRAWL_DELAY,
        )
        self.last_request_at = 0.0
        self.robots = RobotsPolicy.load(self.timeout)
        self.delay = max(self.minimum_delay, self.robots.crawl_delay)

    def _wait(self) -> None:
        wait_for = self.delay - (time.monotonic() - self.last_request_at)
        if wait_for > 0:
            time.sleep(wait_for)

    def fetch_page(self, url: str) -> Any:
        if not self.robots.allowed(url):
            raise ScrapeBlocked(f"robots.txt disallows {url}")
        self._wait()
        LOGGER.info("fetching %s", url)
        self.last_request_at = time.monotonic()
        page = Fetcher.get(
            url,
            impersonate="chrome",
            stealthy_headers=True,
            timeout=self.timeout,
            retries=2,
            retry_delay=5,
        )
        status = int(getattr(page, "status", 0) or 0)
        if status in {403, 429}:
            raise ScrapeBlocked(f"OnlineJobs.ph returned HTTP {status} for {url}")
        if status >= 400 or status == 0:
            raise RuntimeError(f"OnlineJobs.ph returned HTTP {status} for {url}")
        return page

    def scrape(self) -> list[JobRecord]:
        jobs: list[JobRecord] = []
        seen_urls: set[str] = set()

        for page_number in range(self.max_pages):
            if len(jobs) >= self.max_jobs:
                break
            offset = page_number * PAGE_SIZE
            url = SEARCH_URL if offset == 0 else f"{SEARCH_URL}/{offset}"
            try:
                page = self.fetch_page(url)
            except ScrapeBlocked:
                LOGGER.exception("scraping stopped because access was blocked")
                break
            except Exception:
                LOGGER.exception("could not fetch listing page")
                break

            cards = page.css('.results > a[href*="/jobseekers/job/"]')
            if not cards:
                LOGGER.warning("no job cards found at %s", url)
                break

            for card in cards:
                if len(jobs) >= self.max_jobs:
                    break
                job = self.parse_card(card)
                if not job or job.job_url in seen_urls:
                    continue
                seen_urls.add(job.job_url)
                jobs.append(job)

            LOGGER.info("collected %d jobs after page %d", len(jobs), page_number + 1)
            if len(cards) < PAGE_SIZE:
                break

        if self.fetch_details and self.detail_limit > 0:
            self.enrich_details(jobs[: self.detail_limit])

        for job in jobs:
            job.refresh_hash()
        return jobs

    def parse_card(self, card: Any) -> JobRecord | None:
        href = element_attribute(card, "href")
        if not href:
            return None
        job_url = urllib.parse.urljoin(BASE_URL, href)
        title = first_element_text(card, "h4")
        if not title:
            return None

        card_text = clean_text(card.get_all_text())
        description = first_element_text(card, "div.fs-14")
        if not description:
            description = first_element_text(card, "div.d-none.d-sm-block")
        description = trim_detail_text(description or card_text)
        description = re.sub(r"\s*See More\s*$", "", description, flags=re.I).strip()

        job_id_match = JOB_ID_PATTERN.search(urllib.parse.urlparse(job_url).path)
        external_id = job_id_match.group(1) if job_id_match else hashlib.sha256(job_url.encode()).hexdigest()[:40]
        posted_at = parse_posted_at(card_text)
        employment_type = first_element_text(card, "span.badge") or None
        tags = extract_tags(card)

        return JobRecord(
            external_id=external_id,
            title=title[:500],
            job_url=job_url,
            description=description[:40000] or title,
            employment_type=employment_type[:120] if employment_type else None,
            salary_text=extract_salary(card_text),
            posted_at=posted_at,
            source_tags=tags,
        )

    def enrich_details(self, jobs: list[JobRecord]) -> None:
        for job in jobs:
            try:
                page = self.fetch_page(job.job_url)
            except ScrapeBlocked:
                LOGGER.exception("detail enrichment stopped because access was blocked")
                break
            except Exception:
                LOGGER.exception("could not enrich %s", job.job_url)
                continue

            detail_description = ""
            for selector in DETAIL_SELECTORS:
                detail_description = trim_detail_text(first_element_text(page, selector))
                if len(detail_description) >= 80:
                    break
            if detail_description:
                job.description = detail_description

            detail_title = first_element_text(page, "h1")
            if detail_title and len(detail_title) <= 500:
                job.title = detail_title

            job.source_tags = unique_text([*job.source_tags, *extract_tags(page)])
            job.refresh_hash()


def load_taxonomy() -> dict[str, str]:
    path = Path(__file__).with_name("category_labels.json")
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        if isinstance(data, dict) and data:
            return {str(key): clean_text(value) for key, value in data.items()}
    except (OSError, json.JSONDecodeError):
        LOGGER.exception("could not load category_labels.json")
    return {"Other": "Roles that do not fit another category clearly."}


def safe_confidence(value: Any) -> float | None:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    return max(0.0, min(1.0, number))


def fallback_category(job: JobRecord, labels: set[str]) -> tuple[str, float]:
    text = clean_text(f"{job.title} {job.description} {' '.join(job.source_tags)}").casefold()
    for label, keywords in FALLBACK_RULES:
        if label in labels and any(keyword in text for keyword in keywords):
            return label, 0.45
    return "Other" if "Other" in labels else next(iter(labels)), 0.25


class JevCategorizer:
    def __init__(self, taxonomy: dict[str, str]) -> None:
        self.taxonomy = taxonomy
        self.labels = set(taxonomy)
        self.api_key = os.getenv("TYPESAFE_API_KEY") or os.getenv("JEV_API_KEY")
        self.base_url = os.getenv("JEV_BASE_URL", "https://api.typesafe.ai/v1/systemone")
        self.model = os.getenv("JEV_MODEL", "jev-latest")
        self.timeout = env_int("SCRAPER_HTTP_TIMEOUT", 30, minimum=5)

    def categorize(self, jobs: list[JobRecord], existing: dict[str, dict[str, Any]]) -> None:
        pending: list[JobRecord] = []
        for job in jobs:
            previous = existing.get(job.external_id)
            previous_category = clean_text(previous.get("category")) if previous else ""
            previous_hash = clean_text(previous.get("content_hash")) if previous else ""
            if previous_hash and previous_hash == job.content_hash and previous_category in self.labels:
                job.category = previous_category
                job.category_confidence = safe_confidence(previous.get("category_confidence"))
            else:
                pending.append(job)

        if self.api_key:
            for start in range(0, len(pending), 8):
                self._categorize_batch(pending[start : start + 8])
        elif pending:
            LOGGER.warning("JEV key missing; deterministic category fallback used")

        for job in pending:
            if job.category not in self.labels:
                job.category, job.category_confidence = fallback_category(job, self.labels)

    def _categorize_batch(self, jobs: list[JobRecord]) -> None:
        state: dict[str, Any] = {}
        questions: dict[str, Any] = {}
        for index, job in enumerate(jobs):
            question_id = f"job_{index}"
            state[question_id] = {
                "title": job.title,
                "description": job.description[:3000],
                "source_tags": job.source_tags,
            }
            questions[question_id] = {
                "type": "choice",
                "instructions": "Choose the single best niche for this public job posting. Return one label only.",
                "criteria": self.taxonomy,
            }

        request_body = {
            "model": self.model,
            "state": state,
            "questions": questions,
        }
        try:
            response = self._request(request_body)
            answers = response.get("answers", {}) if isinstance(response, dict) else {}
            for index, job in enumerate(jobs):
                answer = answers.get(f"job_{index}", {})
                choice = clean_text(answer.get("choice")) if isinstance(answer, dict) else ""
                matched = next((label for label in self.labels if label.casefold() == choice.casefold()), None)
                if matched:
                    job.category = matched
                    job.category_confidence = safe_confidence(answer.get("confidence"))
        except Exception:
            LOGGER.exception("JEV categorization failed; deterministic fallback used")

    def _request(self, body: dict[str, Any]) -> dict[str, Any]:
        request = urllib.request.Request(
            self.base_url,
            data=json.dumps(body).encode("utf-8"),
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
            method="POST",
        )
        try:
            with urllib.request.urlopen(request, timeout=self.timeout) as response:
                raw = response.read().decode("utf-8", errors="replace")
        except urllib.error.HTTPError as error:
            detail = error.read().decode("utf-8", errors="replace")[:500]
            raise RuntimeError(f"JEV returned HTTP {error.code}: {detail}") from error
        return json.loads(raw)


class SupabaseClient:
    def __init__(self, url: str, service_role_key: str) -> None:
        self.rest_url = f"{url.rstrip('/')}/rest/v1"
        self.service_role_key = service_role_key
        self.timeout = env_int("SCRAPER_HTTP_TIMEOUT", 30, minimum=5)

    def _request(
        self,
        method: str,
        path: str,
        payload: Any | None = None,
        prefer: str | None = None,
    ) -> Any:
        headers = {
            "apikey": self.service_role_key,
            "Authorization": f"Bearer {self.service_role_key}",
            "Accept": "application/json",
        }
        data = None
        if payload is not None:
            headers["Content-Type"] = "application/json"
            data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        if prefer:
            headers["Prefer"] = prefer

        request = urllib.request.Request(
            f"{self.rest_url}{path}",
            data=data,
            headers=headers,
            method=method,
        )
        try:
            with urllib.request.urlopen(request, timeout=self.timeout) as response:
                raw = response.read().decode("utf-8", errors="replace")
        except urllib.error.HTTPError as error:
            detail = error.read().decode("utf-8", errors="replace")[:1000]
            raise RuntimeError(f"Supabase returned HTTP {error.code}: {detail}") from error
        return json.loads(raw) if raw else None

    def fetch_existing(self) -> dict[str, dict[str, Any]]:
        query = urllib.parse.urlencode(
            {
                "select": "external_id,content_hash,category,category_confidence",
                "source": f"eq.{SOURCE}",
            }
        )
        rows = self._request("GET", f"/remote_jobs?{query}") or []
        return {
            clean_text(row.get("external_id")): row
            for row in rows
            if isinstance(row, dict) and row.get("external_id")
        }

    def upsert(self, jobs: list[JobRecord], seen_at: str) -> None:
        path = "/remote_jobs?on_conflict=source%2Cexternal_id"
        for start in range(0, len(jobs), 50):
            batch = [job.payload(seen_at) for job in jobs[start : start + 50]]
            self._request("POST", path, batch, prefer="resolution=merge-duplicates,return=minimal")
            LOGGER.info("upserted %d jobs", len(batch))

    def mark_stale(self, cutoff: datetime) -> None:
        query = urllib.parse.urlencode(
            {
                "source": f"eq.{SOURCE}",
                "last_seen_at": f"lt.{cutoff.astimezone(timezone.utc).isoformat()}",
                "is_active": "eq.true",
            }
        )
        self._request(
            "PATCH",
            f"/remote_jobs?{query}",
            {"is_active": False},
            prefer="return=minimal",
        )


def main() -> int:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s",
    )
    dry_run = env_bool("SCRAPER_DRY_RUN", False)
    supabase_url = os.getenv("SUPABASE_URL") or os.getenv("VITE_SUPABASE_URL")
    service_role_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_SECRET_KEY")

    if not dry_run and (not supabase_url or not service_role_key):
        LOGGER.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required")
        return 2

    try:
        jobs = OnlineJobsScraper().scrape()
    except Exception:
        LOGGER.exception("scraper failed")
        return 1

    if not jobs:
        LOGGER.warning("no jobs collected; leaving existing Supabase jobs untouched")
        return 0

    client = SupabaseClient(supabase_url, service_role_key) if supabase_url and service_role_key else None
    try:
        existing = client.fetch_existing() if client else {}
        JevCategorizer(load_taxonomy()).categorize(jobs, existing)
        seen_at = datetime.now(timezone.utc).isoformat()

        if dry_run:
            preview = [
                {
                    "external_id": job.external_id,
                    "title": job.title,
                    "category": job.category,
                    "category_confidence": job.category_confidence,
                    "job_url": job.job_url,
                }
                for job in jobs[:10]
            ]
            print(json.dumps({"count": len(jobs), "preview": preview}, indent=2))
            return 0

        client.upsert(jobs, seen_at)
        stale_hours = env_int("ONLINEJOBS_STALE_HOURS", 72, minimum=1)
        client.mark_stale(datetime.now(timezone.utc) - timedelta(hours=stale_hours))
        LOGGER.info("completed: %d jobs processed", len(jobs))
        return 0
    except Exception:
        LOGGER.exception("Supabase sync failed")
        return 1


if __name__ == "__main__":
    sys.exit(main())
