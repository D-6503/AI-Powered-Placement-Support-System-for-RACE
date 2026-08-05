import os
import requests
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from backend.app.database import get_db, Student, Job, GeneratedDocument
from backend.app.auth.utils import get_current_user
import backend.app.config as config

router = APIRouter(prefix="/generation", tags=["Generation"])

class ResumeBulletRequest(BaseModel):
    resume_text: str
    job_description: str

class DocumentRequest(BaseModel):
    job_id: int

# Heuristic generators
def generate_heuristic_bullets(job_title: str, company: str, job_skills: list) -> list:
    skills_str = ", ".join(job_skills[:3])
    return [
        f"Designed and deployed enterprise-grade services aligning with {company}'s requirements using {skills_str}.",
        f"Optimized computational throughput and resolved system bottlenecks, resulting in a 25% efficiency increase for {job_title} workflows.",
        f"Collaborated with cross-functional teams to integrate best practices for {', '.join(job_skills[1:4])}."
    ]

def generate_heuristic_letter(name: str, program: str, job_title: str, company: str, job_skills: list) -> str:
    skills_str = ", ".join(job_skills[:4])
    return f"""Dear Hiring Team at {company},

I am writing to express my strong interest in the {job_title} position. As a postgraduate student in the {program} program at REVA, I have developed deep technical expertise in {skills_str}, which directly align with your requirements.

Throughout my coursework and academic projects, I have focused on solving complex problems and deploying secure, scalable, and optimized systems. I am highly motivated by {company}'s mission and would welcome the opportunity to contribute my skills to your team.

Thank you for your time and consideration.

Sincerely,
{name}"""

def generate_heuristic_email(name: str, job_title: str, company: str, job_skills: list) -> str:
    skills_str = ", ".join(job_skills[:3])
    return f"""Subject: Expressing Interest - {job_title} Role - {name}

Dear Recruiter,

I hope this email finds you well. 

My name is {name}, and I am a postgraduate student at REVA. I recently came across the {job_title} opening at {company} and wanted to reach out, as my background in {skills_str} directly matches the key qualifications you are seeking.

I have attached my resume for your review and would appreciate a brief conversation to discuss how my skills and academic projects can add value to the engineering team at {company}.

Best regards,
{name}
Postgraduate Student, REVA"""

def generate_heuristic_linkedin(name: str, job_title: str, company: str) -> str:
    return f"Hi, I hope you're having a great week! My name is {name}, and I'm a postgraduate student at REVA. I'm highly interested in the {job_title} role at {company} and would love to connect to learn more about the team's culture and engineering challenges."

# Call Gemini API
def call_gemini_api(prompt: str) -> str:
    if not config.GEMINI_API_KEY:
        raise ValueError("Gemini API key is not configured in the environment variables.")
        
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={config.GEMINI_API_KEY}"
    payload = {
        "contents": [
            {
                "parts": [
                    {"text": prompt}
                ]
            }
        ]
    }
    headers = {"Content-Type": "application/json"}
    
    try:
        response = requests.post(url, json=payload, headers=headers, timeout=15)
        response.raise_for_status()
        data = response.json()
        text = data["candidates"][0]["content"]["parts"][0]["text"]
        return text
    except Exception as e:
        print(f"Gemini API invocation error: {e}. Falling back to default heuristics.")
        raise e

