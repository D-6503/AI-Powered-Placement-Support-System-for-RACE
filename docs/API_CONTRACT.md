# API Contract

This document outlines the API specifications for the **AI-Powered Placement Intelligence System for REVA**. All API endpoints are prefixed with `/api/v1` (where applicable) or direct root paths.

---

## Authentication (`/auth`)

### 1. Register User
* **Method**: `POST`
* **Path**: `/auth/register`
* **Request Body**:
  ```json
  {
    "email": "student@reva.edu.in",
    "password": "strongpassword123",
    "full_name": "John Doe",
    "role": "student"
  }
  ```
* **Response (201 Created)**:
  ```json
  {
    "id": 1,
    "email": "student@reva.edu.in",
    "full_name": "John Doe",
    "role": "student",
    "is_active": true
  }
  ```

### 2. Login User
* **Method**: `POST`
* **Path**: `/auth/login`
* **Request Body (Form Data)**:
  - `username`: Email address
  - `password`: Password
* **Response (200 OK)**:
  ```json
  {
    "access_token": "jwt_token_string",
    "token_type": "bearer",
    "role": "student"
  }
  ```

### 3. Get Current User
* **Method**: `GET`
* **Path**: `/auth/me`
* **Headers**: `Authorization: Bearer <token>`
* **Response (200 OK)**:
  ```json
  {
    "id": 1,
    "email": "student@reva.edu.in",
    "full_name": "John Doe",
    "role": "student"
  }
  ```

---

## Student Profiles (`/students`)

### 1. Create/Update Profile
* **Method**: `POST` / `PUT`
* **Path**: `/students/profile`
* **Request Body**:
  ```json
  {
    "program": "AI & Analytics",
    "target_role": "AI Engineer",
    "experience_years": 2,
    "preferred_locations": "Singapore",
    "cohort": "Batch 2026"
  }
  ```
* **Response (200 OK)**:
  ```json
  {
    "id": 1,
    "program": "AI & Analytics",
    "target_role": "AI Engineer",
    "experience_years": 2,
    "preferred_locations": "Singapore",
    "cohort": "Batch 2026"
  }
  ```

---

## Resume Management (`/resumes`)

### 1. Upload Resume
* **Method**: `POST`
* **Path**: `/resumes/upload`
* **Request Body (Multipart Form)**:
  - `file`: Resume PDF/DOCX binary file
* **Response (200 OK)**:
  ```json
  {
    "resume_id": 1,
    "parsed_status": "success",
    "quality_score": 75,
    "message": "Resume uploaded and parsed successfully"
  }
  ```

### 2. View Parsed Sections
* **Method**: `GET`
* **Path**: `/resumes/{resume_id}/parsed`
* **Response (200 OK)**:
  ```json
  {
    "resume_id": 1,
    "sections": {
      "contact_info": {
        "email": "john.doe@gmail.com",
        "phone": "+65 9123 4567"
      },
      "skills": ["Python", "SQL", "Machine Learning"],
      "experience": ["Worked as Data Analyst at TechCorp..."],
      "projects": ["Built resume placement system..."],
      "education": ["Postgraduate in AI & Analytics at REVA..."]
    }
  }
  ```

---

## Jobs Management (`/jobs`)

### 1. Ingest Job CSV (Admin)
* **Method**: `POST`
* **Path**: `/jobs/upload-csv`
* **Request Body (Multipart Form)**:
  - `file`: CSV file containing columns: `title`, `company`, `jd_text`, `required_skills`, `preferred_skills`, `experience_required`, `location`, `salary_min`, `salary_max`, `apply_url`
* **Response (200 OK)**:
  ```json
  {
    "status": "success",
    "jobs_imported": 25
  }
  ```

### 2. Crawl Job URL
* **Method**: `POST`
* **Path**: `/jobs/import-url`
* **Request Body**:
  ```json
  {
    "url": "https://careers.company.com/job/123"
  }
  ```
* **Response (200 OK)**:
  ```json
  {
    "job_id": 10,
    "title": "Cloud Architect",
    "company": "Amazon AWS",
    "location": "Singapore"
  }
  ```

---

## Job Matching & Skill Gap (`/matching`, `/skill-gap`)

### 1. Get Matching Recommended Jobs
* **Method**: `POST`
* **Path**: `/matching/recommend`
* **Response (200 OK)**:
  ```json
  [
    {
      "job_id": 5,
      "title": "Machine Learning Engineer",
      "company": "Shopee",
      "location": "Singapore",
      "final_score": 84.5,
      "scores": {
        "semantic_similarity": 82.0,
        "required_skill_coverage": 90.0,
        "demand_aware_score": 88.0,
        "evidence_quality": 75.0,
        "experience_fit": 100.0,
        "location_fit": 100.0
      },
      "matched_skills": ["Python", "SQL", "TensorFlow"],
      "missing_skills": ["Git & Version Control", "Kubernetes", "AWS"]
    }
  ]
  ```

### 2. Get Skill Gap & Learning Path
* **Method**: `GET`
* **Path**: `/skill-gap/student/{student_id}`
* **Response (200 OK)**:
  ```json
  {
    "student_id": 1,
    "missing_skills": [
      {
        "skill": "Git & Version Control",
        "priority": "High",
        "demand_weight": 0.85,
        "learning_path": [
          "1. Learn containerization fundamentals",
          "2. Write a custom Git & Version Controlfile for a FastAPI application",
          "3. Build and run git & version control image locally",
          "4. Deploy containerized service to AWS ECS"
        ]
      }
    ]
  }
  ```

---

## Document Generation (`/generation`)

### 1. Tailored Resume Bullets
* **Method**: `POST`
* **Path**: `/generation/resume-bullets`
* **Request Body**:
  ```json
  {
    "resume_text": "Experienced in building basic web applications.",
    "job_description": "We are seeking a Python engineer experienced in FastAPI, scikit-learn, and vector search databases."
  }
  ```
* **Response (200 OK)**:
  ```json
  {
    "bullets": [
      "Engineered high-performance REST APIs using FastAPI, reducing response latency by 20%.",
      "Developed and deployed scikit-learn machine learning models, integrating semantic vector search for resume matching."
    ]
  }
  ```

---

## Admin Analytics (`/analytics`)

### 1. Overview Metrics
* **Method**: `GET`
* **Path**: `/analytics/admin/overview`
* **Response (200 OK)**:
  ```json
  {
    "total_students": 120,
    "placement_ready_count": 85,
    "active_jobs_count": 45,
    "applications_submitted": 210,
    "funnel": {
      "Saved": 60,
      "Applied": 100,
      "Shortlisted": 30,
      "Interview": 15,
      "Selected": 5
    }
  }
  ```

### 2. Missing Skills Heatmap
* **Method**: `GET`
* **Path**: `/analytics/admin/skill-heatmap`
* **Response (200 OK)**:
  ```json
  {
    "programs": ["AI & Analytics", "Cybersecurity", "Cloud Architecture"],
    "skills": ["Git & Version Control", "Kubernetes", "AWS", "TensorFlow", "Splunk", "Terraform"],
    "matrix": [
      [25, 10, 15, 5, 0, 5],
      [15, 5, 20, 0, 30, 10],
      [30, 45, 50, 0, 0, 40]
    ]
  }
  ```
