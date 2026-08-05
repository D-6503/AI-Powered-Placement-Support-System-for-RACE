import os
# Force HuggingFace / Transformers to run in offline mode to prevent blocking requests
os.environ["HF_HUB_OFFLINE"] = "1"
os.environ["TRANSFORMERS_OFFLINE"] = "1"

import json
import numpy as np
import pandas as pd
from typing import List, Dict, Any, Tuple
from sqlalchemy.orm import Session
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity


def _infer_platform(apply_url: str, source: str) -> str:
    """Infer the job platform from the apply URL or source tag."""
    url_lower = (apply_url or "").lower()
    source_lower = (source or "").lower()
    if "greenhouse.io" in url_lower or source_lower == "greenhouse":
        return "Greenhouse ATS"
    if "lever.co" in url_lower or source_lower == "lever":
        return "Lever ATS"
    if "smartrecruiters.com" in url_lower or source_lower == "smartrecruiters":
        return "SmartRecruiters ATS"
    if "adzuna" in url_lower or source_lower == "adzuna":
        return "Adzuna"
    if "linkedin.com" in url_lower or source_lower in ("linkedin", "linkedin_jobs"):
        return "LinkedIn"
    if "naukri.com" in url_lower or source_lower in ("naukri",):
        return "Naukri"
    if "indeed.com" in url_lower:
        return "Indeed"
    if "glassdoor" in url_lower:
        return "Glassdoor"
    if "instahyre.com" in url_lower:
        return "Instahyre"
    if "foundit.in" in url_lower or "monster.com" in url_lower:
        return "Foundit"
    if "remotive.com" in url_lower or source_lower == "remotive":
        return "Remotive"
    if "amazon.jobs" in url_lower or "amazon.com/jobs" in url_lower:
        return "Amazon"
    if "careers.google.com" in url_lower or "google.com/about/careers" in url_lower:
        return "Google Careers"
    if "careers.microsoft.com" in url_lower:
        return "Microsoft"
    if "careers.wipro.com" in url_lower:
        return "Wipro Careers"
    if "career.infosys.com" in url_lower:
        return "Infosys Careers"
    if "tcs.com/careers" in url_lower or "nextstep.tcs.com" in url_lower:
        return "TCS NextStep"
    if "careers.cognizant.com" in url_lower:
        return "Cognizant"
    if "ibm.com/careers" in url_lower:
        return "IBM Careers"
    if source_lower in ("upload", "manual"):
        return "Direct Apply"
    return "Direct Apply"



# Lazy loader for SentenceTransformer and FAISS
_model = None
_faiss_index = None
_job_embeddings_cache = {}

def get_embedding_model():
    global _model
    if _model is None:
        try:
            from sentence_transformers import SentenceTransformer
            from backend.app.config import EMBEDDING_MODEL
            # Loads and caches the model locally
            _model = SentenceTransformer(EMBEDDING_MODEL)
        except Exception as e:
            print(f"Error loading embedding model: {e}. Falling back to TF-IDF matching.")
    return _model

def get_job_embeddings_vector(text: str) -> List[float]:
    model = get_embedding_model()
    if model is not None:
        emb = model.encode(text)
        return emb.tolist()
    # Fallback to zero vector if model load failed
    return [0.0] * 384

# 1. Keyword overlap score
def keyword_overlap_score(resume_skills: List[str], jd_skills: List[str]) -> float:
    if not jd_skills:
        return 100.0
    r_skills_set = set(s.lower() for s in resume_skills)
    jd_skills_set = set(s.lower() for s in jd_skills)
    overlap = r_skills_set.intersection(jd_skills_set)
    return (len(overlap) / len(jd_skills_set)) * 100.0

# 2. TF-IDF + Cosine score
def tfidf_cosine_score(resume_text: str, jd_text: str) -> float:
    if not resume_text.strip() or not jd_text.strip():
        return 0.0
    try:
        vectorizer = TfidfVectorizer()
        tfidf = vectorizer.fit_transform([resume_text, jd_text])
        sim = cosine_similarity(tfidf[0:1], tfidf[1:2])[0][0]
        return float(sim * 100.0)
    except Exception:
        return 0.0

