from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.database import get_db, Student, User, Resume, StudentSkill, Application, Job, SkillsMaster, FitScore, SkillGapReport
from backend.app.auth.utils import get_current_user
from backend.app.students.schemas import StudentProfile, StudentProfileResponse, StudentDashboardResponse
import json

router = APIRouter(prefix="/students", tags=["Students"])

@router.post("/profile", response_model=StudentProfileResponse)
def create_or_update_profile(profile_in: StudentProfile, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Only students can have a student profile")
        
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    
    if student:
        # Update existing profile
        student.program = profile_in.program
        student.target_role = profile_in.target_role
        student.experience_years = profile_in.experience_years
        student.preferred_locations = profile_in.preferred_locations
        student.cohort = profile_in.cohort
        student.enrollment_id = profile_in.enrollment_id
        student.srn = profile_in.srn
        student.dob = profile_in.dob
        student.course = profile_in.course
        student.year = profile_in.year
        student.college_email = profile_in.college_email
        student.study_mode = profile_in.study_mode
    else:
        # Create new profile
        student = Student(
            user_id=current_user.id,
            program=profile_in.program,
            target_role=profile_in.target_role,
            experience_years=profile_in.experience_years,
            preferred_locations=profile_in.preferred_locations,
            cohort=profile_in.cohort,
            enrollment_id=profile_in.enrollment_id,
            srn=profile_in.srn,
            dob=profile_in.dob,
            course=profile_in.course,
            year=profile_in.year,
            college_email=profile_in.college_email,
            study_mode=profile_in.study_mode
        )
        db.add(student)
        
    db.commit()
    db.refresh(student)
    return student

@router.get("/profile", response_model=StudentProfileResponse)
def get_profile(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found. Please complete profile details first.")
    return student

@router.get("/dashboard", response_model=StudentDashboardResponse)
def get_dashboard(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        # Return blank defaults if profile doesn't exist yet
        return {
            "readiness_score": 0.0,
            "resume_score": 0.0,
            "jobs_matched_count": 0,
            "applications_count": 0,
            "missing_skills": [],
            "recent_applications": []
        }

    # Fetch resume score
    resume = db.query(Resume).filter(Resume.student_id == student.id).order_by(Resume.uploaded_at.desc()).first()
    resume_score = resume.quality_score if resume else 0.0

    # Fetch jobs matched count
    jobs_matched_count = db.query(FitScore).filter(FitScore.student_id == student.id).count()

    # Fetch applications count
    applications = db.query(Application).filter(Application.student_id == student.id).all()
    applications_count = len(applications)

    # Format recent applications
    recent_apps = []
    for app in sorted(applications, key=lambda x: x.updated_at, reverse=True)[:5]:
        recent_apps.append({
            "id": app.id,
            "job_title": app.job.title,
            "company": app.job.company,
            "status": app.status,
            "updated_at": app.updated_at.strftime("%Y-%m-%d %H:%M")
        })

    # Fetch missing skills list from the report database or generate placeholders
    missing_skills = []
    report = db.query(SkillGapReport).filter(SkillGapReport.student_id == student.id).first()
    if report:
        try:
            missing_skills_list = json.loads(report.missing_skills_json)
            # Take top 5
            for ms in missing_skills_list[:5]:
                missing_skills.append({
                    "skill": ms.get("skill"),
                    "priority": ms.get("priority", "Medium"),
                    "demand_weight": ms.get("demand_weight", 0.5)
                })
        except Exception:
            pass

    # Fallback to general skills if no report exists yet
    if not missing_skills:
        # Check student skills
        has_skills = [sk.skill.skill_name for sk in student.skills]
        # Query typical high demand skills for program
        prog_skills = db.query(SkillsMaster).filter(SkillsMaster.category == student.program).all()
        count = 0
        for ps in prog_skills:
            if ps.skill_name not in has_skills:
                missing_skills.append({
                    "skill": ps.skill_name,
                    "priority": "High" if count < 2 else "Medium",
                    "demand_weight": 0.8 if count < 2 else 0.5
                })
                count += 1
                if count >= 5:
                    break

    # Calculate overall placement readiness score
    # Formula: 0.40 * resume_score + 0.40 * (average fit score of top 5 recommendations) + 0.20 * profile_completion
    profile_completion = 0.0
    if student.cohort: profile_completion += 20
    if student.enrollment_id: profile_completion += 20
    if student.preferred_locations: profile_completion += 20
    if student.experience_years > 0: profile_completion += 20
    if len(student.skills) > 0: profile_completion += 20

    top_matches = db.query(FitScore).filter(FitScore.student_id == student.id).order_by(FitScore.final_score.desc()).limit(5).all()
    avg_match_score = sum([m.final_score for m in top_matches]) / len(top_matches) if top_matches else 0.0

    readiness_score = (0.40 * resume_score) + (0.40 * avg_match_score) + (0.20 * profile_completion)
    readiness_score = min(max(readiness_score, 0.0), 100.0)

    status_counts = {"Saved": 0, "Applied": 0, "Shortlisted": 0, "Interview": 0, "Selected": 0, "Rejected": 0}
    for app in applications:
        if app.status in status_counts:
            status_counts[app.status] += 1
        else:
            status_counts[app.status] = 1

    return {
        "readiness_score": round(readiness_score, 1),
        "resume_score": round(resume_score, 1),
        "jobs_matched_count": jobs_matched_count,
        "applications_count": applications_count,
        "missing_skills": missing_skills,
        "recent_applications": recent_apps,
        "applications_by_status": status_counts
    }

@router.post("/profile/skills")
def add_student_skill(req: dict, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Only students can update their skills")
        
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
        
    skill_name = req.get("skill_name")
    if not skill_name:
        raise HTTPException(status_code=400, detail="skill_name is required")
        
    skill_master = db.query(SkillsMaster).filter(SkillsMaster.skill_name == skill_name).first()
    if not skill_master:
        raise HTTPException(status_code=404, detail="Skill not found in taxonomy")
        
    existing = db.query(StudentSkill).filter(
        StudentSkill.student_id == student.id,
        StudentSkill.skill_id == skill_master.id
    ).first()
    
    if not existing:
        db.add(StudentSkill(
            student_id=student.id,
            skill_id=skill_master.id,
            proficiency_level="Intermediate",
            source="manual"
        ))
        db.commit()
        
        try:
            refresh_student_fit_scores(student.id, db)
        except Exception as e:
            print(f"Error refreshing fit scores: {e}")
            
    return {"status": "success", "message": f"Skill {skill_name} successfully added."}

def refresh_student_fit_scores(student_id: int, db: Session):
    from backend.app.database import FitScore, Job, Student
    from backend.app.matching.engine import calculate_final_fit_score
    from backend.app.jobs.router import classify_role_category
    from backend.app.matching.engine import (
        keyword_overlap_score, tfidf_cosine_score, semantic_similarity_score,
        required_skill_coverage, demand_aware_skill_score, evidence_quality_score,
        eligibility_fit_score, location_freshness_score
    )
    from backend.app.database import Resume, ParsedResumeSection, JobDemandSnapshot
    
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        return
        
    db.query(FitScore).filter(FitScore.student_id == student_id).delete()
    
    jobs = db.query(Job).filter(Job.is_active == True).all()
    for job in jobs:
        resume = db.query(Resume).filter(Resume.student_id == student_id).order_by(Resume.uploaded_at.desc()).first()
        resume_text = ""
        if resume:
            sections = db.query(ParsedResumeSection).filter(ParsedResumeSection.resume_id == resume.id).all()
            resume_text = " ".join([sec.section_text for sec in sections])
            
        student_skills = [s.skill.skill_name for s in student.skills]
        job_skills = [js.skill.skill_name for js in job.skills]
        
        kw_score = keyword_overlap_score(student_skills, job_skills)
        tfidf_score = tfidf_cosine_score(resume_text, job.jd_text)
        sem_score = semantic_similarity_score(resume_text, job.jd_text)
        req_cov = required_skill_coverage(student_skills, [js.skill.skill_name for js in job.skills if js.is_required])
        
        role_cat = classify_role_category(job.title, job.jd_text)
        snapshots = db.query(JobDemandSnapshot).filter(JobDemandSnapshot.role_category == role_cat).all()
        demand_map = {s.skill.skill_name: s.normalized_weight for s in snapshots if s.skill}
        dem_score = demand_aware_skill_score(student_skills, job_skills, demand_map)
        
        ev_score = evidence_quality_score(student_skills, resume_text)
        elig_score = eligibility_fit_score(student.experience_years, job.experience_required)
        loc_score = location_freshness_score(job.location, student.preferred_locations, job.posted_date)
        
        final_score = calculate_final_fit_score(
            sem_score, req_cov, dem_score, ev_score, elig_score, loc_score
        )
        
        db.add(FitScore(
            student_id=student_id,
            job_id=job.id,
            final_score=final_score,
            semantic_similarity=sem_score,
            required_skill_coverage=req_cov,
            demand_aware_score=dem_score,
            evidence_quality=ev_score,
            experience_fit=elig_score,
            location_fit=loc_score
        ))
        
    db.commit()

