import os
import csv
import json
import pandas as pd
import datetime
from sqlalchemy.orm import Session
from backend.app.database import engine, SessionLocal, init_db, User, Student, SkillsMaster, Job, JobSkill, StudentSkill, StudentProject, StudentCertification
from backend.app.auth.utils import get_password_hash

def seed_skills(db: Session):
    csv_path = os.path.join(os.path.dirname(__file__), "..", "data", "skill_taxonomy.csv")
    if not os.path.exists(csv_path):
        print(f"Taxonomy CSV not found at {csv_path}")
        return

    with open(csv_path, mode="r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            skill_name = row["skill_name"]
            domain = row["domain"]
            alias_list = row["alias_list"]

            # Check if skill already exists
            existing = db.query(SkillsMaster).filter(SkillsMaster.skill_name == skill_name).first()
            if not existing:
                db_skill = SkillsMaster(
                    skill_name=skill_name,
                    category=domain,
                    alias_list=alias_list
                )
                db.add(db_skill)
    db.commit()
    print("Skills taxonomy seeded successfully.")

def seed_users(db: Session):
    # Admin User
    admin_email = "admin@reva.edu.in"
    existing_admin = db.query(User).filter(User.email == admin_email).first()
    if not existing_admin:
        admin_user = User(
            email=admin_email,
            hashed_password=get_password_hash("admin123"),
            role="admin",
            full_name="Dr. Alex Tan (Placement Director)",
            is_active=True
        )
        db.add(admin_user)
        db.commit()
        print("Default admin created (admin@reva.edu.in / admin123).")

    # Default student accounts removed to start with fresh candidate entry data.
    pass

def seed_jobs(db: Session):
    csv_path = os.path.join("backend", "data", "sample_jobs.csv")
    if not os.path.exists(csv_path):
        # Fallback for alternative execution paths
        csv_path = os.path.join("data", "sample_jobs.csv")
        if not os.path.exists(csv_path):
            csv_path = "backend/data/sample_jobs.csv"

    if not os.path.exists(csv_path):
        print(f"sample_jobs.csv not found at {csv_path}, skipping job seeding.")
        return

    try:
        df = pd.read_csv(csv_path)
        from backend.app.jobs.router import process_job_ingestion_pipeline
        
        count = 0
        for _, row in df.iterrows():
            title = str(row["title"]).strip()
            company = str(row["company"]).strip()
            
            if not title or not company or title == "nan":
                continue

            jd_text = str(row.get("jd_text", "")).strip()
            
            existing = db.query(Job).filter(Job.title == title, Job.company == company).first()
            if existing:
                # Update apply_url if it changed
                apply_url = str(row.get("apply_url", "")).strip()
                if apply_url and existing.apply_url != apply_url:
                    existing.apply_url = apply_url
                    # Update source too
                    source_val = str(row.get("source", "upload")).strip()
                    if source_val and source_val != "nan":
                        existing.source = source_val
                    db.commit()
                continue

            location = str(row.get("location", "Bangalore, India")).strip()
            exp_required = 0.0
            try:
                exp_required = float(row.get("experience_required", 0.0))
            except (ValueError, TypeError):
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
            if apply_url == "nan":
                apply_url = ""

            # Read source from CSV (linkedin, naukri, direct, upload etc.)
            source_val = str(row.get("source", "upload")).strip()
            if source_val == "nan" or not source_val:
                source_val = "upload"

            # Parse posted_date from CSV if available
            posted_date_val = datetime.datetime.utcnow()
            raw_date = str(row.get("posted_date", "")).strip()
            if raw_date and raw_date != "nan":
                try:
                    posted_date_val = datetime.datetime.strptime(raw_date, "%Y-%m-%d")
                except Exception:
                    pass

            job = Job(
                title=title,
                company=company,
                location=location,
                experience_required=exp_required,
                salary_min=salary_min,
                salary_max=salary_max,
                jd_text=jd_text,
                apply_url=apply_url if apply_url else None,
                source=source_val,
                posted_date=posted_date_val,
                is_active=True
            )
            db.add(job)
            db.commit()
            db.refresh(job)
            count += 1

            process_job_ingestion_pipeline(job, db)
            
        print(f"{count} Sample job listings seeded from CSV successfully.")
    except Exception as e:
        import traceback
        print(f"Error seeding jobs from CSV: {e}")
        traceback.print_exc()


def seed_all():
    db = SessionLocal()
    try:
        seed_skills(db)
        seed_users(db)
        seed_jobs(db)
    finally:
        db.close()

if __name__ == "__main__":
    init_db()
    seed_all()
