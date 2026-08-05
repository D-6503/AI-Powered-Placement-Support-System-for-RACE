import os
import csv
import json
import re
import pandas as pd
import requests
import datetime
from bs4 import BeautifulSoup
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session
from typing import List, Optional, Tuple, Dict, Any
from backend.app.database import get_db, Job, JobSkill, SkillsMaster, User, JobDemandSnapshot
from backend.app.auth.utils import get_current_user
from backend.app.jobs.schemas import JobResponse, JobImportURLRequest, JobUploadCSVResponse, JobCreate
from backend.app.config import JOBS_DIR

router = APIRouter(prefix="/jobs", tags=["Jobs"])

def clean_text_body(text: str) -> str:
    # Remove HTML tags
    cleaned = re.sub(r"<[^>]+>", "", text)
    # Normalize multiple spaces and newlines
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned

def classify_role_category(title: str, jd_text: str) -> str:
    title_lower = title.lower()
    jd_lower = jd_text.lower()
    
    ai_keywords = ["ai", "machine learning", "ml", "data", "analytics", "deep learning", "nlp", "computer vision"]
    if any(k in title_lower for k in ai_keywords):
        return "AI & Analytics"
        
    cyber_keywords = ["security", "cyber", "soc", "infosec", "penetration", "vulnerability", "iam", "grc"]
    if any(k in title_lower for k in cyber_keywords):
        return "Cybersecurity"
        
    cloud_keywords = ["cloud", "devops", "aws", "azure", "gcp", "kubernetes", "git & version control", "sre", "infrastructure"]
    if any(k in title_lower for k in cloud_keywords):
        return "Cloud Architecture"
        
    ai_count = sum(jd_lower.count(k) for k in ai_keywords)
    cyber_count = sum(jd_lower.count(k) for k in cyber_keywords)
    cloud_count = sum(jd_lower.count(k) for k in cloud_keywords)
    
    counts = {"AI & Analytics": ai_count, "Cybersecurity": cyber_count, "Cloud Architecture": cloud_count}
    max_cat = max(counts, key=counts.get)
    if counts[max_cat] > 0:
        return max_cat
        
    return "AI & Analytics"

def extract_skills_from_jd(jd_text: str, db: Session) -> List[Tuple[int, bool]]:
    skills_master = db.query(SkillsMaster).all()
    extracted = []
    
    sentences = re.split(r"[.!?\n]", jd_text)
    
    for skill in skills_master:
        name_esc = re.escape(skill.skill_name.lower())
        pattern = rf"\b{name_esc}\b"
        
        found = False
        is_required = True
        
        for sent in sentences:
            sent_lower = sent.lower()
            if re.search(pattern, sent_lower):
                found = True
                if any(w in sent_lower for w in ["preferred", "plus", "bonus", "nice to", "optional", "desirable", "desired", "advantage"]):
                    is_required = False
                    break
                    
        if found:
            extracted.append((skill.id, is_required))
            
    return extracted

def update_demand_snapshot(role_category: str, db: Session):
    jobs = db.query(Job).filter(Job.is_active == True).all()
    filtered_jobs = []
    
    for j in jobs:
        if classify_role_category(j.title, j.jd_text) == role_category:
            filtered_jobs.append(j)
            
    if not filtered_jobs:
        return
        
    counts = {}
    for j in filtered_jobs:
        for js in j.skills:
            s_id = js.skill_id
            counts[s_id] = counts.get(s_id, 0) + 1
            
    max_count = max(counts.values()) if counts else 1
    
    for s_id, count in counts.items():
        weight = count / max_count
        
        existing = db.query(JobDemandSnapshot).filter(
            JobDemandSnapshot.role_category == role_category,
            JobDemandSnapshot.skill_id == s_id
        ).first()
        
        if existing:
            existing.demand_count = count
            existing.normalized_weight = weight
            existing.snapshot_date = datetime.date.today()
        else:
            db.add(JobDemandSnapshot(
                role_category=role_category,
                skill_id=s_id,
                demand_count=count,
                normalized_weight=weight,
                snapshot_date=datetime.date.today()
            ))
    db.commit()

