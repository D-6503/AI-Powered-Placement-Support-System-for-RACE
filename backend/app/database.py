import os
import datetime
from sqlalchemy import create_engine, Column, Integer, String, Float, Boolean, DateTime, Date, ForeignKey, Text
from sqlalchemy.orm import declarative_base, sessionmaker, relationship
from dotenv import load_dotenv

load_dotenv()

# Database setup
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./race_placement.db")
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    phone_number = Column(String, nullable=True)
    hashed_password = Column(String, nullable=False)
    role = Column(String, nullable=False)  # 'student' or 'admin'
    full_name = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    student = relationship("Student", uselist=False, back_populates="user", cascade="all, delete-orphan")

class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    phone_number = Column(String, nullable=True)
    program = Column(String, nullable=False)  # 'AI & Analytics', 'Cybersecurity', 'Cloud Architecture'
    target_role = Column(String, nullable=False)
    experience_years = Column(Float, default=0.0)
    preferred_locations = Column(String, nullable=True)
    cohort = Column(String, nullable=True)
    enrollment_id = Column(String, unique=True, nullable=True)
    srn = Column(String, unique=True, nullable=True)
    dob = Column(String, nullable=True)
    course = Column(String, nullable=True)
    year = Column(Integer, nullable=True)
    college_email = Column(String, nullable=True)
    study_mode = Column(String, nullable=True, default="Full-Time")  # 'Full-Time', 'Part-Time'
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="student")
    resumes = relationship("Resume", back_populates="student", cascade="all, delete-orphan")
    skills = relationship("StudentSkill", back_populates="student", cascade="all, delete-orphan")
    projects = relationship("StudentProject", back_populates="student", cascade="all, delete-orphan")
    certifications = relationship("StudentCertification", back_populates="student", cascade="all, delete-orphan")
    fit_scores = relationship("FitScore", back_populates="student", cascade="all, delete-orphan")
    applications = relationship("Application", back_populates="student", cascade="all, delete-orphan")
    learning_paths = relationship("LearningPath", back_populates="student", cascade="all, delete-orphan")
    generated_documents = relationship("GeneratedDocument", back_populates="student", cascade="all, delete-orphan")
    evaluation_labels = relationship("EvaluationLabel", back_populates="student", cascade="all, delete-orphan")

class Resume(Base):
    __tablename__ = "resumes"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"))
    file_path = Column(String, nullable=False)
    file_hash = Column(String, nullable=False)
    uploaded_at = Column(DateTime, default=datetime.datetime.utcnow)
    quality_score = Column(Float, default=0.0)
    parsed_status = Column(String, default="pending")  # 'pending', 'success', 'failed'

    # Relationships
    student = relationship("Student", back_populates="resumes")
    sections = relationship("ParsedResumeSection", back_populates="resume", cascade="all, delete-orphan")

class ParsedResumeSection(Base):
    __tablename__ = "parsed_resume_sections"

    id = Column(Integer, primary_key=True, index=True)
    resume_id = Column(Integer, ForeignKey("resumes.id", ondelete="CASCADE"))
    section_name = Column(String, nullable=False)  # 'contact_info', 'skills', 'experience', 'projects', 'education'
    section_text = Column(Text, nullable=False)

    # Relationships
    resume = relationship("Resume", back_populates="sections")

class SkillsMaster(Base):
    __tablename__ = "skills_master"

    id = Column(Integer, primary_key=True, index=True)
    skill_name = Column(String, unique=True, index=True, nullable=False)
    category = Column(String, nullable=False)  # 'AI & Analytics', 'Cybersecurity', 'Cloud Architecture'
    alias_list = Column(Text, nullable=True)  # JSON-serialized list of aliases

    # Relationships
    student_skills = relationship("StudentSkill", back_populates="skill")
    job_skills = relationship("JobSkill", back_populates="skill")

class StudentSkill(Base):
    __tablename__ = "student_skills"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"))
    skill_id = Column(Integer, ForeignKey("skills_master.id", ondelete="CASCADE"))
    proficiency_level = Column(String, default="Intermediate")  # 'Beginner', 'Intermediate', 'Expert'
    source = Column(String, default="parsed")  # 'parsed' or 'manual'

    # Relationships
    student = relationship("Student", back_populates="skills")
    skill = relationship("SkillsMaster", back_populates="student_skills")

class StudentProject(Base):
    __tablename__ = "student_projects"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"))
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    skills_used = Column(String, nullable=True)  # Comma-separated list of skills used

    # Relationships
    student = relationship("Student", back_populates="projects")

class StudentCertification(Base):
    __tablename__ = "student_certifications"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"))
    name = Column(String, nullable=False)
    issuing_org = Column(String, nullable=False)
    issue_date = Column(Date, nullable=True)

    # Relationships
    student = relationship("Student", back_populates="certifications")

class Job(Base):
    __tablename__ = "jobs"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False, index=True)
    company = Column(String, nullable=False, index=True)
    location = Column(String, nullable=True)
    experience_required = Column(Float, default=0.0)
    salary_min = Column(Float, nullable=True)
    salary_max = Column(Float, nullable=True)
    jd_text = Column(Text, nullable=False)
    apply_url = Column(String, nullable=True)
    source = Column(String, default="upload")  # 'upload', 'url', 'adzuna', 'linkedin', 'remotive'
    posted_date = Column(DateTime, nullable=True)
    fetched_at = Column(DateTime, default=datetime.datetime.utcnow)
    is_active = Column(Boolean, default=True)
    employer_logo = Column(String, nullable=True)
    job_type = Column(String, default="Full-time")  # 'Full-time', 'Internship', 'Contract'

    # Relationships
    skills = relationship("JobSkill", back_populates="job", cascade="all, delete-orphan")
    embeddings = relationship("JobEmbedding", back_populates="job", cascade="all, delete-orphan")
    fit_scores = relationship("FitScore", back_populates="job", cascade="all, delete-orphan")
    applications = relationship("Application", back_populates="job", cascade="all, delete-orphan")
    recruiter_contacts = relationship("RecruiterContact", back_populates="job", cascade="all, delete-orphan")