# 3. Sentence-BERT Semantic similarity score
def semantic_similarity_score(resume_text: str, jd_text: str) -> float:
    model = get_embedding_model()
    if model is None:
        # Fallback to TF-IDF if S-BERT is unavailable
        return tfidf_cosine_score(resume_text, jd_text)
    
    try:
        emb1 = model.encode(resume_text)
        emb2 = model.encode(jd_text)
        sim = np.dot(emb1, emb2) / (np.linalg.norm(emb1) * np.linalg.norm(emb2))
        # Map similarity from [-1, 1] to [0, 1] then [0, 100]
        score = float((sim + 1) / 2 * 100.0)
        return round(score, 1)
    except Exception:
        return tfidf_cosine_score(resume_text, jd_text)

# 4. Required skill coverage
def required_skill_coverage(resume_skills: List[str], required_skills: List[str]) -> float:
    if not required_skills:
        return 100.0
    r_set = set(s.lower() for s in resume_skills)
    req_set = set(s.lower() for s in required_skills)
    matched = r_set.intersection(req_set)
    return (len(matched) / len(req_set)) * 100.0

# 5. Demand-aware skill score
def demand_aware_skill_score(student_skills: List[str], jd_skills: List[str], demand_weights: Dict[str, float]) -> float:
    if not jd_skills:
        return 100.0
    
    s_set = set(s.lower() for s in student_skills)
    
    total_weight = 0.0
    matched_weight = 0.0
    
    for skill in jd_skills:
        skill_lower = skill.lower()
        # Default weight is 0.3 if not in snapshot
        weight = demand_weights.get(skill_lower, 0.3)
        total_weight += weight
        if skill_lower in s_set:
            matched_weight += weight
            
    if total_weight == 0.0:
        return 0.0
    return (matched_weight / total_weight) * 100.0

# 6. Evidence quality score
def evidence_quality_score(matched_skills: List[str], resume_projects: str, resume_experience: str) -> float:
    if not matched_skills:
        return 0.0
    
    evidence_text = (resume_projects + " " + resume_experience).lower()
    proven_count = 0
    
    for skill in matched_skills:
        import re
        skill_esc = re.escape(skill.lower())
        pattern = rf"\b{skill_esc}\b"
        if re.search(pattern, evidence_text):
            proven_count += 1
            
    return (proven_count / len(matched_skills)) * 100.0

# 7. Experience eligibility fit score
def eligibility_fit_score(student_exp: float, job_exp_required: float) -> float:
    if student_exp >= job_exp_required:
        return 100.0
    elif (job_exp_required - student_exp) <= 2.0:
        return 50.0  # partial credit for close experience
    return 0.0

# 8. Location match score
def location_freshness_score(student_preferred_location: str, job_location: str) -> float:
    if not student_preferred_location or not job_location:
        return 100.0
    
    pref = student_preferred_location.lower()
    job_loc = job_location.lower()
    
    if pref in job_loc or job_loc in pref or "any" in pref or "remote" in job_loc:
        return 100.0
    return 50.0

# 9. Final fit score formula
def calculate_final_fit_score(
    semantic_sim: float,
    skill_coverage: float,
    demand_score: float,
    evidence_score: float,
    experience_fit: float,
    location_fit: float
) -> float:
    final = (
        0.30 * semantic_sim +
        0.25 * skill_coverage +
        0.20 * demand_score +
        0.15 * evidence_score +
        0.05 * experience_fit +
        0.05 * location_fit
    )
    return round(final, 1)

