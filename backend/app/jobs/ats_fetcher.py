"""
Direct Public ATS Integrations Module
======================================
Fetches live jobs directly from:
- Greenhouse (Public Board API)
- Lever (Public Board API)
- SmartRecruiters (Public Board API)
- Adzuna / JSearch (API Aggregators)
"""

import json
import re
import urllib.request
import urllib.parse
import html
from typing import List, Dict, Any

def clean_html_content(text: str) -> str:
    if not text:
        return ""
    text = html.unescape(text)
    text = html.unescape(text)
    text = re.sub(r'</?(?:p|h[1-6]|div|br|li|ul|ol)[^>]*>', '\n', text, flags=re.IGNORECASE)
    text = re.sub(r'<[^>]+>', '', text)
    lines = [re.sub(r'[ \t]+', ' ', line).strip() for line in text.split('\n')]
    return '\n'.join([line for line in lines if line])

# Top companies hiring in India / Bangalore using Greenhouse, Lever, SmartRecruiters
GREENHOUSE_BOARDS = [
    "stripe", "figma", "airbnb", "datadog", "cred", "swiggy", "meesho",
    "razorpay", "postman", "zerodha", "instacart", "scaleai", "mongodb",
    "snowflake", "hashicorp", "grafana", "gitlab", "elastic", "cockroachlabs",
    "rubrik", "cohere", "canva", "amplitude", "gusto"
]

LEVER_BOARDS = [
    "atlassian", "spotify", "palantir", "netflix", "harness", "clevertap",
    "inmobi", "hotstar", "rippling", "coindcx", "browserstack", "linear",
    "vercel", "docker", "sentry"
]

SMARTRECRUITERS_BOARDS = [
    "BoschGroup", "Visa", "Ubisoft", "PublicisGroupe", "Square", "PayPal",
    "Thoughtworks", "AveryDennison", "StandardChartered"
]

HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}

def fetch_greenhouse_jobs_for_board(board: str) -> List[Dict[str, Any]]:
    """Fetch jobs from a company's Greenhouse public board API."""
    url = f"https://boards-api.greenhouse.io/v1/boards/{board}/jobs?content=true"
    req = urllib.request.Request(url, headers=HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=8) as resp:
            data = json.loads(resp.read().decode('utf-8'))
        raw_jobs = data.get("jobs", [])
        
        parsed = []
        for j in raw_jobs:
            title = j.get("title", "").strip()
            loc_obj = j.get("location") or {}
            loc_name = loc_obj.get("name", "India")
            
            # Filter for India / Bangalore or Remote
            if not ("india" in loc_name.lower() or "bangalore" in loc_name.lower() or "bengaluru" in loc_name.lower() or "remote" in loc_name.lower()):
                continue
            
            apply_url = j.get("absolute_url", "")
            if not apply_url:
                continue

            content = j.get("content") or ""
            clean_jd = clean_html_content(content)
            
            is_intern = "intern" in title.lower() or "trainee" in title.lower()
            
            parsed.append({
                "title": title,
                "company": board.capitalize(),
                "location": "Bengaluru, Karnataka, India" if "bangalore" in loc_name.lower() or "bengaluru" in loc_name.lower() else f"{loc_name}, India",
                "experience_required": 0.0 if is_intern else 2.0,
                "salary_min": None,
                "salary_max": None,
                "jd_text": clean_jd or f"{title} at {board.capitalize()}.",
                "apply_url": apply_url,
                "source": "greenhouse",
                "platform": "Greenhouse ATS",
                "posted_date": None,
                "employer_logo": None,
                "job_type": "Internship" if is_intern else "Full-time",
                "is_remote": "remote" in loc_name.lower(),
            })
        return parsed
    except Exception as e:
        return []

