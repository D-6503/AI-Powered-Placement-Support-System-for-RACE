"""
Multi-Source Live Job Scheduler
=================================
Runs an APScheduler background job every 6 hours that:
  1. Fetches real LinkedIn jobs (guest API, no login)
  2. Fetches JSearch jobs (RapidAPI - aggregates LinkedIn + Indeed + Glassdoor)
  3. Fetches Remotive jobs (free, remote-focused)
  4. Deduplicates, filters by track keywords, saves to DB
  5. Rebuilds FAISS matching index

The scheduler starts automatically when the FastAPI app starts.
"""

import datetime
import threading
from typing import Optional

# APScheduler — installed via requirements or pip install apscheduler
try:
    from apscheduler.schedulers.background import BackgroundScheduler
    from apscheduler.triggers.interval import IntervalTrigger
    HAS_SCHEDULER = True
except ImportError:
    HAS_SCHEDULER = False
    print("[Scheduler] APScheduler not installed — auto-refresh disabled. Run: pip install apscheduler")

# Track the last sync time and stats
_last_sync: Optional[datetime.datetime] = None
_last_sync_stats: dict = {"new_jobs": 0, "total_jobs": 0, "sources": []}
_scheduler_instance: Optional[object] = None
_sync_lock = threading.Lock()
_is_syncing = False


# ─────────────────────────────────────────────────────────────
# Core: Full multi-source refresh job
# ─────────────────────────────────────────────────────────────
def run_full_job_refresh():
    """
    Pulls fresh jobs from ALL enabled sources for ALL tracks.
    Called by scheduler every 6h, and on-demand via /jobs/refresh-live.
    """
    global _last_sync, _last_sync_stats, _is_syncing

    if _is_syncing:
        print("[Scheduler] Refresh already in progress — skipping.")
        return

    _is_syncing = True
    print("[Scheduler] ===== Starting full multi-source job refresh =====")
    start_time = datetime.datetime.utcnow()

    from backend.app.database import SessionLocal
    from backend.app.jobs.crawler import (
        TRACK_QUERIES, TRACK_KEYWORDS,
        fetch_jsearch_jobs, fetch_remotive_jobs, fetch_adzuna_jobs,
        deactivate_stale_jobs,
    )
    from backend.app.jobs.linkedin_scraper import fetch_linkedin_jobs_for_query
    from backend.app.database import Job
    import os

    db = SessionLocal()
    total_added = 0
    sources_used = []

    try:
        # Step 1: Deactivate stale jobs
        try:
            deactivate_stale_jobs(db)
        except Exception as e:
            print(f"[Scheduler] Stale cleanup error: {e}")

        # Step 2: Fetch from ALL tracks
        all_fetched = []

        for track, queries in TRACK_QUERIES.items():
            print(f"[Scheduler] Fetching track: {track}")
            track_jobs = []

            # ── Source 1: LinkedIn Guest API (free, no login) ──
            try:
                for q in queries[:3]:  # 3 queries per track
                    jobs = fetch_linkedin_jobs_for_query(q, max_cards=20, enrich=False)
                    track_jobs.extend(jobs)
                    if "LinkedIn (Guest)" not in sources_used:
                        sources_used.append("LinkedIn (Guest)")
            except Exception as e:
                print(f"[Scheduler] LinkedIn guest error: {e}")

            # ── Source 2: JSearch RapidAPI ──
            rapidapi_key = os.getenv("RAPIDAPI_KEY") or os.getenv("JSEARCH_API_KEY", "")
            if rapidapi_key:
                try:
                    for q in queries[:2]:
                        jobs = fetch_jsearch_jobs(q, num_pages=2)
                        track_jobs.extend(jobs)
                    if "JSearch (LinkedIn+Indeed+Glassdoor)" not in sources_used:
                        sources_used.append("JSearch (LinkedIn+Indeed+Glassdoor)")
                except Exception as e:
                    print(f"[Scheduler] JSearch error: {e}")

            # ── Source 3: Remotive (free, no key) ──
            try:
                for q in queries[:2]:
                    clean_q = q.replace("India", "").replace("Bangalore", "").strip()
                    jobs = fetch_remotive_jobs(clean_q, limit=10)
                    track_jobs.extend(jobs)
                if "Remotive" not in sources_used:
                    sources_used.append("Remotive")
            except Exception as e:
                print(f"[Scheduler] Remotive error: {e}")

            # ── Source 4: Adzuna (if keys set) ──
            adzuna_id = os.getenv("ADZUNA_APP_ID", "")
            adzuna_key = os.getenv("ADZUNA_APP_KEY", "")
            if adzuna_id and adzuna_key:
                try:
                    for q in queries[:2]:
                        jobs = fetch_adzuna_jobs(q, limit=10)
                        track_jobs.extend(jobs)
                    if "Adzuna" not in sources_used:
                        sources_used.append("Adzuna")
                except Exception as e:
                    print(f"[Scheduler] Adzuna error: {e}")

            # Filter by track keywords
            keywords = TRACK_KEYWORDS.get(track, [])
            filtered = [j for j in track_jobs
                        if not keywords or any(kw in j["title"].lower() for kw in keywords)]
            all_fetched.extend(filtered)
            print(f"[Scheduler] Track '{track}': {len(filtered)} relevant jobs")

        # Step 3: Deduplicate and save
        seen_keys = set()
        from backend.app.jobs.router import process_job_ingestion_pipeline
        import datetime as dt

        for j in all_fetched:
            if not j.get("apply_url") or not j.get("title") or not j.get("company"):
                continue

            key = f"{j['title'].lower().strip()}|{j['company'].lower().strip()}"
            if key in seen_keys:
                continue
            seen_keys.add(key)

            # Check existing
            existing = db.query(Job).filter(
                Job.title == j["title"],
                Job.company == j["company"]
            ).first()

            if existing:
                existing.is_active = True
                existing.fetched_at = dt.datetime.utcnow()
                # Update apply_url if we got a better direct one
                new_url = j.get("apply_url", "")
                old_url = existing.apply_url or ""
                if new_url and (not old_url or len(new_url) < len(old_url)):
                    existing.apply_url = new_url
                if j.get("posted_date"):
                    existing.posted_date = j["posted_date"]
                db.commit()
                continue

            if not j.get("apply_url"):
                continue

            job_db = Job(
                title=j["title"],
                company=j["company"],
                location=j.get("location", "India"),
                experience_required=j.get("experience_required", 1.0),
                salary_min=j.get("salary_min"),
                salary_max=j.get("salary_max"),
                jd_text=j.get("jd_text", ""),
                apply_url=j["apply_url"],
                source=j.get("source", "live"),
                posted_date=j.get("posted_date") or dt.datetime.utcnow(),
                is_active=True,
                employer_logo=j.get("employer_logo"),
            )
            db.add(job_db)
            db.commit()
            db.refresh(job_db)
            total_added += 1

            try:
                process_job_ingestion_pipeline(job_db, db)
            except Exception as e:
                print(f"[Scheduler] Ingestion pipeline error: {e}")

        # Step 4: Rebuild FAISS index
        if total_added > 0:
            try:
                from backend.app.matching.engine import rebuild_faiss_index
                rebuild_faiss_index(db)
                print(f"[Scheduler] FAISS index rebuilt with {total_added} new jobs.")
            except Exception as e:
                print(f"[Scheduler] FAISS rebuild failed: {e}")

        # Update sync stats
        total_active = db.query(Job).filter(Job.is_active == True).count()
        _last_sync_stats = {
            "new_jobs": total_added,
            "total_jobs": total_active,
            "sources": sources_used,
        }
        _last_sync = datetime.datetime.utcnow()

        elapsed = (datetime.datetime.utcnow() - start_time).total_seconds()
        print(f"[Scheduler] ===== Refresh complete: {total_added} new jobs in {elapsed:.1f}s =====")

    except Exception as e:
        print(f"[Scheduler] Critical refresh error: {e}")
    finally:
        db.close()
        _is_syncing = False

    return total_added