def rebuild_faiss_index(db: Session):
    from backend.app.database import Job, JobEmbedding
    from backend.app.config import FAISS_DIR
    import faiss
    
    jobs = db.query(Job).filter(Job.is_active == True).all()
    if not jobs:
        print("No active jobs found to index.")
        return

    embeddings = []
    job_ids = []
    
    for job in jobs:
        vector = get_job_embeddings_vector(job.jd_text)
        embeddings.append(vector)
        job_ids.append(job.id)

        # Save to DB
        existing = db.query(JobEmbedding).filter(JobEmbedding.job_id == job.id).first()
        if existing:
            existing.embedding_vector = json.dumps(vector)
        else:
            db.add(JobEmbedding(job_id=job.id, embedding_vector=json.dumps(vector)))
    
    db.commit()

    # Build FAISS CPU Flat index
    dimension = len(embeddings[0])
    index = faiss.IndexFlatIP(dimension)  # Inner product for cosine similarity
    
    # Normalize vectors for cosine similarity
    np_vectors = np.array(embeddings).astype('float32')
    faiss.normalize_L2(np_vectors)
    
    index.add(np_vectors)
    
    # Save index file
    index_path = os.path.join(FAISS_DIR, "index.faiss")
    faiss.write_index(index, index_path)
    
    # Save mapping file
    mapping_path = os.path.join(FAISS_DIR, "mapping.json")
    with open(mapping_path, "w") as f:
        json.dump(job_ids, f)
        
    print(f"FAISS index rebuilt successfully with {len(job_ids)} jobs.")

def fetch_demand_weights(role_category: str, db: Session) -> Dict[str, float]:
    from backend.app.database import JobDemandSnapshot
    snapshots = db.query(JobDemandSnapshot).filter(JobDemandSnapshot.role_category == role_category).all()
    
    weights = {}
    for snap in snapshots:
        # Load skill name
        from backend.app.database import SkillsMaster
        skill = db.query(SkillsMaster).filter(SkillsMaster.id == snap.skill_id).first()
        if skill:
            weights[skill.skill_name.lower()] = snap.normalized_weight
            
    # Fallback weights if snapshot is empty: calculate dynamically
    if not weights:
        from backend.app.database import Job, JobSkill, SkillsMaster
        # Count skill occurrences in all active jobs of this role category
        jobs = db.query(Job).filter(Job.title.like(f"%{role_category}%")).all()
        if not jobs:
            jobs = db.query(Job).all()  # Fallback to all jobs if category-specific is empty
            
        counts = {}
        for j in jobs:
            for js in j.skills:
                s_name = js.skill.skill_name.lower()
                counts[s_name] = counts.get(s_name, 0) + 1
                
        max_count = max(counts.values()) if counts else 1
        for s_name, count in counts.items():
            weights[s_name] = count / max_count

    return weights

