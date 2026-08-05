from pydantic import BaseModel
from typing import Optional, List, Dict

class StudentProfile(BaseModel):
    program: str
    target_role: str
    experience_years: float
    preferred_locations: Optional[str] = None
    cohort: Optional[str] = None
    enrollment_id: Optional[str] = None
    srn: Optional[str] = None
    dob: Optional[str] = None
    course: Optional[str] = None
    year: Optional[int] = None
    college_email: Optional[str] = None
    study_mode: Optional[str] = "Full-Time"

class StudentProfileResponse(BaseModel):
    id: int
    user_id: int
    program: str
    target_role: str
    experience_years: float
    preferred_locations: Optional[str] = None
    cohort: Optional[str] = None
    enrollment_id: Optional[str] = None
    srn: Optional[str] = None
    dob: Optional[str] = None
    course: Optional[str] = None
    year: Optional[int] = None
    college_email: Optional[str] = None
    study_mode: Optional[str] = None

    class Config:
        from_attributes = True

class ApplicationSummary(BaseModel):
    id: int
    job_title: str
    company: str
    status: str
    updated_at: str

class MissingSkillSummary(BaseModel):
    skill: str
    priority: str
    demand_weight: float

class StudentDashboardResponse(BaseModel):
    readiness_score: float
    resume_score: float
    jobs_matched_count: int
    applications_count: int
    missing_skills: List[MissingSkillSummary]
    recent_applications: List[ApplicationSummary]
    applications_by_status: Dict[str, int]
