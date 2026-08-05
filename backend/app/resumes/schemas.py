from pydantic import BaseModel
from typing import List, Dict, Any, Optional

class ResumeUploadResponse(BaseModel):
    resume_id: int
    parsed_status: str
    quality_score: float
    message: str

class ParsedSectionsResponse(BaseModel):
    resume_id: int
    sections: Dict[str, str]

class AuditCheckItem(BaseModel):
    section: str
    status: bool
    message: str

class ResumeAuditResponse(BaseModel):
    resume_id: int
    quality_score: float
    checks: List[AuditCheckItem]
    suggested_improvements: List[str]

class EducationItem(BaseModel):
    degree: str
    institution: str
    year: str
    gpa: Optional[str] = None

class ExperienceItem(BaseModel):
    role: str
    company: str
    duration: str
    description: str

class ProjectItem(BaseModel):
    title: str
    description: str
    tools: str

class CertificationItem(BaseModel):
    name: str
    organization: str
    year: str

class ResumeBuildRequest(BaseModel):
    summary: str
    phone: str
    education: List[EducationItem]
    experience: List[ExperienceItem]
    projects: List[ProjectItem]
    certifications: List[CertificationItem]
    skills: List[str]
