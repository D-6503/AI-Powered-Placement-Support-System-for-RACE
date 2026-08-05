import os
from dotenv import load_dotenv

load_dotenv()

# App settings
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STORAGE_DIR = os.path.join(BASE_DIR, "storage")
RESUMES_DIR = os.path.join(STORAGE_DIR, "resumes")
JOBS_DIR = os.path.join(STORAGE_DIR, "jobs")
FAISS_DIR = os.path.join(STORAGE_DIR, "faiss_index")

# Ensure storage directories exist
os.makedirs(RESUMES_DIR, exist_ok=True)
os.makedirs(JOBS_DIR, exist_ok=True)
os.makedirs(FAISS_DIR, exist_ok=True)

# Database
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./race_placement.db")

# JWT security
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))

# AI Models
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2")
ENABLE_EXTERNAL_LLM = os.getenv("ENABLE_EXTERNAL_LLM", "false").lower() == "true"
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

# External Ingestion
ADZUNA_APP_ID = os.getenv("ADZUNA_APP_ID", "")
ADZUNA_APP_KEY = os.getenv("ADZUNA_APP_KEY", "")

# Role categories and programs mapping
ROLE_CATEGORIES = {
    "AI & Analytics": [
        "Data Analyst",
        "Data Scientist",
        "AI Engineer",
        "ML Engineer",
        "GenAI Engineer",
        "Data Engineer",
        "BI Developer"
    ],
    "Cybersecurity": [
        "Cybersecurity Analyst",
        "SOC Analyst",
        "Security Engineer",
        "Vulnerability Analyst",
        "IAM Analyst",
        "GRC Analyst"
    ],
    "Cloud Architecture": [
        "Cloud Engineer",
        "DevOps Engineer",
        "AWS Cloud Engineer",
        "Azure Cloud Engineer",
        "Site Reliability Engineer",
        "Junior Solution Architect"
    ]
}