def query_top_jobs_for_student(student_id: int, db: Session, limit: int = 10) -> List[Dict[str, Any]]:
    from backend.app.database import Student, Resume, ParsedResumeSection, Job, FitScore
    
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        return []

    # Get active resume
    resume = db.query(Resume).filter(Resume.student_id == student_id).order_by(Resume.uploaded_at.desc()).first()

    # Get resume text & parsed sections
    if resume:
        sections = db.query(ParsedResumeSection).filter(ParsedResumeSection.resume_id == resume.id).all()
        sections_dict = {sec.section_name: sec.section_text for sec in sections}
        resume_text = " ".join(sections_dict.values())
        resume_projects = sections_dict.get("projects", "")
        resume_experience = sections_dict.get("experience", "")
    else:
        resume_text = ""
        resume_projects = ""
        resume_experience = ""
        
    resume_skills = [sk.skill.skill_name for sk in student.skills]

    # Retrieve all active jobs
    jobs = db.query(Job).filter(Job.is_active == True).all()
    if not jobs:
        return []

    # Fetch demand weights for student's target role category
    demand_weights = fetch_demand_weights(student.target_role, db)

    # Pre-calculate resume embedding once outside the loop
    model = get_embedding_model()
    resume_emb = None
    if resume and model is not None and resume_text.strip():
        try:
            resume_emb = model.encode(resume_text)
        except Exception as e:
            print(f"Error encoding resume in matching engine: {e}")

    recommendations = []
    
    for job in jobs:
        job_skills = [js.skill.skill_name for js in job.skills]
        job_req_skills = [js.skill.skill_name for js in job.skills if js.is_required]
        
        if not resume:
            # If student has no resume, matching score is zero
            sem_sim = 0.0
            req_cov = 0.0
            demand_score = 0.0
            evidence = 0.0
            exp_fit = 0.0
            loc_fit = 0.0
            final_score = 0.0
            matched_skills = []
        else:
            # Calculate semantic similarity using cached/pre-computed embeddings
            if resume_emb is not None and model is not None and job.jd_text.strip():
                try:
                    if job.id not in _job_embeddings_cache:
                        _job_embeddings_cache[job.id] = model.encode(job.jd_text)
                    job_emb = _job_embeddings_cache[job.id]
                    
                    # Compute cosine similarity
                    sim = np.dot(resume_emb, job_emb) / (np.linalg.norm(resume_emb) * np.linalg.norm(job_emb))
                    score = float((sim + 1) / 2 * 100.0)
                    sem_sim = round(score, 1)
                except Exception as e:
                    print(f"Error encoding job {job.id}: {e}")
                    sem_sim = tfidf_cosine_score(resume_text, job.jd_text)
            else:
                sem_sim = tfidf_cosine_score(resume_text, job.jd_text)

            req_cov = required_skill_coverage(resume_skills, job_req_skills)
            demand_score = demand_aware_skill_score(resume_skills, job_skills, demand_weights)
            
            # Matched skills
            matched_skills = list(set(resume_skills).intersection(set(job_skills)))
            evidence = evidence_quality_score(matched_skills, resume_projects, resume_experience)
            
            exp_fit = eligibility_fit_score(student.experience_years, job.experience_required)
            loc_fit = location_freshness_score(student.preferred_locations, job.location)
            
            final_score = calculate_final_fit_score(
                sem_sim, req_cov, demand_score, evidence, exp_fit, loc_fit
            )
        
        missing_skills = list(set(job_skills) - set(resume_skills))

        # Save score to DB
        existing = db.query(FitScore).filter(FitScore.student_id == student.id, FitScore.job_id == job.id).first()
        if existing:
            existing.final_score = final_score
            existing.semantic_similarity = sem_sim
            existing.required_skill_coverage = req_cov
            existing.demand_aware_score = demand_score
            existing.evidence_quality = evidence
            existing.experience_fit = exp_fit
            existing.location_fit = loc_fit
        else:
            db.add(FitScore(
                student_id=student.id,
                job_id=job.id,
                final_score=final_score,
                semantic_similarity=sem_sim,
                required_skill_coverage=req_cov,
                demand_aware_score=demand_score,
                evidence_quality=evidence,
                experience_fit=exp_fit,
                location_fit=loc_fit
            ))

        recommendations.append({
            "job_id": job.id,
            "title": job.title,
            "company": job.company,
            "location": job.location,
            "final_score": final_score,
            "scores": {
                "semantic_similarity": sem_sim,
                "required_skill_coverage": req_cov,
                "demand_aware_score": demand_score,
                "evidence_quality": evidence,
                "experience_fit": exp_fit,
                "location_fit": loc_fit
            },
            "matched_skills": matched_skills,
            "missing_skills": missing_skills,
            "apply_url": job.apply_url,
            "source": job.source,
            "platform": getattr(job, "platform", None) or _infer_platform(job.apply_url or "", job.source or ""),
            "posted_date": job.posted_date.isoformat() if job.posted_date else None,
            "salary_min": job.salary_min,
            "salary_max": job.salary_max,
            "experience_required": job.experience_required,
            "jd_text": job.jd_text,
            "employer_logo": getattr(job, "employer_logo", None)
        })

    db.commit()
    
    # Sort recommendations
    recommendations.sort(key=lambda x: x["final_score"], reverse=True)
    return recommendations[:limit]