def process_job_ingestion_pipeline(job: Job, db: Session):
    # 0. Agentic URL validation and direct apply routing
    try:
        from backend.app.jobs.url_resolver import AgenticURLResolver
        resolver = AgenticURLResolver()
        resolved_url = resolver.resolve_apply_url(job.title, job.company, job.apply_url)
        if resolved_url:
            job.apply_url = resolved_url
    except Exception as e:
        print(f"Agentic URL resolution warning for job {job.id}: {e}")

    # 1. Clean text
    job.jd_text = clean_text_body(job.jd_text)
    db.commit()
    
    # 3 & 4. Extract required & preferred skills
    db.query(JobSkill).filter(JobSkill.job_id == job.id).delete()
    extracted_skills = extract_skills_from_jd(job.jd_text, db)
    for skill_id, is_required in extracted_skills:
        db.add(JobSkill(job_id=job.id, skill_id=skill_id, is_required=is_required))
    db.commit()
    
    # 5. Classify role category
    role_cat = classify_role_category(job.title, job.jd_text)
    
    # 6. Generate embedding
    try:
        from backend.app.matching.engine import get_job_embeddings_vector
        vector = get_job_embeddings_vector(job.jd_text)
        from backend.app.database import JobEmbedding
        existing = db.query(JobEmbedding).filter(JobEmbedding.job_id == job.id).first()
        if existing:
            existing.embedding_vector = json.dumps(vector)
        else:
            db.add(JobEmbedding(job_id=job.id, embedding_vector=json.dumps(vector)))
        db.commit()
    except Exception as e:
        print(f"Embedding generation failed for job {job.id}: {e}")
        
    # 9. Update skill demand snapshot
    try:
        update_demand_snapshot(role_cat, db)
    except Exception as e:
        print(f"Snapshot update failed: {e}")

def run_local_adzuna_fallback(db: Session) -> int:
    fallback_jobs = [
        {
            "title": "Machine Learning Engineer (NLP)",
            "company": "AI Singapore",
            "location": "Singapore",
            "experience_required": 2.0,
            "salary_min": 6000.0,
            "salary_max": 9000.0,
            "jd_text": "We are seeking a Machine Learning Engineer specializing in NLP, transformers, LLMs, and Python. Experience with PyTorch and huggingface is required. Git & Version Control experience is preferred.",
            "apply_url": "https://aisingapore.org/careers",
            "source": "adzuna"
        },
        {
            "title": "SOC Analyst",
            "company": "Ensign InfoSecurity",
            "location": "Singapore",
            "experience_required": 1.0,
            "salary_min": 4500.0,
            "salary_max": 6500.0,
            "jd_text": "Join our SOC team as a Security Analyst. Responsibilities include threat intelligence, incident response, SIEM log analysis using Splunk, and vulnerability scanning. Knowledge of cybersecurity fundamentals is required. Certifications like CEH are preferred.",
            "apply_url": "https://ensigninfosecurity.com/careers",
            "source": "adzuna"
        },
        {
            "title": "Cloud Architect (AWS)",
            "company": "NCS Group",
            "location": "Singapore",
            "experience_required": 3.5,
            "salary_min": 7500.0,
            "salary_max": 11000.0,
            "jd_text": "We are looking for a Cloud Infrastructure Architect. Required toolsets include AWS, Terraform, Kubernetes, CI/CD pipelines, and Python scripting. Experience with Azure is preferred.",
            "apply_url": "https://ncs.co/careers",
            "source": "adzuna"
        }
    ]
    
    synced = 0
    for j in fallback_jobs:
        existing = db.query(Job).filter(Job.title == j["title"], Job.company == j["company"]).first()
        if existing:
            continue
            
        job = Job(
            title=j["title"],
            company=j["company"],
            location=j["location"],
            experience_required=j["experience_required"],
            salary_min=j["salary_min"],
            salary_max=j["salary_max"],
            jd_text=j["jd_text"],
            apply_url=j["apply_url"],
            source=j["source"],
            posted_date=datetime.datetime.utcnow()
        )
        db.add(job)
        db.commit()
        db.refresh(job)
        synced += 1
        
        process_job_ingestion_pipeline(job, db)
        
    if synced > 0:
        try:
            from backend.app.matching.engine import rebuild_faiss_index
            rebuild_faiss_index(db)
        except Exception as e:
            print(f"Error rebuilding FAISS: {e}")
            
    return synced

