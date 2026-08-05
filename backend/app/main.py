import os
import re
import threading
# Force offline mode for HuggingFace / Transformers to prevent network-based hangs at startup
os.environ["HF_HUB_OFFLINE"] = "1"
os.environ["TRANSFORMERS_OFFLINE"] = "1"

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.database import init_db
from backend.app.seed import seed_all
from backend.app.auth.router import router as auth_router
from backend.app.students.router import router as students_router
from backend.app.resumes.router import router as resumes_router
from backend.app.jobs.router import router as jobs_router
from backend.app.matching.router import router as matching_router
from backend.app.skill_gap.router import router as skill_gap_router
from backend.app.generation.router import router as generation_router
from backend.app.applications.router import router as applications_router
from backend.app.analytics.router import router as analytics_router
from backend.app.evaluation.router import router as evaluation_router

# Initialize database
init_db()

# Seed database with canonical values if empty
try:
    seed_all()
except Exception as e:
    print(f"Database seeding warning: {e}")

app = FastAPI(
    title="AI-Powered Placement Intelligence System for REVA",
    description="API services for demand-aware resume-job matching, skill-gap analysis, and outreach automation.",
    version="1.0.0"
)

# CORS Policy configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth_router)
app.include_router(students_router)
app.include_router(resumes_router)
app.include_router(jobs_router)
app.include_router(matching_router)
app.include_router(skill_gap_router)
app.include_router(generation_router)
app.include_router(applications_router)
app.include_router(analytics_router)
app.include_router(evaluation_router)

@app.get("/")
def read_root():
    return {
        "status": "online",
        "system": "REVA Placement Intelligence System API",
        "version": "1.0.0",
        "docs": "/docs"
    }

def clean_jd_html(raw_html: str) -> str:
    if not raw_html:
        return ""
    clean_text = re.sub(r'<[^>]+>', ' ', raw_html)
    clean_text = re.sub(r'\s+', ' ', clean_text).strip()
    return clean_text

def startup_auto_refresh_jobs():
    """
    On every server startup, fetch fresh live India tech jobs from:
    1. Remotive API  (free, no key, always works)
    2. Arbeitnow API (free, no key, always works)
    3. Jooble API    (free key, India-specific jobs)
    Merge into database without clearing existing curated jobs.
    Also sanitizes any HTML tags in existing JD texts.
    """
    try:
        import re
        import datetime
        import os
        from backend.app.database import SessionLocal
        from backend.app.jobs.india_job_aggregator import (
            fetch_remotive, parse_remotive,
            fetch_arbeitnow, parse_arbeitnow,
            fetch_jooble, parse_jooble,
        )
        from backend.app.database import Job

        db = SessionLocal()
        try:
            print("[Startup] Auto-refreshing India tech jobs...")

            # Sanitize existing JD HTML tags
            existing_jobs = db.query(Job).all()
            sanitized_count = 0
            for job in existing_jobs:
                if job.jd_text and re.search(r'<[a-z]', job.jd_text):
                    clean = re.sub(r'<[^>]+>', ' ', job.jd_text)
                    clean = re.sub(r'\s+', ' ', clean).strip()
                    job.jd_text = clean
                    sanitized_count += 1
            if sanitized_count > 0:
                db.commit()
                print(f"[Startup] Sanitized HTML from {sanitized_count} JDs.")

            current_count = db.query(Job).filter(Job.is_active == True).count()
            print(f"[Startup] Current active jobs: {current_count}")

            # Collect existing apply_urls to skip duplicates
            existing_urls = set(j.apply_url for j in db.query(Job.apply_url).all())
            sources_added = 0

            # ── Remotive ──
            try:
                for item in fetch_remotive():
                    p = parse_remotive(item)
                    if not p or p["apply_url"] in existing_urls:
                        continue
                    existing_urls.add(p["apply_url"])
                    db.add(Job(
                        title=p["title"], company=p["company"], location=p["location"],
                        experience_required=0, jd_text=p["jd_text"], apply_url=p["apply_url"],
                        source="Remotive", employer_logo=p["employer_logo"], job_type="Full-time",
                        posted_date=p["posted_dt"], fetched_at=datetime.datetime.utcnow(), is_active=True
                    ))
                    sources_added += 1
            except Exception as e:
                print(f"[Startup] Remotive error: {e}")

            # ── Arbeitnow ──
            try:
                for item in fetch_arbeitnow():
                    p = parse_arbeitnow(item)
                    if not p or p["apply_url"] in existing_urls:
                        continue
                    existing_urls.add(p["apply_url"])
                    db.add(Job(
                        title=p["title"], company=p["company"], location=p["location"],
                        experience_required=0, jd_text=p["jd_text"], apply_url=p["apply_url"],
                        source="Arbeitnow", job_type="Full-time",
                        posted_date=datetime.datetime.utcnow(),
                        fetched_at=datetime.datetime.utcnow(), is_active=True
                    ))
                    sources_added += 1
            except Exception as e:
                print(f"[Startup] Arbeitnow error: {e}")

            # ── Jooble (if key present) ──
            jooble_key = os.getenv("JOOBLE_API_KEY", "")
            if jooble_key:
                jooble_queries = [
                    ("machine learning engineer", "Bangalore, India"),
                    ("cybersecurity engineer", "Bangalore, India"),
                    ("cloud devops engineer", "India"),
                    ("data scientist", "Hyderabad, India"),
                ]
                try:
                    for keywords, location in jooble_queries:
                        for item in fetch_jooble(jooble_key, keywords, location):
                            p = parse_jooble(item)
                            if not p or p["apply_url"] in existing_urls:
                                continue
                            existing_urls.add(p["apply_url"])
                            db.add(Job(
                                title=p["title"], company=p["company"], location=p["location"],
                                experience_required=0, jd_text=p["jd_text"], apply_url=p["apply_url"],
                                source="Jooble", job_type="Full-time",
                                posted_date=datetime.datetime.utcnow(),
                                fetched_at=datetime.datetime.utcnow(), is_active=True
                            ))
                            sources_added += 1
                except Exception as e:
                    print(f"[Startup] Jooble error: {e}")

            if sources_added > 0:
                db.commit()
                print(f"[Startup] Added {sources_added} fresh live jobs!")

            new_total = db.query(Job).filter(Job.is_active == True).count()
            print(f"[Startup] Total active India tech jobs: {new_total}")

        finally:
            db.close()
    except Exception as e:
        print(f"[Startup Job Sync Error] {e}")