class JobSkill(Base):
    __tablename__ = "job_skills"

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("jobs.id", ondelete="CASCADE"))
    skill_id = Column(Integer, ForeignKey("skills_master.id", ondelete="CASCADE"))
    is_required = Column(Boolean, default=True)  # True = Required, False = Preferred

    # Relationships
    job = relationship("Job", back_populates="skills")
    skill = relationship("SkillsMaster", back_populates="job_skills")

class JobEmbedding(Base):
    __tablename__ = "job_embeddings"

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("jobs.id", ondelete="CASCADE"), unique=True)
    embedding_vector = Column(Text, nullable=False)  # JSON-serialized list of floats

    # Relationships
    job = relationship("Job", back_populates="embeddings")

class FitScore(Base):
    __tablename__ = "fit_scores"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"))
    job_id = Column(Integer, ForeignKey("jobs.id", ondelete="CASCADE"))
    final_score = Column(Float, nullable=False)
    semantic_similarity = Column(Float, nullable=False)
    required_skill_coverage = Column(Float, nullable=False)
    demand_aware_score = Column(Float, nullable=False)
    evidence_quality = Column(Float, nullable=False)
    experience_fit = Column(Float, nullable=False)
    location_fit = Column(Float, nullable=False)
    matching_date = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    student = relationship("Student", back_populates="fit_scores")
    job = relationship("Job", back_populates="fit_scores")

class SkillGapReport(Base):
    __tablename__ = "skill_gap_reports"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), unique=True)
    missing_skills_json = Column(Text, nullable=False)  # JSON representation of missing skills and details
    generated_at = Column(DateTime, default=datetime.datetime.utcnow)

class Application(Base):
    __tablename__ = "applications"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"))
    job_id = Column(Integer, ForeignKey("jobs.id", ondelete="CASCADE"))
    status = Column(String, default="Saved")  # 'Saved', 'Applied', 'Shortlisted', 'Interview', 'Selected', 'Rejected'
    notes = Column(Text, nullable=True)
    follow_up_date = Column(Date, nullable=True)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Relationships
    student = relationship("Student", back_populates="applications")
    job = relationship("Job", back_populates="applications")

class RecruiterContact(Base):
    __tablename__ = "recruiter_contacts"

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("jobs.id", ondelete="CASCADE"))
    name = Column(String, nullable=False)
    email = Column(String, nullable=False)
    role = Column(String, nullable=True)
    notes = Column(Text, nullable=True)

    # Relationships
    job = relationship("Job", back_populates="recruiter_contacts")

class GeneratedDocument(Base):
    __tablename__ = "generated_documents"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"))
    job_id = Column(Integer, ForeignKey("jobs.id", ondelete="CASCADE"), nullable=True)
    type = Column(String, nullable=False)  # 'resume_bullet', 'cover_letter', 'email', 'linkedin'
    content = Column(Text, nullable=False)
    generated_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    student = relationship("Student", back_populates="generated_documents")

class EvaluationLabel(Base):
    __tablename__ = "evaluation_labels"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"))
    job_id = Column(Integer, ForeignKey("jobs.id", ondelete="CASCADE"))
    score_keyword = Column(Float, nullable=False)
    score_tfidf = Column(Float, nullable=False)
    score_sbert = Column(Float, nullable=False)
    score_demand_aware = Column(Float, nullable=False)
    student_rating = Column(Integer, nullable=True)  # 1-5 scale rating by student
    reviewer_rating = Column(Integer, nullable=True)  # 1-5 scale rating by placement officer/reviewer
    feedback_comments = Column(Text, nullable=True)

    # Relationships
    student = relationship("Student", back_populates="evaluation_labels")

class JobDemandSnapshot(Base):
    __tablename__ = "job_demand_snapshot"

    id = Column(Integer, primary_key=True, index=True)
    role_category = Column(String, nullable=False, index=True)  # e.g., 'Data Scientist', 'Security Engineer'
    skill_id = Column(Integer, ForeignKey("skills_master.id", ondelete="CASCADE"))
    demand_count = Column(Integer, default=0)
    normalized_weight = Column(Float, default=0.0)  # scale 0 to 1
    snapshot_date = Column(Date, default=datetime.date.today)

class LearningPath(Base):
    __tablename__ = "learning_paths"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"))
    skill_id = Column(Integer, ForeignKey("skills_master.id", ondelete="CASCADE"))
    steps_json = Column(Text, nullable=False)  # JSON-serialized steps
    estimated_hours = Column(Integer, default=10)
    difficulty = Column(String, default="Medium")
    current_step_index = Column(Integer, default=0)
    status = Column(String, default="Not Started")  # 'Not Started', 'In Progress', 'Completed'

    # Relationships
    student = relationship("Student", back_populates="learning_paths")
    skill = relationship("SkillsMaster")

class SimulatedEmail(Base):
    __tablename__ = "simulated_emails"
    
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"))
    recipient = Column(String, nullable=False)
    subject = Column(String, nullable=False)
    body = Column(Text, nullable=False)
    sent_at = Column(DateTime, default=datetime.datetime.utcnow)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    Base.metadata.create_all(bind=engine)
