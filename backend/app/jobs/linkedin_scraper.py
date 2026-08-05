"""
LinkedIn Jobs Guest API Scraper
================================
Scrapes LinkedIn's public, no-login guest endpoints:
  - Search: /jobs-guest/jobs/api/seeMoreJobPostings/search
  - Detail: /jobs-guest/jobs/api/jobPosting/{jobId}

Returns structured job dicts with REAL linkedin.com/jobs/view/{id} URLs.
No API key, no login, no cookies required.
Rate-limit safe: 2-5s random delays, exponential backoff on 429.
"""

import re
import time
import json
import random
import datetime
import urllib.request
import urllib.parse
from typing import List, Dict, Any, Optional
from bs4 import BeautifulSoup

# ─────────────────────────────────────────────────────────────
# Configuration
# ─────────────────────────────────────────────────────────────
LINKEDIN_GUEST_SEARCH = "https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search"
LINKEDIN_GUEST_JOB    = "https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/{job_id}"

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Safari/605.1.15",
]

# India city geo IDs used by LinkedIn's filter
INDIA_GEO_ID = "102713980"

# Employment type filter (F = Full-time)
JOB_TYPE_FULLTIME = "F"

# Date posted filter (r86400 = past 24h, r604800 = past week, r2592000 = past month)
DATE_POSTED_WEEK  = "r604800"
DATE_POSTED_MONTH = "r2592000"


def _get_headers() -> dict:
    return {
        "User-Agent": random.choice(USER_AGENTS),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "gzip, deflate",
        "Connection": "keep-alive",
        "Referer": "https://www.linkedin.com/",
    }


def _safe_get(url: str, retries: int = 3) -> Optional[str]:
    """HTTP GET with retry + exponential backoff on 429."""
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers=_get_headers())
            with urllib.request.urlopen(req, timeout=15) as resp:
                # Handle gzip transparently
                import gzip
                raw = resp.read()
                try:
                    content = gzip.decompress(raw).decode("utf-8", errors="ignore")
                except Exception:
                    content = raw.decode("utf-8", errors="ignore")
                return content
        except urllib.error.HTTPError as e:
            if e.code == 429:
                wait = (2 ** attempt) * 5 + random.uniform(1, 3)
                print(f"[LinkedIn] 429 rate-limited — waiting {wait:.1f}s...")
                time.sleep(wait)
            elif e.code in (403, 503):
                print(f"[LinkedIn] {e.code} — LinkedIn blocked this request.")
                return None
            else:
                print(f"[LinkedIn] HTTP {e.code}: {url}")
                return None
        except Exception as ex:
            print(f"[LinkedIn] Request error (attempt {attempt+1}): {ex}")
            time.sleep(2 ** attempt)
    return None


def _parse_salary_from_text(text: str) -> tuple:
    """Extract min/max INR salary from raw description text."""
    # Look for patterns like "$80,000 - $120,000" or "₹12-18 LPA" or "15 LPA"
    lpa_match = re.search(r'₹?\s*(\d+(?:\.\d+)?)\s*[-–to]+\s*(\d+(?:\.\d+)?)\s*(?:L|LPA|lakhs?)', text, re.IGNORECASE)
    if lpa_match:
        lo = float(lpa_match.group(1)) * 100000
        hi = float(lpa_match.group(2)) * 100000
        return lo, hi

    usd_match = re.search(r'\$(\d{1,3}(?:,\d{3})*)\s*[-–]\s*\$(\d{1,3}(?:,\d{3})*)', text)
    if usd_match:
        lo = float(usd_match.group(1).replace(",", "")) * 83
        hi = float(usd_match.group(2).replace(",", "")) * 83
        return lo, hi

    return None, None


def _parse_experience_from_text(text: str) -> float:
    """Extract required experience years from JD text."""
    match = re.search(r'(\d+)\+?\s*[-–to]+\s*(\d+)\s*years?', text, re.IGNORECASE)
    if match:
        return float(match.group(1))
    match = re.search(r'(\d+)\+?\s*years?\s*(?:of)?\s*experience', text, re.IGNORECASE)
    if match:
        return float(match.group(1))
    return 1.0


def _parse_posted_date_from_text(text: str) -> Optional[datetime.datetime]:
    """Parse relative posted date like '2 weeks ago' from LinkedIn card HTML."""
    now = datetime.datetime.utcnow()
    match = re.search(r'(\d+)\s+(minute|hour|day|week|month)s?\s+ago', text, re.IGNORECASE)
    if match:
        n = int(match.group(1))
        unit = match.group(2).lower()
        if unit == "minute":
            return now - datetime.timedelta(minutes=n)
        if unit == "hour":
            return now - datetime.timedelta(hours=n)
        if unit == "day":
            return now - datetime.timedelta(days=n)
        if unit == "week":
            return now - datetime.timedelta(weeks=n)
        if unit == "month":
            return now - datetime.timedelta(days=n * 30)
    return now