@app.on_event("startup")
def warmup_embeddings_cache():
    try:
        # Trigger background startup job sync in a thread
        t = threading.Thread(target=startup_auto_refresh_jobs, daemon=True)
        t.start()

        from backend.app.database import SessionLocal, Job
        from backend.app.matching.engine import get_embedding_model, _job_embeddings_cache
        
        db = SessionLocal()
        try:
            print("[Warmup] Loading S-BERT model...")
            model = get_embedding_model()
            if model is not None:
                print("[Warmup] Pre-computing job description S-BERT embeddings...")
                jobs = db.query(Job).filter(Job.is_active == True).all()
                valid_jobs = [j for j in jobs if j.id not in _job_embeddings_cache and j.jd_text and j.jd_text.strip()]
                if valid_jobs:
                    texts = [j.jd_text for j in valid_jobs]
                    vecs = model.encode(texts, show_progress_bar=False, batch_size=64)
                    for job_obj, vec in zip(valid_jobs, vecs):
                        _job_embeddings_cache[job_obj.id] = vec
                print(f"[Warmup] Successfully cached {len(_job_embeddings_cache)} job embeddings!")
        finally:
            db.close()
    except Exception as e:
        print(f"[Warmup] Embedding cache warning: {e}")


@app.on_event("startup")
def start_live_job_scheduler():
    """Start the multi-source live job refresh scheduler (every 6 hours)."""
    try:
        from backend.app.jobs.scheduler import start_scheduler
        start_scheduler(interval_hours=6)
        print("[App] Live job scheduler started — auto-refreshing every 6h.")
    except Exception as e:
        print(f"[App] Scheduler startup warning: {e}")


@app.on_event("shutdown")
def stop_live_job_scheduler():
    """Gracefully stop the scheduler on server shutdown."""
    try:
        from backend.app.jobs.scheduler import stop_scheduler
        stop_scheduler()
    except Exception as e:
        print(f"[App] Scheduler shutdown warning: {e}")