def classify_fit_score(score: float) -> str:
    if score <= 40.0:
        return "Low Fit"
    elif score <= 70.0:
        return "Moderate Fit"
    elif score <= 85.0:
        return "Strong Fit"
    else:
        return "Excellent Fit"

def generate_recommendation_reason(label: str, score_breakdown: Dict[str, float], missing_skills: List[str]) -> str:
    if label == "Excellent Fit":
        return f"Excellent match showing {int(score_breakdown['required_skill_coverage'] * 100)}% required skill coverage and strong semantic alignment."
    elif label == "Strong Fit":
        return f"Strong match. Candidate meets most required skills but is missing high-priority toolsets like: {', '.join(missing_skills[:3])}."
    elif label == "Moderate Fit":
        return f"Moderate match. Significant skill gaps exist. Upskilling recommended for: {', '.join(missing_skills[:3])}."
    else:
        return "Low match. Candidate profile lacks alignment with target job posting."

def get_complete_matching_report(student_id: int, job_id: int, db: Session) -> Dict[str, Any]:
    from backend.app.database import Student, Resume, ParsedResumeSection, Job, FitScore
    
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        return {}
        
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        return {}

    # Get active resume
    resume = db.query(Resume).filter(Resume.student_id == student_id).order_by(Resume.uploaded_at.desc()).first()
    if not resume:
        return {}

    # Get resume text & parsed sections
    sections = db.query(ParsedResumeSection).filter(ParsedResumeSection.resume_id == resume.id).all()
    sections_dict = {sec.section_name: sec.section_text for sec in sections}
    
    resume_text = " ".join(sections_dict.values())
    resume_skills = [sk.skill.skill_name for sk in student.skills]
    resume_projects = sections_dict.get("projects", "")
    resume_experience = sections_dict.get("experience", "")

    # Retrieve job skills
    job_skills = [js.skill.skill_name for js in job.skills]
    job_req_skills = [js.skill.skill_name for js in job.skills if js.is_required]

    # Fetch demand weights
    demand_weights = fetch_demand_weights(student.target_role, db)

    # Calculate sub-scores
    sem_sim = semantic_similarity_score(resume_text, job.jd_text)
    req_cov = required_skill_coverage(resume_skills, job_req_skills)
    demand_score = demand_aware_skill_score(resume_skills, job_skills, demand_weights)
    
    matched_skills = list(set(resume_skills).intersection(set(job_skills)))
    evidence = evidence_quality_score(matched_skills, resume_projects, resume_experience)
    
    exp_fit = eligibility_fit_score(student.experience_years, job.experience_required)
    loc_fit = location_freshness_score(student.preferred_locations, job.location)
    
    final_score = calculate_final_fit_score(
        sem_sim, req_cov, demand_score, evidence, exp_fit, loc_fit
    )

    missing_skills = list(set(job_skills) - set(resume_skills))
    
    high_priority_missing = []
    for skill in missing_skills:
        if demand_weights.get(skill.lower(), 0.3) > 0.5:
            high_priority_missing.append(skill)

    breakdown = {
        "semantic_similarity": round(sem_sim / 100.0, 2),
        "required_skill_coverage": round(req_cov / 100.0, 2),
        "demand_aware_skill_score": round(demand_score / 100.0, 2),
        "evidence_quality": round(evidence / 100.0, 2),
        "eligibility_fit": round(exp_fit / 100.0, 2),
        "location_freshness_fit": round(loc_fit / 100.0, 2)
    }

    fit_label = classify_fit_score(final_score)
    reason = generate_recommendation_reason(fit_label, breakdown, missing_skills)

    return {
        "final_fit_score": int(round(final_score)),
        "fit_label": fit_label,
        "score_breakdown": breakdown,
        "matched_skills": matched_skills,
        "missing_skills": missing_skills,
        "high_priority_missing_skills": high_priority_missing,
        "recommendation_reason": reason
    }
