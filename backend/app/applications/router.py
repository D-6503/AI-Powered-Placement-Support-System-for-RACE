from datetime import date
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from backend.app.database import get_db, Student, Job, Application, User
from backend.app.auth.utils import get_current_user

router = APIRouter(prefix="/applications", tags=["Applications"])

class ApplicationCreate(BaseModel):
    job_id: int
    status: Optional[str] = "Saved"
    notes: Optional[str] = None
    follow_up_date: Optional[date] = None

class ApplicationUpdate(BaseModel):
    status: str
    notes: Optional[str] = None
    follow_up_date: Optional[date] = None

class ApplicationResponse(BaseModel):
    id: int
    student_id: int
    job_id: int
    job_title: str
    company: str
    fit_score: float
    status: str
    notes: Optional[str] = None
    follow_up_date: Optional[date] = None
    updated_at: str

    class Config:
        from_attributes = True

def send_simulated_email(recipient_email: str, subject: str, body: str):
    import os
    import smtplib
    from email.mime.text import MIMEText
    
    print("\n" + "="*80)
    print(f"📧 SMTP SIMULATED OUTBOX DISPATCH")
    print(f"Recipient: {recipient_email}")
    print(f"Subject: {subject}")
    print("-" * 80)
    print(body)
    print("="*80 + "\n")
    
    smtp_host = os.getenv("SMTP_HOST")
    smtp_port = os.getenv("SMTP_PORT")
    smtp_user = os.getenv("SMTP_USER")
    smtp_pass = os.getenv("SMTP_PASSWORD")
    
    if smtp_host and smtp_port and smtp_user and smtp_pass:
        try:
            msg = MIMEText(body)
            msg['Subject'] = subject
            msg['From'] = smtp_user
            msg['To'] = recipient_email
            
            with smtplib.SMTP(smtp_host, int(smtp_port)) as server:
                server.starttls()
                server.login(smtp_user, smtp_pass)
                server.send_message(msg)
            print("🚀 Real SMTP Dispatch: Success!")
        except Exception as e:
            print(f"⚠️ Real SMTP Dispatch failed (using fallback simulation): {e}")