# ─────────────────────────────────────────────────────────────
# Core: Search LinkedIn Jobs (guest, no login)
# ─────────────────────────────────────────────────────────────
def search_linkedin_jobs(
    keyword: str,
    location: str = "India",
    max_pages: int = 4,
    date_filter: str = DATE_POSTED_WEEK,
) -> List[Dict[str, Any]]:
    """
    Search LinkedIn jobs using the public guest API.
    Returns list of thin card dicts with jobId and jobUrl.
    """
    job_cards = []
    page = 0

    while page < max_pages:
        params = {
            "keywords": keyword,
            "location": location,
            "f_TPR": date_filter,
            "f_JT": JOB_TYPE_FULLTIME,
            "start": page * 25,
            "geoId": INDIA_GEO_ID,
        }
        url = LINKEDIN_GUEST_SEARCH + "?" + urllib.parse.urlencode(params)

        html = _safe_get(url)
        if not html:
            print(f"[LinkedIn] Search failed for '{keyword}' page {page}")
            break

        soup = BeautifulSoup(html, "html.parser")
        cards = soup.select("li")

        if not cards:
            print(f"[LinkedIn] No cards found on page {page} for '{keyword}'")
            break

        for card in cards:
            try:
                # Extract job ID from data-entity-urn or href
                entity_urn = card.get("data-entity-urn", "")
                if not entity_urn:
                    div = card.select_one(".job-search-card, [data-entity-urn]")
                    if div:
                        entity_urn = div.get("data-entity-urn", "")
                
                job_id = entity_urn.split(":")[-1] if entity_urn else None

                if not job_id:
                    link_tag = card.select_one("a.base-card__full-link, a[href*='/jobs/view/']")
                    if link_tag:
                        href = link_tag.get("href", "")
                        # Try to capture the ID from various LinkedIn guest URL formats
                        id_match = re.search(r"-(\d+)(?:\?|$)", href)
                        if not id_match:
                            id_match = re.search(r"/jobs/view/(\d+)", href)
                        if id_match:
                            job_id = id_match.group(1)

                if not job_id:
                    continue

                title_tag = card.select_one("h3.base-search-card__title, .job-search-card__title")
                company_tag = card.select_one("h4.base-search-card__subtitle, .job-search-card__company-name")
                location_tag = card.select_one(".job-search-card__location")
                date_tag = card.select_one("time, .job-search-card__listdate")

                title = title_tag.get_text(strip=True) if title_tag else ""
                company = company_tag.get_text(strip=True) if company_tag else ""
                loc = location_tag.get_text(strip=True) if location_tag else location
                date_text = date_tag.get("datetime", "") if date_tag else ""
                if not date_text and date_tag:
                    date_text = date_tag.get_text(strip=True)

                if not title or not company:
                    continue

                job_cards.append({
                    "job_id": job_id,
                    "title": title,
                    "company": company,
                    "location": loc,
                    "date_text": date_text,
                    "job_url": f"https://www.linkedin.com/jobs/view/{job_id}/",
                })
            except Exception as e:
                continue

        print(f"[LinkedIn] Page {page}: found {len(cards)} cards for '{keyword}'")
        page += 1

        # Rate-limit safe delay
        time.sleep(random.uniform(2.5, 5.0))

        # If fewer than 25 results, we've hit the last page
        if len(cards) < 25:
            break

    return job_cards


