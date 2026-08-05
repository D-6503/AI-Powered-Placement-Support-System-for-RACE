import json
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Dict, Any, List
from backend.app.database import get_db, Student, Resume, Job, Application, SkillsMaster, StudentSkill, FitScore, SkillGapReport
from backend.app.auth.utils import get_current_user
from backend.app.config import ROLE_CATEGORIES

router = APIRouter(prefix="/analytics", tags=["Admin Analytics"])

def get_student_readiness(student: Student, db: Session) -> float:
    # Helper to calculate readiness score
    resume = db.query(Resume).filter(Resume.student_id == student.id).order_by(Resume.uploaded_at.desc()).first()
    resume_score = resume.quality_score if resume else 0.0

    profile_completion = 0.0
    if student.cohort: profile_completion += 20
    if student.enrollment_id: profile_completion += 20
    if student.preferred_locations: profile_completion += 20
    if student.experience_years > 0: profile_completion += 20
    if len(student.skills) > 0: profile_completion += 20

    top_matches = db.query(FitScore).filter(FitScore.student_id == student.id).order_by(FitScore.final_score.desc()).limit(5).all()
    avg_match_score = sum([m.final_score for m in top_matches]) / len(top_matches) if top_matches else 0.0

    readiness = (0.40 * resume_score) + (0.40 * avg_match_score) + (0.20 * profile_completion)
    return min(max(readiness, 0.0), 100.0)

@router.get("/admin/overview")
def get_admin_overview(current_user = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can view admin analytics")

    total_students = db.query(Student).count()
    active_jobs = db.query(Job).filter(Job.is_active == True).count()
    total_apps = db.query(Application).count()

    # Calculate placement ready students (readiness score >= 80)
    ready_count = 0
    students = db.query(Student).all()
    for s in students:
        if get_student_readiness(s, db) >= 80.0:
            ready_count += 1

    # Funnel count
    funnel_stages = ["Saved", "Applied", "Shortlisted", "Interview", "Selected", "Rejected"]
    funnel_counts = {stage: 0 for stage in funnel_stages}
    apps = db.query(Application).all()
    for app in apps:
        if app.status in funnel_counts:
            funnel_counts[app.status] += 1

    # Format funnel as list for frontend charting
    funnel_data = [{"stage": k, "count": v} for k, v in funnel_counts.items()]

    return {
        "total_students": total_students,
        "placement_ready_count": ready_count,
        "active_jobs_count": active_jobs,
        "applications_submitted": total_apps,
        "funnel": funnel_data
    }

@router.get("/admin/skill-heatmap")
def get_admin_skill_heatmap(current_user = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can view skill heatmaps")

    programs = ["AI & Analytics", "Cybersecurity", "Cloud Architecture"]
    
    # We will pick the top 8 skills overall to render in a clean heatmap matrix
    skills = db.query(SkillsMaster).all()
    
    # Compute missing count for each skill per program
    heatmap_matrix = []
    
    # Count missing skills for each student
    students = db.query(Student).all()
    missing_skill_counts = {}  # skill_name -> count
    
    for s in students:
        has_skills = set(sk.skill.skill_name.lower() for sk in s.skills)
        prog_skills = db.query(SkillsMaster).filter(SkillsMaster.category == s.program).all()
        for ps in prog_skills:
            if ps.skill_name.lower() not in has_skills:
                missing_skill_counts[ps.skill_name] = missing_skill_counts.get(ps.skill_name, 0) + 1

    # Sort skills by missing count
    top_missing_skills = sorted(missing_skill_counts.keys(), key=lambda x: missing_skill_counts[x], reverse=True)[:8]
    if not top_missing_skills:
        # Fallback to defaults if no students or missing skills recorded yet
        top_missing_skills = ["Git & Version Control", "Kubernetes", "AWS", "TensorFlow", "Splunk", "Terraform", "Python", "SQL"]

    # Build the matrix: row = skill, column = program
    matrix_data = []
    for skill_name in top_missing_skills:
        row_counts = []
        for prog in programs:
            # Count students in this program who lack this skill
            prog_students = db.query(Student).filter(Student.program == prog).all()
            missing_in_prog = 0
            for ps in prog_students:
                has_it = any(sk.skill.skill_name.lower() == skill_name.lower() for sk in ps.skills)
                if not has_it:
                    missing_in_prog += 1
            row_counts.append(missing_in_prog)
        matrix_data.append({
            "skill": skill_name,
            "counts": row_counts
        })

    return {
        "programs": programs,
        "skills": top_missing_skills,
        "heatmap": matrix_data
    }

@router.get("/admin/job-demand")
def get_admin_job_demand(current_user = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can view job demand analytics")

    from backend.app.database import JobSkill
    # Count skill occurrences in all active jobs
    jobs = db.query(Job).filter(Job.is_active == True).all()
    counts = {}
    for j in jobs:
        for js in j.skills:
            s_name = js.skill.skill_name
            counts[s_name] = counts.get(s_name, 0) + 1

    # Sort demand
    sorted_demand = sorted(counts.items(), key=lambda x: x[1], reverse=True)
    
    res = []
    for s_name, count in sorted_demand[:10]:
        res.append({
            "skill": s_name,
            "count": count,
            "normalized_weight": round(count / len(jobs), 2) if jobs else 0.0
        })

    # Default fallback seed if database is empty
    if not res:
        res = [
            {"skill": "Python", "count": 12, "normalized_weight": 0.9},
            {"skill": "AWS", "count": 10, "normalized_weight": 0.8},
            {"skill": "SQL", "count": 9, "normalized_weight": 0.7},
            {"skill": "Git & Version Control", "count": 8, "normalized_weight": 0.6},
            {"skill": "Kubernetes", "count": 6, "normalized_weight": 0.5}
        ]
        
    return res

@router.get("/admin/program-readiness")
def get_admin_program_readiness(current_user = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can view program readiness")

    programs = ["AI & Analytics", "Cybersecurity", "Cloud Architecture"]
    res = []
    
    for prog in programs:
        students = db.query(Student).filter(Student.program == prog).all()
        if not students:
            res.append({"program": prog, "avg_readiness": 0.0, "student_count": 0})
            continue
            
        total_readiness = sum(get_student_readiness(s, db) for s in students)
        res.append({
            "program": prog,
            "avg_readiness": round(total_readiness / len(students), 1),
            "student_count": len(students)
        })
        
    return res

@router.get("/admin/students")
def get_admin_students_list(current_user = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can view student directory")
        
    students = db.query(Student).all()
    student_list = []
    
    for s in students:
        readiness = get_student_readiness(s, db)
        app_count = db.query(Application).filter(Application.student_id == s.id).count()
        interview_count = db.query(Application).filter(
            Application.student_id == s.id,
            Application.status == "Interview"
        ).count()
        
        student_list.append({
            "id": s.id,
            "full_name": s.user.full_name,
            "email": s.user.email,
            "srn": s.srn or s.enrollment_id or "N/A",
            "program": s.program,
            "course": s.course or "N/A",
            "cohort": s.cohort or "N/A",
            "year": s.year or 2026,
            "readiness_score": round(readiness, 1),
            "applications_count": app_count,
            "interviews_count": interview_count
        })
        
    return student_list
