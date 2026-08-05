from pydantic import BaseModel, HttpUrl
from typing import Optional, List
from datetime import datetime

class JobResponse(BaseModel):
    id: int
    title: str
    company: str
    location: Optional[str] = None
    experience_required: float
    salary_min: Optional[float] = None
    salary_max: Optional[float] = None
    jd_text: str
    apply_url: Optional[str] = None
    source: str
    is_active: bool
    posted_date: Optional[datetime] = None
    employer_logo: Optional[str] = None

    class Config:
        from_attributes = True

class JobImportURLRequest(BaseModel):
    url: str

class JobUploadCSVResponse(BaseModel):
    status: str
    jobs_imported: int
    message: str

class JobCreate(BaseModel):
    title: str
    company: str
    location: Optional[str] = "Remote"
    experience_required: float = 0.0
    salary_min: Optional[float] = None
    salary_max: Optional[float] = None
    jd_text: str
    apply_url: Optional[str] = None
    skills: Optional[List[str]] = []