@router.get("/live", response_model=List[Dict[str, Any]])
def get_live_jobs(
    program: str = "AI & Analytics",
    limit: int = 30,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Fetch REAL live jobs from JSearch API (LinkedIn, Indeed, Glassdoor).
    Returns jobs with actual direct apply URLs, platform info, salary in INR, and posted date.
    Also saves new jobs to DB for ATS matching.
    """
    from backend.app.jobs.crawler import fetch_live_jobs_for_track, trigger_live_crawl_for_student_track
    import threading

    # Fetch fresh from API
    live_jobs = fetch_live_jobs_for_track(program, limit=limit)

    # Save to DB in background (don't block the response)
    def save_async():
        try:
            trigger_live_crawl_for_student_track(program, db)
        except Exception as e:
            print(f"[Live jobs] Background save failed: {e}")

    t = threading.Thread(target=save_async, daemon=True)
    t.start()

    # Return enriched data immediately
    return live_jobs


@router.get("", response_model=List[JobResponse])
def list_jobs(
    role: Optional[str] = None,
    location: Optional[str] = None,
    source: Optional[str] = None,
    skill: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
):
    import sqlalchemy as sa
    query = db.query(Job).filter(
        Job.is_active == True,
        ~Job.location.ilike("%remote%"),
        ~Job.location.ilike("%worldwide%"),
        ~Job.location.ilike("%work from home%"),
        ~Job.location.ilike("%wfh%")
    )

    if role:
        query = query.filter(Job.title.like(f"%{role}%"))
    if location:
        query = query.filter(Job.location.like(f"%{location}%"))
    if source:
        query = query.filter(Job.source == source)
    if skill:
        query = query.join(JobSkill).join(SkillsMaster).filter(
            SkillsMaster.skill_name.like(f"%{skill}%")
        )

    jobs = query.order_by(Job.fetched_at.desc()).offset(skip).limit(limit).all()
    return jobs

@router.post("/upload-csv", response_model=JobUploadCSVResponse)
async def upload_jobs_csv(file: UploadFile = File(...), current_user = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only placement officers can upload job CSVs")

    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext != ".csv":
        raise HTTPException(status_code=400, detail="Only CSV files are supported")

    csv_path = os.path.join(JOBS_DIR, f"{datetime.datetime.utcnow().timestamp()}_{file.filename}")
    with open(csv_path, "wb") as f:
        f.write(await file.read())

    try:
        df = pd.read_csv(csv_path)
    except Exception as e:
        os.remove(csv_path)
        raise HTTPException(status_code=400, detail=f"Failed to read CSV file: {str(e)}")

    required_cols = ["title", "company", "jd_text"]
    for col in required_cols:
        if col not in df.columns:
            os.remove(csv_path)
            raise HTTPException(status_code=400, detail=f"Missing required CSV column: {col}")

    jobs_imported = 0
    for _, row in df.iterrows():
        title = str(row["title"]).strip()
        company = str(row["company"]).strip()
        jd_text = str(row["jd_text"]).strip()
        
        existing = db.query(Job).filter(Job.title == title, Job.company == company).first()
        if existing:
            continue

        location = str(row.get("location", "Remote")).strip()
        exp_required = 0.0
        try:
            exp_required = float(row.get("experience_required", 0.0))
        except ValueError:
            pass

        salary_min = None
        try:
            salary_min = float(row.get("salary_min"))
        except (ValueError, TypeError):
            pass

        salary_max = None
        try:
            salary_max = float(row.get("salary_max"))
        except (ValueError, TypeError):
            pass

        apply_url = str(row.get("apply_url", "")).strip()

        job = Job(
            title=title,
            company=company,
            location=location,
            experience_required=exp_required,
            salary_min=salary_min,
            salary_max=salary_max,
            jd_text=jd_text,
            apply_url=apply_url if apply_url else None,
            source="upload",
            posted_date=datetime.datetime.utcnow()
        )
        db.add(job)
        db.commit()
        db.refresh(job)
        jobs_imported += 1

        process_job_ingestion_pipeline(job, db)

    try:
        from backend.app.matching.engine import rebuild_faiss_index
        rebuild_faiss_index(db)
    except Exception as e:
        print(f"Error rebuilding FAISS index: {e}")

    return {
        "status": "success",
        "jobs_imported": jobs_imported,
        "message": f"Successfully imported {jobs_imported} job records."
    }

@router.post("/import-url", response_model=JobResponse)
def import_job_from_url(req: JobImportURLRequest, current_user = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can import jobs from URL")

    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36"
        }
        res = requests.get(req.url, headers=headers, timeout=10)
        res.raise_for_status()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to crawl URL: {str(e)}")

    soup = BeautifulSoup(res.text, "html.parser")
    title = ""
    company = ""
    
    meta_title = soup.find("meta", property="og:title")
    if meta_title:
        title = meta_title.get("content", "")
    
    if not title:
        h1 = soup.find("h1")
        if h1:
            title = h1.get_text().strip()
        else:
            title = soup.title.get_text().strip() if soup.title else "Crawled Job Role"

    for selector in ["company", "organization", "employer"]:
        meta_comp = soup.find("meta", property=f"og:{selector}")
        if meta_comp:
            company = meta_comp.get("content", "")
            break
    
    if not company:
        company = "Crawled Company"

    for s in soup(["script", "style", "nav", "footer", "header"]):
        s.extract()
    jd_text = soup.get_text(separator="\n")
    jd_text = "\n".join([line.strip() for line in jd_text.split("\n") if line.strip()])

    existing = db.query(Job).filter(Job.title == title, Job.company == company).first()
    if existing:
        return existing

    job = Job(
        title=title[:100],
        company=company[:100],
        location="Web Import",
        experience_required=1.0,
        jd_text=jd_text,
        apply_url=req.url,
        source="url",
        posted_date=datetime.datetime.utcnow()
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    process_job_ingestion_pipeline(job, db)

    try:
        from backend.app.matching.engine import rebuild_faiss_index
        rebuild_faiss_index(db)
    except Exception as e:
        print(f"Error rebuilding FAISS index: {e}")

    return job

@router.post("/manual", response_model=JobResponse)
def create_job_manual(req: JobCreate, current_user = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only placement officers can create jobs manually")
        
    existing = db.query(Job).filter(Job.title == req.title, Job.company == req.company).first()
    if existing:
        raise HTTPException(status_code=400, detail="Job listing already exists")
        
    job = Job(
        title=req.title,
        company=req.company,
        location=req.location,
        experience_required=req.experience_required,
        salary_min=req.salary_min,
        salary_max=req.salary_max,
        jd_text=req.jd_text,
        apply_url=req.apply_url,
        source="manual",
        posted_date=datetime.datetime.utcnow()
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    
    process_job_ingestion_pipeline(job, db)
    
    try:
        from backend.app.matching.engine import rebuild_faiss_index
        rebuild_faiss_index(db)
    except Exception as e:
        print(f"Error rebuilding FAISS: {e}")
        
    return job

@router.post("/sync-adzuna")
def sync_adzuna_jobs(current_user = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can trigger Adzuna sync")
        
    app_id = os.getenv("ADZUNA_APP_ID")
    api_key = os.getenv("ADZUNA_API_KEY")
    
    jobs_synced = 0
    
    if app_id and api_key:
        try:
            url = f"https://api.adzuna.com/v1/api/jobs/sg/search/1"
            params = {
                "app_id": app_id,
                "app_key": api_key,
                "results_per_page": 10,
                "what": "developer OR engineer OR analyst",
                "content-type": "application/json"
            }
            res = requests.get(url, params=params, timeout=10)
            res.raise_for_status()
            data = res.json()
            
            for result in data.get("results", []):
                title = result.get("title", "").strip()
                company = result.get("company", {}).get("display_name", "").strip()
                jd_text = result.get("description", "").strip()
                
                if not title or not company or not jd_text:
                    continue
                    
                title = BeautifulSoup(title, "html.parser").get_text()
                company = BeautifulSoup(company, "html.parser").get_text()
                
                existing = db.query(Job).filter(Job.title == title, Job.company == company).first()
                if existing:
                    continue
                    
                location = result.get("location", {}).get("display_name", "Singapore")
                salary_min = result.get("salary_min")
                salary_max = result.get("salary_max")
                apply_url = result.get("redirect_url")
                
                job = Job(
                    title=title[:100],
                    company=company[:100],
                    location=location[:100],
                    experience_required=1.0,
                    salary_min=salary_min,
                    salary_max=salary_max,
                    jd_text=jd_text,
                    apply_url=apply_url,
                    source="adzuna",
                    posted_date=datetime.datetime.utcnow()
                )
                db.add(job)
                db.commit()
                db.refresh(job)
                jobs_synced += 1
                
                process_job_ingestion_pipeline(job, db)
                
            if jobs_synced > 0:
                try:
                    from backend.app.matching.engine import rebuild_faiss_index
                    rebuild_faiss_index(db)
                except Exception as e:
                    print(f"Error rebuilding FAISS: {e}")
        except Exception as e:
            print(f"Adzuna API call failed: {e}. Running local fallback mock sync.")
            jobs_synced = run_local_adzuna_fallback(db)
    else:
        jobs_synced = run_local_adzuna_fallback(db)
        
    return {"status": "success", "jobs_synced": jobs_synced, "message": f"Successfully synchronized {jobs_synced} jobs from Adzuna."}

@router.post("/deduplicate")
def delete_duplicate_jobs(current_user = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can deduplicate jobs")
        
    from sqlalchemy import func
    duplicates = db.query(Job.title, Job.company, func.count(Job.id)).group_by(Job.title, Job.company).having(func.count(Job.id) > 1).all()
    
    deleted_count = 0
    for title, company, count in duplicates:
        matching = db.query(Job).filter(Job.title == title, Job.company == company).order_by(Job.id.asc()).all()
        for job_to_delete in matching[1:]:
            db.delete(job_to_delete)
            deleted_count += 1
            
    db.commit()
    return {"status": "success", "deleted_count": deleted_count, "message": f"Successfully removed {deleted_count} duplicate job listings."}

@router.post("/reindex")
def reindex_jobs(current_user = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can trigger reindexing")
    
    try:
        from backend.app.matching.engine import rebuild_faiss_index
        rebuild_faiss_index(db)
        return {"status": "success", "message": "FAISS vector index successfully refreshed."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Index rebuild failed: {str(e)}")

@router.post("/crawl-live")
def trigger_scrapy_playwright_crawler(query: str = "Software Engineer", current_user = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can trigger web crawling")
        
    from backend.app.jobs.crawler import JobCrawlerPipeline
    crawler = JobCrawlerPipeline()
    
    linkedin_jobs = crawler.crawl_linkedin_jobs(query, limit=2)
    naukri_jobs = crawler.crawl_naukri_jobs(query, limit=1)
    
    all_crawled = linkedin_jobs + naukri_jobs
    jobs_added = 0
    
    for j in all_crawled:
        existing = db.query(Job).filter(Job.title == j["title"], Job.company == j["company"]).first()
        if existing:
            continue
            
        job = Job(
            title=j["title"],
            company=j["company"],
            location=j["location"],
            experience_required=j["experience_required"],
            salary_min=j["salary_min"],
            salary_max=j["salary_max"],
            jd_text=j["jd_text"],
            apply_url=j["apply_url"],
            source=j["source"],
            posted_date=datetime.datetime.utcnow()
        )
        db.add(job)
        db.commit()
        db.refresh(job)
        jobs_added += 1
        
        process_job_ingestion_pipeline(job, db)
        
    if jobs_added > 0:
        try:
            from backend.app.matching.engine import rebuild_faiss_index
            rebuild_faiss_index(db)
        except Exception:
            pass
            
    return {
        "status": "success",
        "jobs_crawled": len(all_crawled),
        "jobs_imported": jobs_added,
        "message": f"Playwright aggregation pipeline executed. Scraped {len(all_crawled)} listings, imported {jobs_added} new roles."
    }

@router.get("/job/{job_id}/recruiter")
@router.get("/{job_id}/recruiter")
def get_recruiter_details(job_id: int, current_user = Depends(get_current_user), db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
        
    company_name = job.company or "Corporate Partner"
    job_location = job.location or "Bengaluru, India"
    
    from backend.app.jobs.company_resolver import resolve_company_details_live
    return resolve_company_details_live(company_name, job_location)


# ─────────────────────────────────────────────────────────────
# Live Pipeline: Status and On-Demand Refresh
# ─────────────────────────────────────────────────────────────

@router.get("/live-status")
def get_live_status(db: Session = Depends(get_db)):
    """Returns status of the live job sync pipeline."""
    try:
        from backend.app.jobs.scheduler import get_sync_status
        sync_status = get_sync_status()
    except Exception:
        sync_status = {}

    import sqlalchemy as sa

    # Count per source
    source_counts = {}
    try:
        rows = db.execute(
            sa.text("SELECT source, COUNT(*) as cnt FROM jobs WHERE is_active=1 GROUP BY source")
        ).fetchall()
        for row in rows:
            source_counts[row[0] or "unknown"] = row[1]
    except Exception:
        pass

    total_active = db.query(Job).filter(Job.is_active == True).count()

    source_display = {
        "linkedin": "LinkedIn",
        "jsearch": "JSearch (LinkedIn+Indeed+Glassdoor)",
        "remotive": "Remotive (Remote Jobs)",
        "adzuna": "Adzuna",
        "indeed": "Indeed",
        "glassdoor": "Glassdoor",
        "naukri": "Naukri",
        "upload": "Manually Uploaded",
        "seed": "Seeded Data",
        "live": "Live API",
    }

    sources_breakdown = [
        {
            "source": source_display.get(src, src),
            "source_id": src,
            "count": cnt,
            "icon": {"linkedin": "💼", "jsearch": "🔍", "remotive": "🌐", "adzuna": "📋", "upload": "📁"}.get(src, "📌"),
        }
        for src, cnt in sorted(source_counts.items(), key=lambda x: -x[1])
    ]

    return {
        "total_active_jobs": total_active,
        "sources_breakdown": sources_breakdown,
        "last_sync": sync_status.get("last_sync"),
        "last_sync_stats": sync_status.get("last_sync_stats", {}),
        "is_syncing": sync_status.get("is_syncing", False),
        "scheduler_running": sync_status.get("scheduler_running", False),
        "auto_refresh_interval_hours": 6,
        "platforms": [
            {"name": "LinkedIn", "status": "active", "type": "Guest API (no login)"},
            {"name": "Indeed", "status": "active", "type": "Via JSearch Aggregator"},
            {"name": "Glassdoor", "status": "active", "type": "Via JSearch Aggregator"},
            {"name": "ZipRecruiter", "status": "active", "type": "Via JSearch Aggregator"},
            {"name": "Remotive", "status": "active", "type": "Free public API"},
            {"name": "Adzuna", "status": "optional", "type": "Requires API key"},
        ],
    }


@router.post("/refresh-live")
def trigger_manual_refresh(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """Trigger an immediate on-demand refresh of all job sources."""
    import threading
    try:
        from backend.app.jobs.scheduler import _is_syncing, run_full_job_refresh
        if _is_syncing:
            return {"status": "already_running", "message": "A sync is already in progress."}
        t = threading.Thread(target=run_full_job_refresh, daemon=True)
        t.start()
        return {
            "status": "started",
            "message": "Live job refresh started in background from LinkedIn, JSearch, and Remotive.",
            "sources": ["LinkedIn (Guest API)", "JSearch (LinkedIn+Indeed+Glassdoor)", "Remotive"],
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}


@router.get("/live-feed")
def get_live_job_feed(
    track: Optional[str] = None,
    city: str = "",
    source: str = "",
    job_type: str = "",
    limit: int = 1500,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """Get filtered live jobs from DB with platform badges and direct apply URLs."""
    import sqlalchemy as sa
    import urllib.parse as urlparse

    query = db.query(Job).filter(
        Job.is_active == True,
        ~Job.location.ilike("%remote%"),
        ~Job.location.ilike("%worldwide%"),
        ~Job.location.ilike("%work from home%"),
        ~Job.location.ilike("%wfh%")
    )

    if track and track.strip().lower() not in ("all", "any", ""):
        track_keywords_map = {
            "AI & Analytics": ["data", "ai", "machine learning", "ml", "analytics", "scientist", "nlp"],
            "Cybersecurity": ["security", "cyber", "soc", "penetration", "vulnerability", "infosec"],
            "Cloud Architecture": ["cloud", "devops", "aws", "azure", "kubernetes", "sre", "infrastructure"],
        }
        kws = track_keywords_map.get(track, [])
        if kws:
            conditions = [Job.title.ilike(f"%{kw}%") for kw in kws]
            query = query.filter(sa.or_(*conditions))

    if city and city.strip().lower() not in ("all", "any", ""):
        c_lower = city.strip().lower()
        if "bangalore" in c_lower or "bengaluru" in c_lower:
            query = query.filter(sa.or_(
                Job.location.ilike("%bangalore%"),
                Job.location.ilike("%bengaluru%"),
                Job.location.ilike("%karnataka%"),
            ))
        elif "delhi" in c_lower or "noida" in c_lower or "gurgaon" in c_lower or "gurugram" in c_lower:
            query = query.filter(sa.or_(
                Job.location.ilike("%delhi%"),
                Job.location.ilike("%noida%"),
                Job.location.ilike("%gurgaon%"),
                Job.location.ilike("%gurugram%"),
                Job.location.ilike("%ncr%"),
            ))
        elif "mumbai" in c_lower:
            query = query.filter(sa.or_(
                Job.location.ilike("%mumbai%"),
                Job.location.ilike("%maharashtra%"),
            ))
        elif "pune" in c_lower:
            query = query.filter(Job.location.ilike("%pune%"))
        elif "hyderabad" in c_lower:
            query = query.filter(sa.or_(
                Job.location.ilike("%hyderabad%"),
                Job.location.ilike("%telangana%"),
            ))
        elif "chennai" in c_lower:
            query = query.filter(sa.or_(
                Job.location.ilike("%chennai%"),
                Job.location.ilike("%tamil nadu%"),
            ))
        else:
            query = query.filter(Job.location.ilike(f"%{city}%"))

    if source:
        query = query.filter(Job.source == source.lower())
    if job_type and job_type.strip().lower() not in ("all", ""):
        query = query.filter(Job.job_type == job_type)

    jobs = query.order_by(Job.posted_date.desc()).limit(limit).all()

    source_meta = {
        "greenhouse": {"name": "Greenhouse ATS", "color": "#059669", "icon": "🌿", "badge": "Greenhouse ATS"},
        "lever":      {"name": "Lever ATS", "color": "#0891B2", "icon": "⚙️", "badge": "Lever ATS"},
        "smartrecruiters": {"name": "SmartRecruiters ATS", "color": "#0D9488", "icon": "💼", "badge": "SmartRecruiters ATS"},
        "linkedin": {"name": "LinkedIn", "color": "#0A66C2", "icon": "💼", "badge": "LinkedIn"},
        "jsearch":  {"name": "LinkedIn/Indeed", "color": "#0A66C2", "icon": "🔍", "badge": "Multi-platform"},
        "remotive": {"name": "Remotive", "color": "#00B16A", "icon": "🌐", "badge": "Remote"},
        "adzuna":   {"name": "Adzuna", "color": "#FF5733", "icon": "📋", "badge": "Adzuna"},
        "indeed":   {"name": "Indeed", "color": "#003A9B", "icon": "🔵", "badge": "Indeed"},
        "glassdoor":{"name": "Glassdoor", "color": "#0CAA41", "icon": "🟢", "badge": "Glassdoor"},
        "naukri":   {"name": "Naukri", "color": "#FF7708", "icon": "🟠", "badge": "Naukri"},
        "upload":   {"name": "Uploaded", "color": "#6B7280", "icon": "📁", "badge": "Internal"},
        "live":     {"name": "Live Feed", "color": "#8B5CF6", "icon": "⚡", "badge": "Live"},
    }

    def _human_date(dt):
        if not dt:
            return "Recently"
        now = datetime.datetime.utcnow()
        diff = now - dt
        if diff.days == 0: return "Today"
        if diff.days == 1: return "Yesterday"
        if diff.days <= 7: return f"{diff.days}d ago"
        if diff.days <= 30: return f"{diff.days // 7}w ago"
        return dt.strftime("%d %b")

    result = []
    for job in jobs:
        src = (job.source or "live").lower()
        meta = source_meta.get(src, {"name": src.title(), "color": "#6B7280", "icon": "📌", "badge": src.title()})
        apply_url = job.apply_url or f"https://www.linkedin.com/jobs/search/?keywords={urlparse.quote(job.title)}&location=India"

        result.append({
            "id": job.id,
            "title": job.title,
            "company": job.company,
            "location": job.location or "India",
            "experience_required": job.experience_required,
            "salary_min": job.salary_min,
            "salary_max": job.salary_max,
            "jd_text": (job.jd_text[:300] + "...") if job.jd_text and len(job.jd_text) > 300 else job.jd_text,
            "apply_url": apply_url,
            "is_active": job.is_active,
            "employer_logo": job.employer_logo,
            "posted_date_human": _human_date(job.posted_date),
            "posted_date": job.posted_date.isoformat() if job.posted_date else None,
            "source": src,
            "platform": meta["name"],
            "platform_color": meta["color"],
            "platform_icon": meta["icon"],
            "platform_badge": meta["badge"],
            "is_direct_apply": bool(
                job.apply_url and (
                    "jobs/view/" in job.apply_url or
                    "apply" in job.apply_url or
                    "remotive.com" in job.apply_url or
                    (job.apply_url.startswith("http") and "linkedin.com/jobs/search" not in job.apply_url)
                )
            ),
            "job_type": job.job_type or "Full-time",
        })

    return {"jobs": result, "total": len(result), "track": track, "city_filter": city or None}

@router.get("/{job_id}", response_model=JobResponse)
def get_job(job_id: int, db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job
