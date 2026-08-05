import os
import shutil
import hashlib
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session
from backend.app.database import get_db, Student, Resume, ParsedResumeSection, StudentSkill, SkillsMaster, FitScore
from backend.app.auth.utils import get_current_user
from backend.app.resumes.schemas import ResumeUploadResponse, ParsedSectionsResponse, ResumeAuditResponse
from backend.app.resumes.parser import (
    extract_text_from_pdf, 
    extract_text_from_docx, 
    split_resume_sections, 
    extract_skills_from_text, 
    evaluate_resume_quality
)
from backend.app.config import RESUMES_DIR

router = APIRouter(prefix="/resumes", tags=["Resumes"])

@router.post("/upload", response_model=ResumeUploadResponse)
async def upload_resume(file: UploadFile = File(...), current_user = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Only students can upload resumes")

    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found. Please complete profile details first.")

    # Validate file extension
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in [".pdf", ".docx"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file format. Only PDF and DOCX files are supported."
        )

    # Make target filename unique
    file_content = await file.read()
    file_hash = hashlib.sha256(file_content).hexdigest()
    
    filename = f"{student.id}_{file_hash}{file_ext}"
    file_path = os.path.join(RESUMES_DIR, filename)

    # Save file to disk
    with open(file_path, "wb") as f:
        f.write(file_content)

    # Extract text based on file format
    text = ""
    if file_ext == ".pdf":
        text = extract_text_from_pdf(file_path)
    else:
        text = extract_text_from_docx(file_path)

    if not text.strip():
        # Clean up file
        os.remove(file_path)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to extract any text from the uploaded resume. Please check if the file is corrupted."
        )

    # Parse resume sections
    sections = split_resume_sections(text)

    # Compute quality score
    quality_score, checks, improvements = evaluate_resume_quality(sections)

    # Save to Database
    # Remove existing resumes for this student (to keep only one active resume)
    old_resumes = db.query(Resume).filter(Resume.student_id == student.id).all()
    for old in old_resumes:
        if os.path.exists(old.file_path):
            try:
                os.remove(old.file_path)
            except Exception:
                pass
        db.delete(old)

    db_resume = Resume(
        student_id=student.id,
        file_path=file_path,
        file_hash=file_hash,
        quality_score=quality_score,
        parsed_status="success"
    )
    db.add(db_resume)
    db.commit()
    db.refresh(db_resume)

    # Save sections
    for sec_name, sec_text in sections.items():
        db_section = ParsedResumeSection(
            resume_id=db_resume.id,
            section_name=sec_name,
            section_text=sec_text
        )
        db.add(db_section)

    # Extract and update skills
    matched_skills = extract_skills_from_text(text, db)
    
    # Clear old student skills that were 'parsed'
    db.query(StudentSkill).filter(StudentSkill.student_id == student.id, StudentSkill.source == "parsed").delete()

    for skill in matched_skills:
        # Check if already added manually
        existing = db.query(StudentSkill).filter(
            StudentSkill.student_id == student.id, 
            StudentSkill.skill_id == skill.id
        ).first()
        if not existing:
            db.add(StudentSkill(
                student_id=student.id,
                skill_id=skill.id,
                proficiency_level="Intermediate",
                source="parsed"
            ))

    db.commit()

    # Clear old fit scores since student profile/resume just updated
    db.query(FitScore).filter(FitScore.student_id == student.id).delete()
    db.commit()

    return {
        "resume_id": db_resume.id,
        "parsed_status": "success",
        "quality_score": quality_score,
        "message": "Resume uploaded, parsed, and skills list synchronized successfully."
    }