# ─────────────────────────────────────────────────────────────
# Core: Fetch Full Job Detail (guest, no login)
# ─────────────────────────────────────────────────────────────
def fetch_linkedin_job_detail(job_id: str, job_card: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Fetch full job posting detail for a given LinkedIn job ID.
    Returns enriched job dict with full JD text and apply URL.
    """
    url = LINKEDIN_GUEST_JOB.format(job_id=job_id)
    html = _safe_get(url)
    if not html:
        return None

    soup = BeautifulSoup(html, "html.parser")

    # Full description text
    desc_section = soup.select_one(".description__text, .show-more-less-html__markup, section.description")
    if not desc_section:
        desc_section = soup.select_one("div[class*='description']")
    jd_text = desc_section.get_text(separator="\n", strip=True) if desc_section else ""

    if not jd_text or len(jd_text) < 50:
        # Fallback: get all text from main content
        main = soup.select_one("main, article, .job-view-layout")
        jd_text = main.get_text(separator="\n", strip=True) if main else ""

    # Apply URL - use the direct job view URL (most reliable for LinkedIn)
    apply_url = f"https://www.linkedin.com/jobs/view/{job_id}/"

    # Check for external apply link
    apply_btn = soup.select_one("a.apply-button, a[data-tracking-control-name*='apply'], a.sign-up-modal__outlet-btn")
    if apply_btn:
        ext_url = apply_btn.get("href", "")
        if ext_url and ext_url.startswith("http") and "linkedin.com" not in ext_url:
            apply_url = ext_url  # Direct corporate apply page

    # Salary
    sal_tag = soup.select_one(".compensation__salary, [class*='salary']")
    sal_text = sal_tag.get_text(strip=True) if sal_tag else ""
    sal_min, sal_max = _parse_salary_from_text(sal_text or jd_text)

    # Experience
    experience = _parse_experience_from_text(jd_text)

    # Posted date
    date_text = job_card.get("date_text", "")
    posted_date = _parse_posted_date_from_text(date_text) if date_text else datetime.datetime.utcnow()

    # Job type
    is_remote = any(w in (job_card.get("location", "") + jd_text).lower()
                    for w in ["remote", "work from home", "wfh", "hybrid"])

    return {
        "title": job_card["title"],
        "company": job_card["company"],
        "location": job_card.get("location", "India"),
        "experience_required": experience,
        "salary_min": sal_min,
        "salary_max": sal_max,
        "jd_text": jd_text or f"{job_card['title']} at {job_card['company']} — full job description available on LinkedIn.",
        "apply_url": apply_url,
        "source": "linkedin",
        "platform": "LinkedIn",
        "posted_date": posted_date,
        "employer_logo": None,
        "job_type": "Full-time",
        "is_remote": is_remote,
        "job_id_external": job_id,
    }


# ─────────────────────────────────────────────────────────────
# Main: Fetch LinkedIn Jobs for a keyword (search + enrich)
# ─────────────────────────────────────────────────────────────
def fetch_linkedin_jobs_for_query(
    keyword: str,
    max_cards: int = 30,
    enrich: bool = True,
) -> List[Dict[str, Any]]:
    """
    Full pipeline: search LinkedIn → optionally enrich each job with full JD.
    Returns list of standardized job dicts ready to save to DB.
    max_cards: max number of jobs to return per query.
    enrich: if True, fetches full JD for each card (slower but complete data).
    """
    print(f"[LinkedIn Scraper] Searching: '{keyword}'")
    cards = search_linkedin_jobs(keyword, max_pages=min(max_cards // 25 + 1, 4))
    cards = cards[:max_cards]

    if not enrich:
        # Return thin cards with just the direct LinkedIn URL
        return [
            {
                "title": c["title"],
                "company": c["company"],
                "location": c.get("location", "India"),
                "experience_required": 1.0,
                "salary_min": None,
                "salary_max": None,
                "jd_text": f"{c['title']} at {c['company']} — apply on LinkedIn.",
                "apply_url": c["job_url"],
                "source": "linkedin",
                "platform": "LinkedIn",
                "posted_date": datetime.datetime.utcnow(),
                "employer_logo": None,
                "job_type": "Full-time",
                "is_remote": False,
                "job_id_external": c["job_id"],
            }
            for c in cards
        ]

    results = []
    for i, card in enumerate(cards):
        try:
            job = fetch_linkedin_job_detail(card["job_id"], card)
            if job:
                results.append(job)
                print(f"[LinkedIn Scraper] Enriched {i+1}/{len(cards)}: {job['title']} @ {job['company']}")
            # Polite delay between detail fetches
            time.sleep(random.uniform(1.5, 3.5))
        except Exception as e:
            print(f"[LinkedIn Scraper] Detail fetch failed for job {card.get('job_id')}: {e}")

    print(f"[LinkedIn Scraper] '{keyword}' → {len(results)} enriched jobs")
    return results


# ─────────────────────────────────────────────────────────────
# Quick test (run directly)
# ─────────────────────────────────────────────────────────────
def test_scrape():
    print("=== LinkedIn Guest API Test ===")
    jobs = fetch_linkedin_jobs_for_query("data scientist India", max_cards=5, enrich=False)
    for j in jobs:
        print(f"  [{j['source']}] {j['title']} @ {j['company']} | {j['apply_url']}")
    print(f"Total: {len(jobs)} jobs")


if __name__ == "__main__":
    test_scrape()