def fetch_lever_jobs_for_board(board: str) -> List[Dict[str, Any]]:
    """Fetch jobs from a company's Lever public board API."""
    url = f"https://api.lever.co/v0/postings/{board}?mode=json"
    req = urllib.request.Request(url, headers=HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=8) as resp:
            raw_jobs = json.loads(resp.read().decode('utf-8'))
        
        parsed = []
        for j in raw_jobs:
            title = j.get("text", "").strip()
            categories = j.get("categories") or {}
            loc_name = categories.get("location", "India")
            
            if not ("india" in loc_name.lower() or "bangalore" in loc_name.lower() or "bengaluru" in loc_name.lower() or "remote" in loc_name.lower()):
                continue
                
            apply_url = j.get("hostedUrl", "")
            if not apply_url:
                continue
                
            jd = j.get("descriptionPlain") or ""
            is_intern = "intern" in title.lower() or "trainee" in title.lower()
            
            parsed.append({
                "title": title,
                "company": board.capitalize(),
                "location": "Bengaluru, Karnataka, India" if "bangalore" in loc_name.lower() or "bengaluru" in loc_name.lower() else f"{loc_name}, India",
                "experience_required": 0.0 if is_intern else 2.0,
                "salary_min": None,
                "salary_max": None,
                "jd_text": jd or f"{title} at {board.capitalize()}.",
                "apply_url": apply_url,
                "source": "lever",
                "platform": "Lever ATS",
                "posted_date": None,
                "employer_logo": None,
                "job_type": "Internship" if is_intern else "Full-time",
                "is_remote": "remote" in loc_name.lower(),
            })
        return parsed
    except Exception as e:
        return []

def fetch_smartrecruiters_jobs_for_board(board: str) -> List[Dict[str, Any]]:
    """Fetch jobs from a company's SmartRecruiters public board API."""
    url = f"https://api.smartrecruiters.com/v1/companies/{board}/postings?limit=50"
    req = urllib.request.Request(url, headers=HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=8) as resp:
            data = json.loads(resp.read().decode('utf-8'))
        raw_jobs = data.get("content", [])
        
        parsed = []
        for j in raw_jobs:
            title = j.get("name", "").strip()
            loc_obj = j.get("location") or {}
            city = loc_obj.get("city", "")
            country = loc_obj.get("country", "")
            
            if not ("in" in country.lower() or "india" in city.lower() or "bangalore" in city.lower() or "bengaluru" in city.lower()):
                continue
                
            job_id = j.get("id")
            if not job_id:
                continue
            apply_url = f"https://jobs.smartrecruiters.com/{board}/{job_id}"
            
            is_intern = "intern" in title.lower() or "trainee" in title.lower()
            
            parsed.append({
                "title": title,
                "company": board.capitalize(),
                "location": "Bengaluru, Karnataka, India" if "bangalore" in city.lower() or "bengaluru" in city.lower() else f"{city or 'India'}, India",
                "experience_required": 0.0 if is_intern else 2.0,
                "salary_min": None,
                "salary_max": None,
                "jd_text": f"{title} position at {board.capitalize()}.",
                "apply_url": apply_url,
                "source": "smartrecruiters",
                "platform": "SmartRecruiters ATS",
                "posted_date": None,
                "employer_logo": None,
                "job_type": "Internship" if is_intern else "Full-time",
                "is_remote": False,
            })
        return parsed
    except Exception as e:
        return []

def fetch_all_ats_jobs() -> List[Dict[str, Any]]:
    """Aggregate jobs across Greenhouse, Lever, and SmartRecruiters."""
    all_ats = []
    print("[ATS Fetcher] Crawling Greenhouse public boards...")
    for b in GREENHOUSE_BOARDS:
        jobs = fetch_greenhouse_jobs_for_board(b)
        all_ats.extend(jobs)
        
    print(f"[ATS Fetcher] Crawling Lever public boards...")
    for b in LEVER_BOARDS:
        jobs = fetch_lever_jobs_for_board(b)
        all_ats.extend(jobs)

    print(f"[ATS Fetcher] Crawling SmartRecruiters public boards...")
    for b in SMARTRECRUITERS_BOARDS:
        jobs = fetch_smartrecruiters_jobs_for_board(b)
        all_ats.extend(jobs)

    print(f"[ATS Fetcher] Total ATS jobs fetched: {len(all_ats)}")
    return all_ats