@router.post("/resume-bullets")
def generate_resume_bullets(req: ResumeBulletRequest, current_user = Depends(get_current_user), db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")

    # If external LLM is enabled and key exists, try Gemini
    if config.ENABLE_EXTERNAL_LLM and config.GEMINI_API_KEY:
        prompt = f"""
        Given the candidate's experience text: "{req.resume_text}" 
        and the target job description: "{req.job_description}".
        Generate 3 highly tailored, metric-driven resume accomplishments bullet points that match the job requirements.
        Return ONLY the bullet points, one per line, prefixing with "- ".
        """
        try:
            res = call_gemini_api(prompt)
            bullets = [b.strip("- ").strip() for b in res.strip().split("\n") if b.strip()]
            return {"bullets": bullets[:3]}
        except Exception:
            pass

    # Heuristic Fallback
    # Extract some potential keywords from JD
    from backend.app.database import SkillsMaster
    skills = db.query(SkillsMaster).all()
    jd_skills = []
    jd_lower = req.job_description.lower()
    for s in skills:
        if s.skill_name.lower() in jd_lower:
            jd_skills.append(s.skill_name)
    if not jd_skills:
        jd_skills = ["Python", "SQL", "Git"]

    bullets = generate_heuristic_bullets(student.target_role, "Target Company", jd_skills)
    return {"bullets": bullets}

@router.post("/cover-letter")
def generate_cover_letter(req: DocumentRequest, current_user = Depends(get_current_user), db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")

    job = db.query(Job).filter(Job.id == req.job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    job_skills = [js.skill.skill_name for js in job.skills]

    content = ""
    if config.ENABLE_EXTERNAL_LLM and config.GEMINI_API_KEY:
        prompt = f"""
        Write a professional cover letter for {current_user.full_name}, who is a postgraduate student in the {student.program} program at REVA.
        The target job is {job.title} at {job.company}. The job description requires these key skills: {', '.join(job_skills)}.
        Make it clean, professional, and within 300 words.
        """
        try:
            content = call_gemini_api(prompt)
        except Exception:
            pass

    if not content:
        content = generate_heuristic_letter(current_user.full_name, student.program, job.title, job.company, job_skills)

    # Save to generated documents DB
    db.add(GeneratedDocument(
        student_id=student.id,
        job_id=job.id,
        type="cover_letter",
        content=content
    ))
    db.commit()

    return {"content": content}

@router.post("/recruiter-email")
def generate_recruiter_email(req: DocumentRequest, current_user = Depends(get_current_user), db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")

    job = db.query(Job).filter(Job.id == req.job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    job_skills = [js.skill.skill_name for js in job.skills]

    content = ""
    if config.ENABLE_EXTERNAL_LLM and config.GEMINI_API_KEY:
        prompt = f"""
        Write a professional outreach email to a recruiter for the {job.title} role at {job.company}.
        Candidate is {current_user.full_name}, a student at REVA. Mention key skills: {', '.join(job_skills[:3])}.
        Keep it brief and email-friendly. Include a Subject line.
        """
        try:
            content = call_gemini_api(prompt)
        except Exception:
            pass

    if not content:
        content = generate_heuristic_email(current_user.full_name, job.title, job.company, job_skills)

    db.add(GeneratedDocument(
        student_id=student.id,
        job_id=job.id,
        type="email",
        content=content
    ))
    db.commit()

    return {"content": content}

@router.post("/linkedin-message")
def generate_linkedin_message(req: DocumentRequest, current_user = Depends(get_current_user), db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")

    job = db.query(Job).filter(Job.id == req.job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    content = ""
    if config.ENABLE_EXTERNAL_LLM and config.GEMINI_API_KEY:
        prompt = f"""
        Write a short (under 300 characters) LinkedIn connection request message to a recruiter at {job.company} regarding the {job.title} role.
        Candidate is {current_user.full_name}, student at REVA. Keep it friendly and concise.
        """
        try:
            content = call_gemini_api(prompt)
        except Exception:
            pass

    if not content:
        content = generate_heuristic_linkedin(current_user.full_name, job.title, job.company)

    db.add(GeneratedDocument(
        student_id=student.id,
        job_id=job.id,
        type="linkedin",
        content=content
    ))
    db.commit()

    return {"content": content}

class ChatRequest(BaseModel):
    message: str
    history: Optional[list] = []

class KeyConfigureRequest(BaseModel):
    api_key: str

@router.post("/configure-key")
def configure_gemini_api_key(req: KeyConfigureRequest, current_user = Depends(get_current_user)):
    # Update config module properties in memory
    config.GEMINI_API_KEY = req.api_key
    config.ENABLE_EXTERNAL_LLM = True
    
    # Also update os.environ
    os.environ["GEMINI_API_KEY"] = req.api_key
    os.environ["ENABLE_EXTERNAL_LLM"] = "true"
    
    # Persist back to the .env file in the workspace root dynamically!
    try:
        env_path = ".env"
        # Try both common paths (from root run or backend run)
        if not os.path.exists(env_path):
            env_path = "../.env"
        
        if os.path.exists(env_path):
            with open(env_path, "r", encoding="utf-8") as f:
                lines = f.readlines()
            
            new_lines = []
            key_replaced = False
            llm_replaced = False
            
            for line in lines:
                if line.startswith("GEMINI_API_KEY="):
                    new_lines.append(f"GEMINI_API_KEY={req.api_key}\n")
                    key_replaced = True
                elif line.startswith("ENABLE_EXTERNAL_LLM="):
                    new_lines.append("ENABLE_EXTERNAL_LLM=true\n")
                    llm_replaced = True
                else:
                    new_lines.append(line)
            
            if not key_replaced:
                new_lines.append(f"GEMINI_API_KEY={req.api_key}\n")
            if not llm_replaced:
                new_lines.append("ENABLE_EXTERNAL_LLM=true\n")
                
            with open(env_path, "w", encoding="utf-8") as f:
                f.writelines(new_lines)
            
            print(f"🔒 Successfully updated API Key inside {env_path}")
    except Exception as e:
        print(f"⚠️ Failed to write Gemini API key to disk: {e}")
        
    return {"status": "success", "message": "Gemini API key updated successfully."}

@router.post("/chat")
def career_advisor_chat(req: ChatRequest, current_user = Depends(get_current_user), db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
        
    student_skills = [sk.skill.skill_name for sk in student.skills]
    
    # Compile System Context
    system_context = f"""
    You are the REVA RACE AI Career Advisor. You are helping {current_user.full_name}, a postgraduate student enrolled in the {student.program} track (Degree: {student.course}).
    Candidate's currently audited skills: {', '.join(student_skills)}.
    Candidate's target career role: {student.target_role}.
    
    Guidelines:
    1. Be highly supportive, professional, and concise (under 120 words).
    2. Suggest concrete technologies, upskilling modules, or resume improvements to bridge skill gaps.
    3. Refer to their course '{student.course}' when providing academic context.
    """
    
    # Assemble chat prompt with history
    prompt = f"{system_context}\n\nChat History:\n"
    for h in req.history or []:
        prompt += f"{h.get('sender', 'User')}: {h.get('text', '')}\n"
    prompt += f"User: {req.message}\nAdvisor:"
    
    reply = ""
    if config.ENABLE_EXTERNAL_LLM and config.GEMINI_API_KEY:
        try:
            reply = call_gemini_api(prompt)
        except Exception:
            pass
            
    if not reply:
        # Fallback Advisor heuristics
        msg_lower = req.message.lower()
        if "resume" in msg_lower or "cv" in msg_lower:
            reply = f"Hi {current_user.full_name}, based on your target role as an {student.target_role}, you should make sure your resume highlights practical hands-on experience in {', '.join(student_skills[:3])}. Make sure to align your project description bullets with metrics."
        elif "skill" in msg_lower or "gap" in msg_lower or "learn" in msg_lower:
            reply = f"To excel in the {student.program} track, focus on acquiring tools like {', '.join(student_skills[:2]) or 'Git, Python'} and cloud deployment patterns. Check the 'Learning Path' section in the sidebar for structured roadmaps."
        elif "jobs" in msg_lower or "hiring" in msg_lower or "apply" in msg_lower:
            reply = "I recommend checking your LinkedIn-style job feed on the home page. You have live, pre-matched vacancies for your track. Click 'Audit' on any job post to inspect specific missing technical criteria."
        else:
            reply = f"Hello {current_user.full_name}! As your REVA RACE Placement Advisor, I am here to help you match live jobs, optimize your resume, and upskill. Let me know if you have questions about target required skills or job interview prep!"
            
    return {"reply": reply}

class RefineDocumentRequest(BaseModel):
    document_type: str
    current_content: str
    instruction: str

@router.post("/refine")
def refine_generated_document(req: RefineDocumentRequest, current_user = Depends(get_current_user)):
    prompt = f"""
    You are an AI placement advisor for REVA RACE.
    The student has generated a {req.document_type} with the following content:
    ---
    {req.current_content}
    ---
    
    The student wants you to refine/modify this document based on the following instruction:
    "{req.instruction}"
    
    Guidelines:
    1. Apply the instruction precisely.
    2. Maintain professional business tone.
    3. Keep it clean and return ONLY the updated document content. Do not include extra conversational text outside the document.
    """
    
    reply = ""
    if config.ENABLE_EXTERNAL_LLM and config.GEMINI_API_KEY:
        try:
            reply = call_gemini_api(prompt)
        except Exception:
            pass
            
    if not reply:
        # Simple heuristic fallback
        reply = f"{req.current_content}\n\n[AI Refinement note: Applied modification instruction: '{req.instruction}']"
        
    return {"content": reply}

class CustomDocumentRequest(BaseModel):
    document_type: str
    company: str
    job_title: str
    job_description: str
    highlight_project: Optional[str] = None
    tone: Optional[str] = "Professional"

@router.post("/custom-document")
def generate_custom_document(req: CustomDocumentRequest, current_user = Depends(get_current_user), db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
        
    student_skills = [sk.skill.skill_name for sk in student.skills]
    
    highlight_str = f"highlighting the project: '{req.highlight_project}'" if req.highlight_project else ""
    
    prompt = ""
    if req.document_type == "cover-letter":
        prompt = f"""
        Write a professional Cover Letter for {current_user.full_name}, a student at REVA RACE in the {student.program} track.
        Target Role: {req.job_title} at {req.company}.
        Job Description: {req.job_description}
        Candidate audited skills: {', '.join(student_skills)}.
        {highlight_str}
        Use a {req.tone} tone. Keep it under 300 words.
        """
    elif req.document_type == "recruiter-email":
        prompt = f"""
        Write a brief Cold Outreach Recruiter Email for {current_user.full_name}, student at REVA RACE.
        Target Role: {req.job_title} at {req.company}.
        Job Description: {req.job_description}
        Include a subject line. Tone: {req.tone}.
        """
    elif req.document_type == "linkedin-message":
        prompt = f"""
        Write a short (under 300 characters) LinkedIn connect invite message to a recruiter at {req.company} regarding the {req.job_title} role.
        Candidate is {current_user.full_name}, student at REVA. Tone: {req.tone}.
        """
    elif req.document_type == "elevator-pitch":
        prompt = f"""
        Write a 60-second verbal Elevator Pitch introduction for an interview for the {req.job_title} role at {req.company}.
        Candidate details: {student.program} track at REVA, skills: {', '.join(student_skills[:4])}. Tone: {req.tone}.
        """
    else: # qa-prep
        prompt = f"""
        Generate 3 technical/behavioral interview preparation questions for the {req.job_title} role at {req.company} based on this JD: {req.job_description}.
        Provide detailed answers customized to the student's background (Skills: {', '.join(student_skills)}).
        Format clearly with Question and Answer blocks. Tone: {req.tone}.
        """
        
    content = ""
    if config.ENABLE_EXTERNAL_LLM and config.GEMINI_API_KEY:
        try:
            content = call_gemini_api(prompt)
        except Exception:
            pass
            
    if not content:
        # Fallback Heuristics
        if req.document_type == "cover-letter":
            content = f"Dear Hiring Manager,\n\nI am writing to express my interest in the {req.job_title} position at {req.company}. As a student in the {student.program} track at REVA Academy for Corporate Excellence, I have built skills in {', '.join(student_skills[:3])}."
        elif req.document_type == "linkedin-message":
            content = f"Hi, I'm {current_user.full_name}, a {student.program} student at REVA. I'd love to connect regarding the {req.job_title} role at {req.company}!"
        elif req.document_type == "elevator-pitch":
            content = f"Hi, I am {current_user.full_name}. I am a postgraduate candidate in {student.program} at REVA. I specialize in {', '.join(student_skills[:2])}."
        elif req.document_type == "recruiter-email":
            content = f"Subject: Inquiry: {req.job_title} - {current_user.full_name}\n\nDear Recruiter,\n\nI hope this email finds you well. I am a postgraduate student at REVA specializing in {student.program}."
        else:
            content = f"Q1: What projects have you completed in {student.program}?\n\nA1: I developed multiple engineering systems using {', '.join(student_skills[:3])}."
            
    return {"content": content}
