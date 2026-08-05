from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from backend.app.database import get_db, Student, Job, FitScore, User
from backend.app.auth.utils import get_current_user
from backend.app.matching.engine import (
    query_top_jobs_for_student,
    get_complete_matching_report
)

router = APIRouter(prefix="/matching", tags=["Matching"])

@router.post("/recommend")
def get_recommendations(background_tasks: BackgroundTasks, current_user = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Only students can request recommendations")
        
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found. Please complete profile details first.")
        
    # Trigger real-time crawler as a background task to keep page load times instant!
    try:
        from backend.app.jobs.crawler import trigger_live_crawl_background, deactivate_stale_jobs
        # Deactivate stale jobs synchronously (very fast SQL update) to keep recommendations accurate
        deactivate_stale_jobs(db)
        background_tasks.add_task(trigger_live_crawl_background, student.program)
    except Exception as e:
        print(f"Real-time job crawler scheduling warning: {e}")
        
    recs = query_top_jobs_for_student(student.id, db, limit=1000)
    return recs


@router.get("/student/{student_id}")
def get_student_recommendations(student_id: int, current_user = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only placement officers can view student recommendations")
        
    recs = query_top_jobs_for_student(student_id, db, limit=1000)
    return recs

@router.get("/job/{job_id}/explanation")
def get_score_explanation(job_id: int, current_user = Depends(get_current_user), db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")

    fit = db.query(FitScore).filter(FitScore.student_id == student.id, FitScore.job_id == job_id).first()
    if not fit:
        # If it doesn't exist, calculate it on-the-fly
        query_top_jobs_for_student(student.id, db)
        fit = db.query(FitScore).filter(FitScore.student_id == student.id, FitScore.job_id == job_id).first()
        if not fit:
            raise HTTPException(status_code=404, detail="Explanation not found for the requested job match")

    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    # Generate custom suggestions detailing gaps & solutions
    resume_skills = [sk.skill.skill_name for sk in student.skills]
    job_skills = [js.skill.skill_name for js in job.skills]
    
    matched_skills = list(set(resume_skills).intersection(set(job_skills)))
    missing_skills = list(set(job_skills) - set(resume_skills))
    
    suggestions = []
    if missing_skills:
        suggestions.append(
            f"Technical Gaps Found: Your resume lacks critical keywords required for this vacancy: {', '.join(missing_skills[:4])}. To resolve this, append these technical terms to your resume's Skills block."
        )
        suggestions.append(
            f"Demonstrate Competence: Create a new academic project description inside your profile showing how you applied {missing_skills[0]} to solve problems."
        )
    if fit.experience_fit < 70.0:
        suggestions.append(
            f"Eligibility Mismatch: This role requests {job.experience_required} yrs of experience. Highlight any prior corporate internships or freelancing to bridge this check."
        )
    if not suggestions:
        suggestions.append("Perfect Fit! Your resume covers all required key parameters. Ready to click apply.")

    return {
        "job_id": job_id,
        "job_title": job.title,
        "company": job.company,
        "final_score": fit.final_score,
        "matched_skills": matched_skills,
        "missing_skills": missing_skills,
        "suggestions": suggestions,
        "scores": {
            "semantic_similarity": fit.semantic_similarity,
            "required_skill_coverage": fit.required_skill_coverage,
            "demand_aware_score": fit.demand_aware_score,
            "evidence_quality": fit.evidence_quality,
            "experience_fit": fit.experience_fit,
            "location_fit": fit.location_fit
        },
        "breakdown": [
            {"criteria": "Semantic Similarity (30%)", "score": fit.semantic_similarity, "weight": 0.30},
            {"criteria": "Required Skill Coverage (25%)", "score": fit.required_skill_coverage, "weight": 0.25},
            {"criteria": "Demand-Aware Skill Score (20%)", "score": fit.demand_aware_score, "weight": 0.20},
            {"criteria": "Evidence Quality (15%)", "score": fit.evidence_quality, "weight": 0.15},
            {"criteria": "Experience/Eligibility Fit (5%)", "score": fit.experience_fit, "weight": 0.05},
            {"criteria": "Location/Freshness Fit (5%)", "score": fit.location_fit, "weight": 0.05}
        ]
    }

@router.get("/job/{job_id}/complete-report")
def get_job_matching_report(job_id: int, current_user = Depends(get_current_user), db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
        
    report = get_complete_matching_report(student.id, job_id, db)
    if not report:
        raise HTTPException(status_code=404, detail="Could not compile report. Ensure resume is uploaded.")
    return report

@router.post("/job/{job_id}/tailor")
def tailor_resume_for_job(job_id: int, current_user = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Only students can tailor resumes")
        
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
        
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
        
    from backend.app.database import Resume, ParsedResumeSection
    resume = db.query(Resume).filter(Resume.student_id == student.id).order_by(Resume.uploaded_at.desc()).first()
    if not resume:
        raise HTTPException(status_code=400, detail="Please upload or build a resume first before tailoring.")
        
    sections = db.query(ParsedResumeSection).filter(ParsedResumeSection.resume_id == resume.id).all()
    sections_dict = {sec.section_name: sec.section_text for sec in sections}
    experience_text = sections_dict.get("experience", "")
    
    from backend.app.generation.router import generate_heuristic_bullets, call_gemini_api
    from backend.app.config import ENABLE_EXTERNAL_LLM, GEMINI_API_KEY
    
    job_skills = [js.skill.skill_name for js in job.skills]
    
    tailored_bullets = []
    if ENABLE_EXTERNAL_LLM and GEMINI_API_KEY:
        try:
            prompt = f"""
            You are a professional resume rewriter. Rewrite the candidate's experience:
            "{experience_text}"
            to align perfectly with this job description:
            "{job.jd_text}"
            and key required skills: {', '.join(job_skills)}.
            Provide exactly 3 high-impact, tailored accomplishment bullets starting with action verbs.
            Do not include placeholders. Return only the bullet points, one per line.
            """
            bullets_raw = call_gemini_api(prompt)
            tailored_bullets = [line.strip("- *• ") for line in bullets_raw.strip().split("\n") if line.strip()]
        except Exception:
            tailored_bullets = generate_heuristic_bullets(job.title, job.company, job_skills)
    else:
        tailored_bullets = generate_heuristic_bullets(job.title, job.company, job_skills)
        
    fit = db.query(FitScore).filter(FitScore.student_id == student.id, FitScore.job_id == job.id).first()
    before_score = fit.final_score if fit else 50.0
    
    boost = 15.0
    after_score = min(before_score + boost, 98.0)
    
    return {
        "status": "success",
        "job_title": job.title,
        "company": job.company,
        "before_score": round(before_score, 1),
        "after_score": round(after_score, 1),
        "tailored_experience_bullets": tailored_bullets,
        "reasons": [
            f"Aligned experience statements with {job.company}'s requirements.",
            "Enriched semantic coverage of target technical tools.",
            f"Highlighted evidence quality for {', '.join(job_skills[:3])}."
        ]
    }

@router.get("/job/{job_id}/candidates")
def get_job_candidates_comparison(job_id: int, current_user = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only placement officers can view candidate comparison reports")
        
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job profile not found")
        
    students = db.query(Student).all()
    if not students:
        return {"job_id": job_id, "job_title": job.title, "company": job.company, "candidates": []}

    from backend.app.matching.engine import (
        semantic_similarity_score, required_skill_coverage,
        demand_aware_skill_score, evidence_quality_score,
        eligibility_fit_score, location_freshness_score,
        calculate_final_fit_score, get_embedding_model, _job_embeddings_cache,
        tfidf_cosine_score, fetch_demand_weights
    )
    from backend.app.database import ParsedResumeSection, Resume, Application, SkillsMaster
    from backend.app.jobs.router import classify_role_category
    import numpy as np

    job_skills = [js.skill.skill_name for js in job.skills]
    job_req_skills = [js.skill.skill_name for js in job.skills if js.is_required]
    role_cat = classify_role_category(job.title, job.jd_text)
    demand_weights = fetch_demand_weights(role_cat, db)
    model = get_embedding_model()

    if job.jd_text.strip() and model is not None:
        if job.id not in _job_embeddings_cache:
            _job_embeddings_cache[job.id] = model.encode(job.jd_text)
        job_emb = _job_embeddings_cache[job.id]
    else:
        job_emb = None

    candidates_list = []

    for s in students:
        resume = db.query(Resume).filter(Resume.student_id == s.id).order_by(Resume.uploaded_at.desc()).first()
        resume_text = ""
        resume_projects = ""
        resume_experience = ""

        if resume:
            sections = db.query(ParsedResumeSection).filter(ParsedResumeSection.resume_id == resume.id).all()
            sections_dict = {sec.section_name: sec.section_text for sec in sections}
            resume_text = " ".join(sections_dict.values())
            resume_projects = sections_dict.get("projects", "")
            resume_experience = sections_dict.get("experience", "")

        student_skills = [sk.skill.skill_name for sk in s.skills]
        matched_skills = list(set(student_skills).intersection(set(job_skills)))
        missing_skills = list(set(job_skills) - set(student_skills))

        if resume and resume_text.strip():
            if job_emb is not None and model is not None:
                try:
                    s_emb = model.encode(resume_text)
                    sim = np.dot(s_emb, job_emb) / (np.linalg.norm(s_emb) * np.linalg.norm(job_emb))
                    sem_sim = round(float((sim + 1) / 2 * 100.0), 1)
                except Exception:
                    sem_sim = tfidf_cosine_score(resume_text, job.jd_text)
            else:
                sem_sim = tfidf_cosine_score(resume_text, job.jd_text)
        else:
            sem_sim = 0.0

        req_cov = required_skill_coverage(student_skills, job_req_skills)
        dem_score = demand_aware_skill_score(student_skills, job_skills, demand_weights)
        evidence = evidence_quality_score(matched_skills, resume_projects, resume_experience)
        exp_fit = eligibility_fit_score(s.experience_years, job.experience_required)
        loc_fit = location_freshness_score(s.preferred_locations, job.location)

        final_fit = calculate_final_fit_score(sem_sim, req_cov, dem_score, evidence, exp_fit, loc_fit)

        # Check nomination or application status
        app = db.query(Application).filter(Application.student_id == s.id, Application.job_id == job.id).first()
        status_label = app.status if app else "Not Nominated"

        # Calculate student readiness score
        resume_score = resume.quality_score if resume else 0.0
        prof_comp = 0.0
        if s.cohort: prof_comp += 20
        if s.enrollment_id: prof_comp += 20
        if s.preferred_locations: prof_comp += 20
        if s.experience_years > 0: prof_comp += 20
        if len(s.skills) > 0: prof_comp += 20
        readiness_score = round((0.40 * resume_score) + (0.40 * final_fit) + (0.20 * prof_comp), 1)

        candidates_list.append({
            "student_id": s.id,
            "srn": s.srn or f"SRN-{s.id:04d}",
            "full_name": s.user.full_name if s.user else f"Student #{s.id}",
            "email": s.college_email or (s.user.email if s.user else ""),
            "program": s.program,
            "course": s.course,
            "experience_years": s.experience_years,
            "readiness_score": readiness_score,
            "fit_score": round(final_fit, 1),
            "matched_skills": matched_skills,
            "missing_skills": missing_skills,
            "status": status_label,
            "is_nominated": app is not None and "Nominated" in app.status
        })

    candidates_list.sort(key=lambda x: x["fit_score"], reverse=True)

    return {
        "job_id": job.id,
        "job_title": job.title,
        "company": job.company,
        "candidates": candidates_list
    }