@router.get("/active/parsed", response_model=ParsedSectionsResponse)
def get_active_parsed_resume(current_user = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Only students can view their resume details")
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
    resume = db.query(Resume).filter(Resume.student_id == student.id).order_by(Resume.uploaded_at.desc()).first()
    if not resume:
        raise HTTPException(status_code=404, detail="No active resume found")
    sections = db.query(ParsedResumeSection).filter(ParsedResumeSection.resume_id == resume.id).all()
    sections_dict = {sec.section_name: sec.section_text for sec in sections}
    return {
        "resume_id": resume.id,
        "sections": sections_dict
    }

@router.get("/active/score", response_model=ResumeAuditResponse)
def get_active_resume_audit_score(current_user = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Only students can audit their resume")
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
    resume = db.query(Resume).filter(Resume.student_id == student.id).order_by(Resume.uploaded_at.desc()).first()
    if not resume:
        raise HTTPException(status_code=404, detail="No active resume found")
    sections = db.query(ParsedResumeSection).filter(ParsedResumeSection.resume_id == resume.id).all()
    sections_dict = {sec.section_name: sec.section_text for sec in sections}
    quality_score, checks, improvements = evaluate_resume_quality(sections_dict)
    formatted_checks = []
    for c in checks:
        formatted_checks.append({
            "section": c["section"],
            "status": c["status"],
            "message": c["message"]
        })
    return {
        "resume_id": resume.id,
        "quality_score": quality_score,
        "checks": formatted_checks,
        "suggested_improvements": improvements
    }

@router.get("/{resume_id}/parsed", response_model=ParsedSectionsResponse)
def get_parsed_resume(resume_id: int, current_user = Depends(get_current_user), db: Session = Depends(get_db)):
    resume = db.query(Resume).filter(Resume.id == resume_id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
        
    # Check permissions (student owns it or admin accesses it)
    if current_user.role == "student":
        student = db.query(Student).filter(Student.user_id == current_user.id).first()
        if not student or resume.student_id != student.id:
            raise HTTPException(status_code=403, detail="Not authorized to view this resume details")

    sections = db.query(ParsedResumeSection).filter(ParsedResumeSection.resume_id == resume_id).all()
    sections_dict = {sec.section_name: sec.section_text for sec in sections}
    return {
        "resume_id": resume_id,
        "sections": sections_dict
    }

@router.get("/{resume_id}/score", response_model=ResumeAuditResponse)
def get_resume_audit_score(resume_id: int, current_user = Depends(get_current_user), db: Session = Depends(get_db)):
    resume = db.query(Resume).filter(Resume.id == resume_id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    if current_user.role == "student":
        student = db.query(Student).filter(Student.user_id == current_user.id).first()
        if not student or resume.student_id != student.id:
            raise HTTPException(status_code=403, detail="Not authorized to audit this resume")

    sections = db.query(ParsedResumeSection).filter(ParsedResumeSection.resume_id == resume_id).all()
    sections_dict = {sec.section_name: sec.section_text for sec in sections}

    quality_score, checks, improvements = evaluate_resume_quality(sections_dict)

    # Format checks as AuditCheckItem
    formatted_checks = []
    for c in checks:
        formatted_checks.append({
            "section": c["section"],
            "status": c["status"],
            "message": c["message"]
        })

    return {
        "resume_id": resume_id,
        "quality_score": quality_score,
        "checks": formatted_checks,
        "suggested_improvements": improvements
    }

from backend.app.resumes.schemas import ResumeBuildRequest

@router.post("/build", response_model=ResumeUploadResponse)
def build_resume_manually(req: ResumeBuildRequest, current_user = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Only students can build resumes")
        
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
        
    summary_text = req.summary
    contact_text = f"Name: {current_user.full_name}\nEmail: {current_user.email}\nPhone: {req.phone}"
    
    edu_lines = []
    for edu in req.education:
        gpa_str = f" (GPA: {edu.gpa})" if edu.gpa else ""
        edu_lines.append(f"- {edu.degree} from {edu.institution}, graduated {edu.year}{gpa_str}")
    education_text = "\n".join(edu_lines)
    
    exp_lines = []
    for exp in req.experience:
        exp_lines.append(f"{exp.role} at {exp.company} ({exp.duration})\n{exp.description}")
    experience_text = "\n\n".join(exp_lines)
    
    proj_lines = []
    for proj in req.projects:
        proj_lines.append(f"{proj.title} - Tools: {proj.tools}\n{proj.description}")
    projects_text = "\n\n".join(proj_lines)
    
    skills_text = ", ".join(req.skills)
    
    sections = {
        "contact_info": contact_text,
        "skills": skills_text,
        "experience": experience_text,
        "projects": projects_text,
        "education": education_text
    }
    
    quality_score, checks, improvements = evaluate_resume_quality(sections)
    
    filename = f"{student.id}_built_resume.txt"
    file_path = os.path.join(RESUMES_DIR, filename)
    
    full_text = f"{contact_text}\n\nSUMMARY\n{summary_text}\n\nSKILLS\n{skills_text}\n\nEXPERIENCE\n{experience_text}\n\nPROJECTS\n{projects_text}\n\nEDUCATION\n{education_text}"
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(full_text)
        
    file_hash = hashlib.sha256(full_text.encode("utf-8")).hexdigest()
    
    old_resumes = db.query(Resume).filter(Resume.student_id == student.id).all()
    for old in old_resumes:
        if os.path.exists(old.file_path):
            try:
                os.remove(old.file_path)
            except Exception:
                pass
        db.delete(old)
        
    db_resume = Resume(
        student_id=student.id,
        file_path=file_path,
        file_hash=file_hash,
        quality_score=quality_score,
        parsed_status="success"
    )
    db.add(db_resume)
    db.commit()
    db.refresh(db_resume)
    
    for sec_name, sec_text in sections.items():
        db.add(ParsedResumeSection(
            resume_id=db_resume.id,
            section_name=sec_name,
            section_text=sec_text
        ))
        
    db.query(StudentSkill).filter(StudentSkill.student_id == student.id).delete()
    
    for s_name in req.skills:
        skill = db.query(SkillsMaster).filter(SkillsMaster.skill_name == s_name).first()
        if skill:
            db.add(StudentSkill(
                student_id=student.id,
                skill_id=skill.id,
                proficiency_level="Intermediate",
                source="manual"
            ))
            
    db.commit()
    
    try:
        from backend.app.students.router import refresh_student_fit_scores
        refresh_student_fit_scores(student.id, db)
    except Exception as e:
        print(f"Error rebuilding matching scores: {e}")
        
    return {
        "resume_id": db_resume.id,
        "parsed_status": "success",
        "quality_score": quality_score,
        "message": "Resume manually built and ATS compatibility indexed successfully."
    }