@router.post("", response_model=ApplicationResponse)
def create_application(req: ApplicationCreate, current_user = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Only students can apply to jobs")

    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")

    job = db.query(Job).filter(Job.id == req.job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    # Check if already tracked
    existing = db.query(Application).filter(
        Application.student_id == student.id,
        Application.job_id == req.job_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Job already tracked in applications dashboard")

    db_app = Application(
        student_id=student.id,
        job_id=req.job_id,
        status=req.status,
        notes=req.notes,
        follow_up_date=req.follow_up_date
    )
    db.add(db_app)
    db.commit()
    db.refresh(db_app)

    # Get fit score
    from backend.app.database import FitScore
    fit = db.query(FitScore).filter(FitScore.student_id == student.id, FitScore.job_id == job.id).first()
    fit_score = fit.final_score if fit else 0.0

    # Trigger Email notification if Applied
    if req.status == "Applied":
        subject = f"REVA RACE: Application Submitted for {job.title} at {job.company}"
        body = f"Hi {current_user.full_name},\n\nCongratulations! Your application for the position of {job.title} at {job.company} has been successfully submitted.\n\nBest regards,\nREVA RACE Placement Team"
        send_simulated_email(student.college_email or current_user.email, subject, body)
        
        # Save to database
        from backend.app.database import SimulatedEmail
        db_email = SimulatedEmail(
            student_id=student.id,
            recipient=student.college_email or current_user.email,
            subject=subject,
            body=body
        )
        db.add(db_email)
        db.commit()

    return {
        "id": db_app.id,
        "student_id": db_app.student_id,
        "job_id": db_app.job_id,
        "job_title": job.title,
        "company": job.company,
        "fit_score": fit_score,
        "status": db_app.status,
        "notes": db_app.notes,
        "follow_up_date": db_app.follow_up_date,
        "updated_at": db_app.updated_at.strftime("%Y-%m-%d %H:%M")
    }

@router.get("/student/{student_id}", response_model=List[ApplicationResponse])
def list_student_applications(student_id: int, current_user = Depends(get_current_user), db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    if current_user.role == "student":
        cur_student = db.query(Student).filter(Student.user_id == current_user.id).first()
        if not cur_student or cur_student.id != student_id:
            raise HTTPException(status_code=403, detail="Not authorized")

    apps = db.query(Application).filter(Application.student_id == student_id).all()
    res = []
    
    from backend.app.database import FitScore
    for app in apps:
        fit = db.query(FitScore).filter(FitScore.student_id == student_id, FitScore.job_id == app.job_id).first()
        fit_score = fit.final_score if fit else 0.0
        
        res.append({
            "id": app.id,
            "student_id": app.student_id,
            "job_id": app.job_id,
            "job_title": app.job.title,
            "company": app.job.company,
            "fit_score": fit_score,
            "status": app.status,
            "notes": app.notes,
            "follow_up_date": app.follow_up_date,
            "updated_at": app.updated_at.strftime("%Y-%m-%d %H:%M")
        })
        
    return res

@router.put("/{application_id}", response_model=ApplicationResponse)
def update_application_status(application_id: int, req: ApplicationUpdate, current_user = Depends(get_current_user), db: Session = Depends(get_db)):
    app = db.query(Application).filter(Application.id == application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    student = db.query(Student).filter(Student.id == app.student_id).first()
    if current_user.role == "student" and student.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    app.status = req.status
    if req.notes is not None:
        app.notes = req.notes
    if req.follow_up_date is not None:
        app.follow_up_date = req.follow_up_date
        
    db.commit()
    db.refresh(app)

    # Trigger Email notification for status update
    subject = f"REVA RACE: Application Status Update - {app.job.title} at {app.job.company}"
    body = f"Hi {student.user.full_name if student.user else 'Candidate'},\n\nYour application status for {app.job.title} at {app.job.company} has been updated to: {req.status}.\n\nBest regards,\nREVA RACE Placement Team"
    send_simulated_email(student.college_email or student.user.email, subject, body)
    
    # Save to database
    from backend.app.database import SimulatedEmail
    db_email = SimulatedEmail(
        student_id=student.id,
        recipient=student.college_email or student.user.email,
        subject=subject,
        body=body
    )
    db.add(db_email)
    db.commit()

    from backend.app.database import FitScore
    fit = db.query(FitScore).filter(FitScore.student_id == student.id, FitScore.job_id == app.job_id).first()
    fit_score = fit.final_score if fit else 0.0

    return {
        "id": app.id,
        "student_id": app.student_id,
        "job_id": app.job_id,
        "job_title": app.job.title,
        "company": app.job.company,
        "fit_score": fit_score,
        "status": app.status,
        "notes": app.notes,
        "follow_up_date": app.follow_up_date,
        "updated_at": app.updated_at.strftime("%Y-%m-%d %H:%M")
    }

class SimulatedEmailResponse(BaseModel):
    id: int
    recipient: str
    subject: str
    body: str
    sent_at: str

    class Config:
        from_attributes = True

@router.get("/emails/{student_id}", response_model=List[SimulatedEmailResponse])
def list_student_emails(student_id: int, current_user = Depends(get_current_user), db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    if current_user.role == "student":
        cur_student = db.query(Student).filter(Student.user_id == current_user.id).first()
        if not cur_student or cur_student.id != student_id:
            raise HTTPException(status_code=403, detail="Not authorized")

    from backend.app.database import SimulatedEmail
    emails = db.query(SimulatedEmail).filter(SimulatedEmail.student_id == student_id).order_by(SimulatedEmail.sent_at.desc()).all()
    
    res = []
    for em in emails:
        res.append({
            "id": em.id,
            "recipient": em.recipient,
            "subject": em.subject,
            "body": em.body,
            "sent_at": em.sent_at.strftime("%Y-%m-%d %H:%M")
        })
    return res

class NominateStudentRequest(BaseModel):
    student_id: int
    job_id: int
    notes: Optional[str] = "Nominated by Placement Officer for corporate selection drive."

@router.post("/admin/nominate")
def nominate_student_for_job(req: NominateStudentRequest, current_user = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only Placement Officers can nominate candidate profiles")

    student = db.query(Student).filter(Student.id == req.student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student record not found")

    job = db.query(Job).filter(Job.id == req.job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job record not found")

    existing = db.query(Application).filter(
        Application.student_id == student.id,
        Application.job_id == req.job_id
    ).first()

    if existing:
        existing.status = "Nominated by Officer"
        if req.notes:
            existing.notes = req.notes
        db_app = existing
    else:
        db_app = Application(
            student_id=student.id,
            job_id=req.job_id,
            status="Nominated by Officer",
            notes=req.notes
        )
        db.add(db_app)

    db.commit()
    db.refresh(db_app)

    # Trigger official referral email dispatch
    student_name = student.user.full_name if student.user else f"Student #{student.id}"
    student_srn = student.srn or f"SRN-{student.id:04d}"
    
    subject = f"REVA RACE Official Placement Referral: {student_name} ({student_srn}) for {job.title} at {job.company}"
    body = f"""OFFICIAL REVA RACE CANDIDATE REFERRAL DOSSIER

Candidate Name: {student_name}
Student Register Number (SRN): {student_srn}
Academic Program: {student.program} ({student.course or 'M.Tech / M.Sc'})
Target Vacancy: {job.title} at {job.company}
Nominated By: {current_user.full_name} (REVA Placement Office)

Dear Talent Acquisition Team at {job.company},

The Placement Office at REVA Academy for Corporate Excellence (RACE) has audited and officially nominated {student_name} for the position of {job.title}. 

Candidate Credentials Summary:
- Verified SRN: {student_srn}
- Program Cohort: {student.program}
- Candidate Experience: {student.experience_years} Yrs

We request you to review this candidate dossier for further shortlisting and corporate interview rounds.

Best regards,
REVA RACE Placement Office
REVA University, Bangalore
support.race@reva.edu.in"""

    send_simulated_email(student.college_email or (student.user.email if student.user else "candidate@reva.edu.in"), subject, body)

    from backend.app.database import SimulatedEmail
    db_email = SimulatedEmail(
        student_id=student.id,
        recipient=student.college_email or (student.user.email if student.user else "candidate@reva.edu.in"),
        subject=subject,
        body=body
    )
    db.add(db_email)
    db.commit()

    return {
        "status": "success",
        "message": f"Candidate {student_name} successfully nominated for {job.title} at {job.company}!",
        "application_id": db_app.id,
        "application_status": db_app.status
    }