# ─────────────────────────────────────────────────────────────
# Scheduler lifecycle
# ─────────────────────────────────────────────────────────────
def start_scheduler(interval_hours: int = 6):
    """Start the background APScheduler. Called on FastAPI startup."""
    global _scheduler_instance

    if not HAS_SCHEDULER:
        print("[Scheduler] APScheduler not installed — skipping. Install with: pip install apscheduler")
        return

    if _scheduler_instance and _scheduler_instance.running:
        print("[Scheduler] Already running.")
        return

    _scheduler_instance = BackgroundScheduler(timezone="UTC")
    _scheduler_instance.add_job(
        func=run_full_job_refresh,
        trigger=IntervalTrigger(hours=interval_hours),
        id="live_job_refresh",
        name="Multi-source live job refresh",
        replace_existing=True,
        misfire_grace_time=300,  # Allow 5min late execution
    )
    _scheduler_instance.start()
    print(f"[Scheduler] Started — auto-refreshing jobs every {interval_hours} hours.")

    # Optionally run an initial sync in background on startup
    def _initial_sync():
        import time
        time.sleep(10)  # Wait for app to fully start
        print("[Scheduler] Running initial job sync on startup...")
        run_full_job_refresh()

    t = threading.Thread(target=_initial_sync, daemon=True)
    t.start()


def stop_scheduler():
    """Stop the APScheduler. Called on FastAPI shutdown."""
    global _scheduler_instance
    if _scheduler_instance and _scheduler_instance.running:
        _scheduler_instance.shutdown(wait=False)
        print("[Scheduler] Stopped.")


def get_sync_status() -> dict:
    """Return current sync status for the /jobs/live-status endpoint."""
    return {
        "last_sync": _last_sync.isoformat() if _last_sync else None,
        "last_sync_stats": _last_sync_stats,
        "is_syncing": _is_syncing,
        "scheduler_running": bool(_scheduler_instance and HAS_SCHEDULER and getattr(_scheduler_instance, "running", False)),
    }
